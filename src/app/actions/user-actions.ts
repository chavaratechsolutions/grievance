"use server";

import { adminAuth, adminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { Role } from "@/types";
import { requireAdmin } from "@/lib/server-auth";
import { assertRateLimit, getUserAgent, isSuspiciousBot } from "@/lib/rate-limit";
import { 
  isValidEmail, 
  isValidRole, 
  isValidString, 
  isValidRollNumber, 
  isValidUid 
} from "@/lib/validators";

export interface CreateUserInput {
  email: string;
  password?: string;
  displayName: string;
  role: Role;
  department: string;
  rollNumber?: string;
  idToken?: string;
}

/**
 * Server Action: Create single user account via Firebase Admin SDK.
 * Authenticated & authorized: Requires System Administrator role.
 * Rate-limited to 30 creations / min per admin to prevent quota exhaustion.
 */
export async function createUserAccount(input: CreateUserInput) {
  if (!isFirebaseAdminConfigured) {
    return {
      success: false,
      error: "Firebase Admin SDK is not configured. Please add FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL to .env.local",
    };
  }

  try {
    // 0. Bot protection check
    const userAgent = await getUserAgent();
    if (isSuspiciousBot(userAgent)) {
      return { success: false, error: "Automated requests are not permitted." };
    }

    // 1. Enforce Admin Authentication & Authorization
    const adminUser = await requireAdmin(input.idToken);

    // 2. Per-admin rate limiting (30 creations / minute)
    await assertRateLimit("create-user", { limit: 30, windowMs: 60 * 1000 }, adminUser.uid);

    const { email, displayName, role, department, rollNumber } = input;
    
    // Server-side input validation
    if (!isValidEmail(email)) {
      return { success: false, error: "Please provide a valid institutional email address." };
    }

    if (!isValidString(displayName, 2, 100)) {
      return { success: false, error: "User full name must be between 2 and 100 characters." };
    }

    if (!isValidRole(role)) {
      return { success: false, error: `Invalid role specified. Allowed roles: admin, principal, grievance_cell, student.` };
    }

    if (!isValidString(department, 2, 100)) {
      return { success: false, error: "Department must be between 2 and 100 characters." };
    }

    if (input.password && (typeof input.password !== "string" || input.password.trim().length < 6 || input.password.length > 128)) {
      return { success: false, error: "Custom password must be between 6 and 128 characters long." };
    }

    let temporaryPassword = input.password && input.password.trim().length >= 6
      ? input.password.trim()
      : "";

    if (!temporaryPassword) {
      if (role === "student") {
        if (!isValidRollNumber(rollNumber)) {
          return {
            success: false,
            error: "A valid Roll / Register Number (at least 6 characters, alphanumeric) is required for student accounts.",
          };
        }
        temporaryPassword = rollNumber.trim();
      } else {
        temporaryPassword = `Grievance@${Math.random().toString(36).slice(-6)}#`;
      }
    }

    // 1. Create User in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: email.trim().toLowerCase(),
      password: temporaryPassword,
      displayName: displayName.trim(),
      emailVerified: true,
      disabled: false,
    });

    // 2. Set Custom User Claims for zero-read RBAC in Security Rules
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role,
      department,
    });

    // 3. Write profile in Firestore users collection
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      role,
      department: department.trim(),
      rollNumber: rollNumber ? rollNumber.trim() : null,
      isDisabled: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/users");

    return {
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        temporaryPassword,
        displayName,
        role,
      },
    };
  } catch (error: any) {
    console.error("createUserAccount error:", error);
    return {
      success: false,
      error: error.message || "Failed to create user account.",
    };
  }
}

/**
 * Server Action: Bulk create student accounts from CSV.
 * Authenticated & authorized: Requires System Administrator role.
 * Rate-limited to 5 batch imports / 10 minutes per admin.
 * Maximum batch size strictly capped at 200 to prevent denial of service and quota burn.
 */
export async function bulkCreateStudents(
  students: Array<{
    email: string;
    displayName: string;
    department: string;
    rollNumber?: string;
    password?: string;
  }>,
  idToken?: string
) {
  if (!isFirebaseAdminConfigured) {
    return {
      success: false,
      error: "Firebase Admin SDK is not configured in .env.local.",
    };
  }

  try {
    // 0. Bot protection check
    const userAgent = await getUserAgent();
    if (isSuspiciousBot(userAgent)) {
      return { success: false, error: "Automated requests are not permitted." };
    }

    // 1. Enforce Admin Authentication & Authorization
    const adminUser = await requireAdmin(idToken);

    // 2. Strict Payload Bounds (max 200 per batch)
    if (!Array.isArray(students) || students.length === 0) {
      return { success: false, error: "No student records provided." };
    }
    if (students.length > 200) {
      return {
        success: false,
        error: "Bulk upload exceeds maximum limit of 200 students per batch. Please split into smaller files.",
      };
    }

    // 3. Per-admin rate limiting (5 bulk batches / 10 minutes)
    await assertRateLimit("bulk-create-students", { limit: 5, windowMs: 10 * 60 * 1000 }, adminUser.uid);
  } catch (authError: any) {
    return {
      success: false,
      error: authError.message || "Unauthorized: Administrator access required.",
    };
  }

  const results = {
    createdCount: 0,
    failedCount: 0,
    errors: [] as string[],
    createdAccounts: [] as Array<{ email: string; tempPass: string; rollNumber?: string }>,
  };

  for (const student of students) {
    try {
      if (!isValidEmail(student.email)) {
        results.failedCount++;
        results.errors.push(`Skipped row: Invalid email format (${student.email || "empty"})`);
        continue;
      }

      if (!isValidString(student.displayName, 2, 100)) {
        results.failedCount++;
        results.errors.push(`${student.email}: Name must be between 2 and 100 characters.`);
        continue;
      }

      const cleanRoll = student.rollNumber ? student.rollNumber.trim() : "";
      let tempPass = student.password && student.password.trim().length >= 6
        ? student.password.trim()
        : "";

      if (!tempPass) {
        if (!cleanRoll) {
          results.failedCount++;
          results.errors.push(`${student.email}: Missing Roll / Register Number (required to set initial password).`);
          continue;
        }
        if (!isValidRollNumber(cleanRoll)) {
          results.failedCount++;
          results.errors.push(`${student.email}: Roll Number "${cleanRoll}" must be at least 6 characters and contain only letters, numbers, and standard separators.`);
          continue;
        }
        tempPass = cleanRoll;
      }

      const cleanEmail = student.email.trim().toLowerCase();
      const cleanDept = student.department && isValidString(student.department, 1, 100)
        ? student.department.trim()
        : "General";

      const userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password: tempPass,
        displayName: student.displayName.trim(),
        emailVerified: true,
        disabled: false,
      });

      await adminAuth.setCustomUserClaims(userRecord.uid, {
        role: "student",
        department: student.department || "General",
      });

      await adminDb.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: cleanEmail,
        displayName: student.displayName.trim(),
        role: "student",
        department: student.department || "General",
        rollNumber: cleanRoll || null,
        isDisabled: false,
        createdAt: FieldValue.serverTimestamp(),
      });

      results.createdCount++;
      results.createdAccounts.push({
        email: cleanEmail,
        tempPass,
        rollNumber: cleanRoll || undefined,
      });
    } catch (err: any) {
      results.failedCount++;
      results.errors.push(`${student.email}: ${err.message}`);
    }
  }

  revalidatePath("/admin/users");
  return { success: true, data: results };
}

/**
 * Server Action: Toggle user disabled status
 * Authenticated & authorized: Requires System Administrator role.
 * Rate-limited to 30 toggles / minute per admin.
 * Prevents administrator self-lockout.
 */
export async function toggleUserStatus(uid: string, disable: boolean, idToken?: string) {
  if (!isFirebaseAdminConfigured) {
    return {
      success: false,
      error: "Firebase Admin SDK is not configured in .env.local.",
    };
  }

  try {
    // 0. Bot protection check
    const userAgent = await getUserAgent();
    if (isSuspiciousBot(userAgent)) {
      return { success: false, error: "Automated requests are not permitted." };
    }

    // 1. Enforce Admin Authentication & Authorization
    const adminUser = await requireAdmin(idToken);

    // 2. Input validation
    if (!isValidUid(uid)) {
      return { success: false, error: "Invalid user account identifier format." };
    }

    if (typeof disable !== "boolean") {
      return { success: false, error: "Invalid status parameter provided." };
    }

    // 3. Per-admin rate limiting (30 updates / minute)
    await assertRateLimit("toggle-user-status", { limit: 30, windowMs: 60 * 1000 }, adminUser.uid);

    if (adminUser.uid === uid && disable) {
      return {
        success: false,
        error: "Cannot disable your own administrator account.",
      };
    }

    // 1. Update Firebase Auth status
    await adminAuth.updateUser(uid, { disabled: disable });

    // 2. Update Firestore user doc
    await adminDb.collection("users").doc(uid).update({
      isDisabled: disable,
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
