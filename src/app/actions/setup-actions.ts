"use server";

import { adminAuth, adminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { assertRateLimit, getUserAgent, isSuspiciousBot } from "@/lib/rate-limit";
import { isValidEmail, isValidString } from "@/lib/validators";

// In-memory cache to eliminate repetitive Firestore reads once an admin is detected
let cachedAdminExists = false;

/**
 * Checks if at least one Administrator exists in the system.
 * Rate-limited to 30 requests / minute per client IP to prevent read quota exhaustion.
 */
export async function checkAdminExists(): Promise<boolean> {
  if (cachedAdminExists) {
    return true;
  }

  if (!isFirebaseAdminConfigured) {
    return false;
  }

  try {
    await assertRateLimit("check-admin-exists", {
      limit: 30,
      windowMs: 60 * 1000,
    });

    const snap = await adminDb.collection("users").where("role", "==", "admin").limit(1).get();
    const exists = !snap.empty;
    if (exists) {
      cachedAdminExists = true;
    }
    return exists;
  } catch (error) {
    console.warn("checkAdminExists notice/error:", error);
    // If rate-limited or error occurs, assume true if we previously saw true, else false
    return cachedAdminExists;
  }
}

/**
 * One-time setup: Create the primary Root Administrator for a fresh Firebase database.
 * Only allowed if no admin currently exists!
 * Guarded against bots and brute force (max 3 attempts per 15 minutes per IP).
 */
export async function initializeFirstAdmin(input: {
  email: string;
  password: string;
  displayName: string;
  department: string;
}) {
  if (!isFirebaseAdminConfigured) {
    return {
      success: false,
      error: "Firebase Admin SDK credentials missing in .env.local. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.",
    };
  }

  try {
    // 0. Bot protection check
    const userAgent = await getUserAgent();
    if (isSuspiciousBot(userAgent)) {
      return { success: false, error: "Automated requests are not permitted." };
    }

    // 1. Strict Rate Limit (3 attempts per 15 minutes per IP)
    await assertRateLimit("init-first-admin", {
      limit: 3,
      windowMs: 15 * 60 * 1000,
    });

    const hasAdmin = await checkAdminExists();
    if (hasAdmin) {
      return { success: false, error: "An administrator account already exists." };
    }

    const { email, password, displayName, department } = input;

    // Strict input validation
    if (!isValidEmail(email)) {
      return { success: false, error: "Please enter a valid administrator email address." };
    }

    if (!isValidString(displayName, 2, 100)) {
      return { success: false, error: "Administrator name must be between 2 and 100 characters." };
    }

    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return { success: false, error: "Administrator password must be at least 8 characters long." };
    }

    if (department && !isValidString(department, 2, 100)) {
      return { success: false, error: "Department name must be between 2 and 100 characters." };
    }

    // 1. Create User in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: displayName.trim(),
      emailVerified: true,
      disabled: false,
    });

    // 2. Set Admin Custom Claims
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: "admin",
      department: department || "College Administration",
    });

    // 3. Write User Profile in Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      role: "admin",
      department: department || "College Administration",
      isDisabled: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 4. Initialize System Settings document
    const settingsDoc = adminDb.collection("settings").doc("system");
    const settingsSnap = await settingsDoc.get();
    if (!settingsSnap.exists) {
      await settingsDoc.set({
        categories: [
          "Academic & Curriculum",
          "Examinations & Evaluation",
          "Hostel & Mess Facilities",
          "Campus Infrastructure & Labs",
          "Harassment & Discipline",
          "Library & Learning Resources",
          "Fee & Financial Aid",
          "Sports & Extra-Curricular",
          "General / Other",
        ],
        departments: [
          "Computer Science & Engineering",
          "Electronics & Communication",
          "Mechanical Engineering",
          "Civil Engineering",
          "Electrical Engineering",
          "Information Technology",
          "Administrative Office",
          "Accounts & Finance",
          "Hostel Administration",
        ],
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    cachedAdminExists = true;
    return { success: true };
  } catch (error: any) {
    console.error("initializeFirstAdmin error:", error);
    return { success: false, error: error.message || "Failed to initialize administrator account." };
  }
}
