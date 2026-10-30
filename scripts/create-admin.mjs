/**
 * College Grievance Redressal System - CLI Admin Provisioning Script
 * 
 * Usage:
 *   node scripts/create-admin.mjs <email> <password> <displayName> [department]
 * 
 * Example:
 *   node scripts/create-admin.mjs admin@college.edu MySecurePass123! "Alex (Administrator)" "Administration"
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// Load .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Error: Firebase Admin credentials not found in .env.local.");
  console.error("Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.");
  process.exit(1);
}

const app = !getApps().length
  ? initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    })
  : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);

const [,, email, password, displayName, department = "Administration"] = process.argv;

if (!email || !password || !displayName) {
  console.log(`
Usage:
  node scripts/create-admin.mjs <email> <password> <displayName> [department]

Example:
  node scripts/create-admin.mjs admin@college.edu AdminPassword123# "College Admin" "Executive Office"
`);
  process.exit(0);
}

async function run() {
  console.log(`\n⏳ Provisioning System Admin in Firebase...`);
  console.log(`Email: ${email}`);
  console.log(`Name:  ${displayName}`);

  try {
    // 1. Create or fetch auth user
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`ℹ️ User already exists in Firebase Auth (UID: ${userRecord.uid}). Updating claims...`);
    } catch {
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      console.log(`✓ Created user in Firebase Auth (UID: ${userRecord.uid})`);
    }

    // 2. Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role: "admin",
      department,
    });
    console.log(`✓ Set Custom Claim: { role: 'admin', department: '${department}' }`);

    // 3. Write Firestore user profile
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.toLowerCase(),
      displayName,
      role: "admin",
      department,
      isDisabled: false,
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`✓ Wrote Firestore profile in users/${userRecord.uid}`);

    // 4. Initialize system categories if missing
    const settingsDoc = db.collection("settings").doc("system");
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
          "Administrative Office",
          "Accounts & Finance",
          "Hostel Administration",
        ],
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`✓ Initialized default system categories in settings/system`);
    }

    console.log(`\n🎉 Success! You can now log into CampusResolve at http://localhost:3000/login with:`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Failed to provision admin:`, error);
    process.exit(1);
  }
}

run();
