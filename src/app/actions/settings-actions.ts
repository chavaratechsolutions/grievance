"use server";

import { adminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { revalidateTag } from "next/cache";
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from "@/types";
import { requireAdmin } from "@/lib/server-auth";
import { assertRateLimit, getUserAgent, isSuspiciousBot } from "@/lib/rate-limit";

/**
 * System Settings fetcher:
 * Queries Firestore settings/system document or safely falls back to standard institutional defaults.
 * Guarantees categories & departments are never blank, even if server credentials or Firestore are unseeded.
 */
export async function getCachedSystemSettings(): Promise<SystemSettings> {
  if (!isFirebaseAdminConfigured) {
    return DEFAULT_SYSTEM_SETTINGS;
  }

  try {
    const doc = await adminDb.collection("settings").doc("system").get();
    if (!doc.exists) {
      try {
        await adminDb.collection("settings").doc("system").set({
          ...DEFAULT_SYSTEM_SETTINGS,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } catch (seedErr) {
        console.warn("Could not seed default settings into Firestore:", seedErr);
      }
      return DEFAULT_SYSTEM_SETTINGS;
    }
    const data = doc.data() as Partial<SystemSettings>;
    return {
      categories: data?.categories && data.categories.length > 0 ? data.categories : DEFAULT_SYSTEM_SETTINGS.categories,
      departments: data?.departments && data.departments.length > 0 ? data.departments : DEFAULT_SYSTEM_SETTINGS.departments,
    };
  } catch (error) {
    console.warn("Could not read settings from Admin DB (falling back to defaults):", error);
    return DEFAULT_SYSTEM_SETTINGS;
  }
}

/**
 * Server Action: Update categories or departments and instantly revalidate cache tag.
 * Authenticated & authorized: Requires System Administrator role.
 * Rate-limited to 15 updates / minute per admin.
 */
export async function updateSystemSettings(
  newSettings: {
    categories?: string[];
    departments?: string[];
  },
  idToken?: string
) {
  try {
    // 0. Bot protection check
    const userAgent = await getUserAgent();
    if (isSuspiciousBot(userAgent)) {
      return { success: false, error: "Automated requests are not permitted." };
    }

    // 1. Enforce Admin Authentication & Authorization
    const adminUser = await requireAdmin(idToken);

    // 2. Per-admin rate limiting (15 updates / minute)
    await assertRateLimit("update-settings", { limit: 15, windowMs: 60 * 1000 }, adminUser.uid);

    const payload: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (newSettings.categories) {
      if (!Array.isArray(newSettings.categories) || newSettings.categories.length > 100) {
        return { success: false, error: "Categories list cannot exceed 100 items." };
      }
      payload.categories = Array.from(
        new Set(
          newSettings.categories
            .map((c) => (typeof c === "string" ? c.trim().slice(0, 100) : ""))
            .filter(Boolean)
        )
      );
    }
    if (newSettings.departments) {
      if (!Array.isArray(newSettings.departments) || newSettings.departments.length > 100) {
        return { success: false, error: "Departments list cannot exceed 100 items." };
      }
      payload.departments = Array.from(
        new Set(
          newSettings.departments
            .map((d) => (typeof d === "string" ? d.trim().slice(0, 100) : ""))
            .filter(Boolean)
        )
      );
    }

    await adminDb.collection("settings").doc("system").set(payload, { merge: true });

    // Instantly invalidate server cache tag so fresh settings are served on next request
    revalidateTag("system-settings", "max");

    return { success: true };
  } catch (error: any) {
    console.error("updateSystemSettings error:", error);
    return { success: false, error: error.message || "Failed to update settings" };
  }
}
