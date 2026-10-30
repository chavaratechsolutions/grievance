import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  getCountFromServer, 
  QueryDocumentSnapshot, 
  DocumentData 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase/client";
import { 
  Grievance, 
  TimelineEntry, 
  DashboardStats, 
  GrievanceStatus, 
  GrievancePriority 
} from "@/types";
import { 
  isValidString, 
  isValidStatus, 
  isValidPriority, 
  isValidUid, 
  validateFileUpload 
} from "@/lib/validators";

export const PAGE_SIZE = 10;

/**
 * 1. LOW-READ AGGREGATION QUERIES (Direct Firebase Connection)
 * Uses getCountFromServer to compute counts directly on the server without downloading documents.
 * 4 aggregation queries = only 4 read units total, even across 10,000+ complaints!
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const grievancesCol = collection(db, "grievances");

  const totalQ = grievancesCol;
  const pendingQ = query(grievancesCol, where("status", "==", "submitted"));
  const inProgressQ = query(
    grievancesCol, 
    where("status", "in", ["under_review", "investigating", "action_taken"])
  );
  const resolvedQ = query(grievancesCol, where("status", "==", "resolved"));

  const [totalSnap, pendingSnap, inProgressSnap, resolvedSnap] = await Promise.all([
    getCountFromServer(totalQ),
    getCountFromServer(pendingQ),
    getCountFromServer(inProgressQ),
    getCountFromServer(resolvedQ),
  ]);

  return {
    total: totalSnap.data().count,
    pending: pendingSnap.data().count,
    inProgress: inProgressSnap.data().count,
    resolved: resolvedSnap.data().count,
  };
}

/**
 * 2. CURSOR-BASED PAGINATION (Direct Firebase Connection)
 * Avoids reading unbounded lists. Fetches exactly `pageSize` records using startAfter().
 */
export interface PaginatedGrievancesOptions {
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null;
  status?: string;
  category?: string;
  studentUid?: string;
}

export async function getGrievancesPaginated(options: PaginatedGrievancesOptions = {}) {
  const {
    pageSize = PAGE_SIZE,
    lastDoc = null,
    status,
    category,
    studentUid,
  } = options;

  // Safe bounded page size (1 to 50) to prevent denial of service through huge reads
  const safePageSize = Math.min(Math.max(1, Number(pageSize) || PAGE_SIZE), 50);

  const grievancesCol = collection(db, "grievances");
  const constraints: any[] = [];

  if (studentUid && typeof studentUid === "string" && studentUid.trim()) {
    constraints.push(where("submittedByUid", "==", studentUid.trim()));
  }
  if (status && typeof status === "string" && status !== "all") {
    constraints.push(where("status", "==", status.trim()));
  }
  if (category && typeof category === "string" && category !== "all") {
    constraints.push(where("category", "==", category.trim()));
  }

  constraints.push(orderBy("createdAt", "desc"));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }
  constraints.push(limit(safePageSize));

  const q = query(grievancesCol, ...constraints);
  const snapshot = await getDocs(q);

  const grievances: Grievance[] = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Grievance[];

  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  const hasMore = snapshot.docs.length === safePageSize;

  return {
    grievances,
    lastDoc: newLastDoc,
    hasMore,
  };
}

/**
 * 3. SUB-COLLECTION READ (Timeline) (Direct Firebase Connection)
 * Read on-demand ONLY when user opens a specific complaint.
 * Bounded with limit(100) to prevent unbounded read operations.
 */
export async function getGrievanceTimeline(grievanceId: string): Promise<TimelineEntry[]> {
  if (!isValidUid(grievanceId)) {
    throw new Error("Invalid grievance identifier format.");
  }

  const timelineCol = collection(db, "grievances", grievanceId, "timeline");
  const q = query(timelineCol, orderBy("timestamp", "asc"), limit(100));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as TimelineEntry[];
}

/**
 * Upload evidence attachments directly to private Firebase Storage.
 * Strictly enforces file count, file sizes (max 10MB), and permitted MIME types (JPEG, PNG, WEBP, PDF).
 */
export async function uploadEvidenceFiles(
  grievanceId: string, 
  files: File[]
): Promise<string[]> {
  if (!isValidUid(grievanceId)) {
    throw new Error("Invalid grievance identifier.");
  }

  if (files.length > 5) {
    throw new Error("Maximum of 5 evidence attachments allowed per grievance.");
  }

  const downloadUrls: string[] = [];
  
  for (const file of files) {
    const check = validateFileUpload(file);
    if (!check.valid) {
      throw new Error(check.error || `File ${file.name} failed security validation.`);
    }

    const sanitizedName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fileRef = ref(storage, `grievance-evidence/${grievanceId}/${sanitizedName}`);
    
    // Upload with explicit content type metadata
    const uploadResult = await uploadBytes(fileRef, file, {
      contentType: file.type,
      customMetadata: {
        grievanceId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getDownloadURL(uploadResult.ref);
    downloadUrls.push(url);
  }

  return downloadUrls;
}

/**
 * Create a new Grievance directly in Firestore and Storage
 */
export async function submitGrievance(data: {
  title: string;
  category: string;
  department: string;
  description: string;
  priority: GrievancePriority;
  isAnonymous: boolean;
  submittedByUid: string;
  submitterName: string;
  submitterEmail: string;
  submitterDepartment: string;
  files?: File[];
}) {
  if (!auth.currentUser) {
    throw new Error("Unauthorized: You must be signed in to submit a grievance.");
  }
  if (auth.currentUser.uid !== data.submittedByUid) {
    throw new Error("Forbidden: You cannot submit a grievance on behalf of another user.");
  }

  // Strict input validation
  if (!isValidString(data.title, 3, 200)) {
    throw new Error("Grievance title must be between 3 and 200 characters.");
  }
  if (!isValidString(data.category, 2, 100)) {
    throw new Error("Please select a valid grievance category.");
  }
  if (!isValidString(data.department, 2, 100)) {
    throw new Error("Please select a valid department.");
  }
  if (!isValidString(data.description, 10, 5000)) {
    throw new Error("Grievance description must be between 10 and 5000 characters.");
  }
  if (!isValidPriority(data.priority)) {
    throw new Error("Invalid grievance priority level specified.");
  }

  const grievancesCol = collection(db, "grievances");
  const newDocRef = doc(grievancesCol);
  const grievanceId = newDocRef.id;

  let attachmentUrls: string[] = [];
  if (data.files && data.files.length > 0) {
    attachmentUrls = await uploadEvidenceFiles(grievanceId, data.files);
  }

  const grievancePayload = {
    title: data.title,
    category: data.category,
    department: data.department,
    description: data.description,
    status: "submitted" as GrievanceStatus,
    priority: data.priority,
    isAnonymous: data.isAnonymous,
    submittedByUid: data.submittedByUid,
    submitterName: data.isAnonymous ? "Anonymous Student" : data.submitterName,
    submitterEmail: data.isAnonymous ? null : data.submitterEmail,
    submitterDepartment: data.submitterDepartment,
    attachmentUrls,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newDocRef, grievancePayload);

  // Write initial step to sub-collection
  const timelineCol = collection(db, "grievances", grievanceId, "timeline");
  await addDoc(timelineCol, {
    stepNumber: 1,
    actionType: "created",
    statusFrom: "none",
    statusTo: "submitted",
    remarks: data.isAnonymous 
      ? "Grievance submitted under confidential student protection" 
      : "Grievance formally registered by student",
    performedBy: {
      uid: data.submittedByUid,
      name: data.isAnonymous ? "Anonymous Student" : data.submitterName,
      role: "student",
    },
    timestamp: serverTimestamp(),
  });

  return { success: true, grievanceId };
}

/**
 * Staff Action: Add "Next Step Taken" to timeline sub-collection & update status
 */
export async function addNextStepAction(data: {
  grievanceId: string;
  newStatus: GrievanceStatus;
  currentStatus: GrievanceStatus;
  remarks: string;
  performedBy: {
    uid: string;
    name: string;
    role: string;
  };
}) {
  if (!auth.currentUser) {
    throw new Error("Unauthorized: Authentication required.");
  }
  if (auth.currentUser.uid !== data.performedBy.uid) {
    throw new Error("Forbidden: Identity mismatch with authenticated session.");
  }

  const { grievanceId, newStatus, currentStatus, remarks, performedBy } = data;

  if (!isValidUid(grievanceId)) {
    throw new Error("Invalid grievance identifier format.");
  }
  if (!isValidStatus(newStatus) || !isValidStatus(currentStatus)) {
    throw new Error("Invalid grievance status transition.");
  }
  if (!isValidString(remarks, 3, 2000)) {
    throw new Error("Action remarks must be between 3 and 2000 characters.");
  }

  const timelineCol = collection(db, "grievances", grievanceId, "timeline");
  await addDoc(timelineCol, {
    actionType: "action_taken",
    statusFrom: currentStatus,
    statusTo: newStatus,
    remarks,
    performedBy,
    timestamp: serverTimestamp(),
  });

  const grievanceRef = doc(db, "grievances", grievanceId);
  await updateDoc(grievanceRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}

/**
 * Staff Action: Final Resolution ("Resolve & Close")
 */
export async function resolveGrievance(data: {
  grievanceId: string;
  currentStatus: GrievanceStatus;
  finalResolution: string;
  performedBy: {
    uid: string;
    name: string;
    role: string;
  };
}) {
  if (!auth.currentUser) {
    throw new Error("Unauthorized: Authentication required.");
  }
  if (auth.currentUser.uid !== data.performedBy.uid) {
    throw new Error("Forbidden: Identity mismatch with authenticated session.");
  }

  const { grievanceId, currentStatus, finalResolution, performedBy } = data;

  if (!isValidUid(grievanceId)) {
    throw new Error("Invalid grievance identifier format.");
  }
  if (!isValidStatus(currentStatus)) {
    throw new Error("Invalid current grievance status.");
  }
  if (!isValidString(finalResolution, 5, 3000)) {
    throw new Error("Resolution summary must be between 5 and 3000 characters.");
  }

  const timelineCol = collection(db, "grievances", grievanceId, "timeline");
  await addDoc(timelineCol, {
    actionType: "resolution",
    statusFrom: currentStatus,
    statusTo: "resolved",
    remarks: finalResolution,
    performedBy,
    timestamp: serverTimestamp(),
  });

  const grievanceRef = doc(db, "grievances", grievanceId);
  await updateDoc(grievanceRef, {
    status: "resolved",
    resolutionSummary: finalResolution,
    resolvedBy: performedBy,
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { success: true };
}
