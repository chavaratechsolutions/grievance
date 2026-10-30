"use server";

import { adminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { unstable_cache, revalidateTag } from "next/cache";
import { SystemSettings } from "@/types";
import { requireAdmin } from "@/lib/server-auth";
import { assertRateLimit, getUserAgent, isSuspiciousBot } from "@/lib/rate-limit";

const DEFAULT_SETTINGS: SystemSettings = {
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
};

/**
 * Low-Read Cache: Cached at the Next.js server layer with tag 'system-settings'.
 * Client navigations do NOT trigger repeated Firestore reads!
 */
export const getCachedSystemSettings = unstable_cache(
  async (): Promise<SystemSettings> => {
    if (!isFirebaseAdminConfigured) {
      return DEFAULT_SETTINGS;
    }

    try {
      const doc = await adminDb.collection("settings").doc("system").get();
      if (!doc.exists) {
        await adminDb.collection("settings").doc("system").set({
          ...DEFAULT_SETTINGS,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return DEFAULT_SETTINGS;
      }
      const data = doc.data() as SystemSettings;
      return {
        categories: data.categories || DEFAULT_SETTINGS.categories,
        departments: data.departments || DEFAULT_SETTINGS.departments,
      };
    } catch (error) {
      console.warn("Could not read settings from Admin DB (falling back to defaults):", error);
      return DEFAULT_SETTINGS;
    }
  },
  ["system-settings-key"],
  { revalidate: 3600, tags: ["system-settings"] }
);

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
