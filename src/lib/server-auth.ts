import { adminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { cookies, headers } from "next/headers";
import { Role } from "@/types";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role: Role;
  department?: string;
}

/**
 * Extracts and verifies the caller's Firebase ID token on the server.
 * Sources checked (in priority order):
 * 1. Explicit token argument passed directly by client action
 * 2. `__session` or `auth_token` HTTP cookie
 * 3. `Authorization: Bearer <token>` HTTP header
 */
export async function requireAuth(explicitToken?: string): Promise<AuthenticatedUser> {
  if (!isFirebaseAdminConfigured) {
    throw new Error("Firebase Admin SDK is not configured in .env.local.");
  }

  let token = explicitToken?.trim();

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("__session")?.value || cookieStore.get("auth_token")?.value;
    } catch {
      // Outside request context
    }
  }

  if (!token) {
    try {
      const headerList = await headers();
      const authHeader = headerList.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
      }
    } catch {
      // Outside request context
    }
  }

  if (!token) {
    throw new Error("Unauthorized: Authentication required. Please sign in.");
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: (decoded.role as Role) || "student",
      department: decoded.department as string | undefined,
    };
  } catch (error: any) {
    console.error("Token verification failed:", error?.message || error);
    throw new Error("Unauthorized: Invalid, expired, or revoked authentication session.");
  }
}

/**
 * Enforces that the caller has System Administrator privileges.
 */
export async function requireAdmin(explicitToken?: string): Promise<AuthenticatedUser> {
  const user = await requireAuth(explicitToken);
  if (user.role !== "admin") {
    throw new Error("Forbidden: System Administrator privileges required.");
  }
  return user;
}

/**
 * Enforces that the caller has staff or admin privileges (Admin, Principal, or Grievance Cell).
 */
export async function requireStaffOrAdmin(explicitToken?: string): Promise<AuthenticatedUser> {
  const user = await requireAuth(explicitToken);
  const staffRoles: Role[] = ["admin", "principal", "grievance_cell"];
  if (!staffRoles.includes(user.role)) {
    throw new Error("Forbidden: Staff or Administrator privileges required.");
  }
  return user;
}

