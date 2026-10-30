import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let adminApp: App;

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

const rawKey = process.env.FIREBASE_PRIVATE_KEY;
let privateKey: string | undefined;
if (rawKey) {
  let cleaned = rawKey.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  privateKey = cleaned.replace(/\\n/g, "\n");
}

export const isFirebaseAdminConfigured = Boolean(
  projectId && 
  clientEmail && 
  privateKey && 
  privateKey.includes("BEGIN PRIVATE KEY")
);

if (!getApps().length) {
  if (isFirebaseAdminConfigured) {
    adminApp = initializeApp({
      credential: cert({
        projectId: projectId!,
        clientEmail: clientEmail!,
        privateKey: privateKey!,
      }),
    });
  } else {
    // Dummy initialization for build / preview step
    adminApp = initializeApp({
      projectId: projectId || "college-grievance-app",
    });
  }
} else {
  adminApp = getApps()[0];
}

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
