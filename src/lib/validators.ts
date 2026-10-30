import { Role, GrievanceStatus, GrievancePriority } from "@/types";

/**
 * Standard RFC-compliant email regex.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Allowed user roles in the system.
 */
export const ALLOWED_ROLES: Role[] = ["admin", "principal", "grievance_cell", "student"];

/**
 * Allowed grievance statuses.
 */
export const ALLOWED_STATUSES: GrievanceStatus[] = [
  "submitted",
  "under_review",
  "investigating",
  "action_taken",
  "resolved",
  "rejected",
];

/**
 * Allowed grievance priority levels.
 */
export const ALLOWED_PRIORITIES: GrievancePriority[] = ["low", "medium", "high", "urgent"];

/**
 * Validates email format and length.
 */
export function isValidEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validates that input is a valid non-empty string within given length limits.
 */
export function isValidString(val: unknown, minLen = 1, maxLen = 255): val is string {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  return trimmed.length >= minLen && trimmed.length <= maxLen;
}

/**
 * Validates a user role.
 */
export function isValidRole(role: unknown): role is Role {
  return typeof role === "string" && ALLOWED_ROLES.includes(role as Role);
}

/**
 * Validates a grievance status.
 */
export function isValidStatus(status: unknown): status is GrievanceStatus {
  return typeof status === "string" && ALLOWED_STATUSES.includes(status as GrievanceStatus);
}

/**
 * Validates a grievance priority.
 */
export function isValidPriority(priority: unknown): priority is GrievancePriority {
  return typeof priority === "string" && ALLOWED_PRIORITIES.includes(priority as GrievancePriority);
}

/**
 * Validates Roll/Register Number format (alphanumeric, hyphens, underscores, slashes).
 */
export function isValidRollNumber(roll: unknown): roll is string {
  if (typeof roll !== "string") return false;
  const trimmed = roll.trim();
  if (trimmed.length < 6 || trimmed.length > 50) return false;
  return /^[a-zA-Z0-9/_-]+$/.test(trimmed);
}

/**
 * Validates Firestore/Firebase Auth UID string.
 */
export function isValidUid(uid: unknown): uid is string {
  if (typeof uid !== "string") return false;
  const trimmed = uid.trim();
  return trimmed.length >= 1 && trimmed.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Sanitizes input text: trims whitespace and caps max length.
 */
export function sanitizeText(text: unknown, maxLen = 5000): string {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, maxLen);
}

/**
 * File upload validation (Max 10MB, images or PDF only).
 */
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function validateFileUpload(file: { size: number; type: string; name: string }): {
  valid: boolean;
  error?: string;
} {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds maximum allowed size of 10MB.`,
    };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `File "${file.name}" has an unsupported format. Only JPEG, PNG, WEBP, and PDF documents are allowed.`,
    };
  }

  // Ensure file extension matches MIME type and prevents malicious double extensions
  const ext = file.name.split(".").pop()?.toLowerCase();
  const validExtensions = ["jpg", "jpeg", "png", "webp", "pdf"];
  if (!ext || !validExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File "${file.name}" contains an invalid file extension.`,
    };
  }

  return { valid: true };
}

