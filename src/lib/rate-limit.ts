export interface RateLimitConfig {
  limit: number;
  windowMs: number; // In milliseconds
}

export interface RateLimitRecord {
  timestamps: number[];
}

// In-memory sliding window store
const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of stale entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 3600000); // 1 hour
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Extracts client IP address from a header lookup object.
 * Compatible with NextRequest.headers, IncomingHttpHeaders, and Next.js headers().
 */
export function getClientIpFromHeaders(headerList: { get(key: string): string | null }): string {
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = headerList.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "127.0.0.1";
}

/**
 * Extracts client IP address securely from request headers in Server Components/Actions.
 * Uses dynamic import so that importing this module in Proxy/Middleware doesn't trigger static bundler restrictions.
 */
export async function getClientIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    return getClientIpFromHeaders(headerList);
  } catch {
    return "127.0.0.1";
  }
}

/**
 * Extracts User-Agent securely from request headers in Server Components/Actions.
 */
export async function getUserAgent(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const headerList = await headers();
    return headerList.get("user-agent") || "";
  } catch {
    return "";
  }
}

/**
 * Core sliding-window rate limit checker.
 * Returns { success: boolean, remaining: number, resetMs: number }
 */
export function checkRateLimitMemory(
  identifier: string,
  config: RateLimitConfig
): { success: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const record = rateLimitStore.get(identifier) || { timestamps: [] };
  // Filter out timestamps outside the active window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= config.limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetMs = Math.max(0, oldestTimestamp + config.windowMs - now);
    return {
      success: false,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  rateLimitStore.set(identifier, record);

  return {
    success: true,
    remaining: config.limit - record.timestamps.length,
    resetMs: config.windowMs,
  };
}

/**
 * Async rate limit guard for Server Actions.
 * Throws an error message if the limit is exceeded.
 */
export async function assertRateLimit(
  actionKey: string,
  config: RateLimitConfig,
  customIdentifier?: string
): Promise<void> {
  const ip = customIdentifier || (await getClientIp());
  const key = `${actionKey}:${ip}`;

  const { success, resetMs } = checkRateLimitMemory(key, config);

  if (!success) {
    const waitSeconds = Math.ceil(resetMs / 1000);
    throw new Error(
      `Rate limit exceeded for this operation. Please wait ${waitSeconds}s before retrying.`
    );
  }
}

/**
 * Known malicious or aggressive bot user-agent signatures.
 */
const KNOWN_BOT_PATTERNS = [
  /python-requests/i,
  /aiohttp/i,
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /zgrab/i,
  /go-http-client/i,
  /nmap/i,
  /curl\/\d/i,
  /wget\/\d/i,
  /libwww-perl/i,
  /apachebench/i,
  /scrapy/i,
  /headlesschrome/i,
  /phantomjs/i,
];

/**
 * Checks if a user-agent string matches known scraper/bot signatures.
 */
export function isSuspiciousBot(userAgent?: string | null): boolean {
  if (!userAgent || userAgent.trim() === "") {
    return true; // Reject requests with completely blank user-agents
  }
  return KNOWN_BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

