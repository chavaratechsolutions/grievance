import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimitMemory, getClientIpFromHeaders, isSuspiciousBot } from "@/lib/rate-limit";

/**
 * Next.js 16 Proxy (formerly Middleware)
 * Runs at the network boundary before any Route Handler or Server Action executes.
 *
 * Protection features:
 * 1. Bot & Scraper Detection: Blocks known malicious and scanner user-agents on POST / action requests.
 * 2. Direct API & Server Action Rate Limiting: Limits direct POST bursts per IP to prevent DOS.
 * 3. Protected endpoint abuse throttling.
 */
export function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent");
  const ip = getClientIpFromHeaders(request.headers);
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();

  // 1. Bot Protection on POST requests & sensitive endpoints (/admin, /setup)
  if (method === "POST" || pathname.startsWith("/admin") || pathname.startsWith("/setup")) {
    if (isSuspiciousBot(userAgent)) {
      return NextResponse.json(
        {
          error: "Access denied: automated requests and suspicious user-agents are restricted.",
        },
        { status: 403 }
      );
    }
  }

  // 2. Direct HTTP POST / Server Action Rate Limiting
  // Next.js Server Actions are invoked as POST requests carrying a Next-Action header.
  if (method === "POST") {
    const postLimit = checkRateLimitMemory(`proxy-post:${ip}`, {
      limit: 60,
      windowMs: 60 * 1000, // 60 POST requests per minute
    });

    if (!postLimit.success) {
      const waitSeconds = Math.ceil(postLimit.resetMs / 1000);
      return NextResponse.json(
        {
          error: `Too many requests. Please slow down and try again in ${waitSeconds}s.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": waitSeconds.toString(),
          },
        }
      );
    }
  }

  // 3. Rate limit access to /setup endpoint (public root setup check)
  if (pathname.startsWith("/setup")) {
    const setupLimit = checkRateLimitMemory(`proxy-setup:${ip}`, {
      limit: 30,
      windowMs: 60 * 1000,
    });

    if (!setupLimit.success) {
      const waitSeconds = Math.ceil(setupLimit.resetMs / 1000);
      return NextResponse.json(
        {
          error: `Setup rate limit reached. Please retry in ${waitSeconds}s.`,
        },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/media assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

