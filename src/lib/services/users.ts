import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  QueryDocumentSnapshot,
  DocumentData,
  getCountFromServer
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase/client";
import { UserProfile, Role } from "@/types";
import { isValidRole } from "@/lib/validators";

export interface PaginatedUsersOptions {
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null;
  roleFilter?: Role | "all";
}

/**
 * Fetch paginated users directly from Firestore using cursor pagination
 */
export async function getUsersPaginated(options: PaginatedUsersOptions = {}) {
  if (!auth.currentUser) {
    throw new Error("Unauthorized: Authentication required.");
  }

  const { pageSize = 10, lastDoc = null, roleFilter = "all" } = options;

  // Safe bounded page size (1 to 50)
  const safePageSize = Math.min(Math.max(1, Number(pageSize) || 10), 50);

  const usersCol = collection(db, "users");
  const constraints: any[] = [];

  if (roleFilter && roleFilter !== "all" && isValidRole(roleFilter)) {
    constraints.push(where("role", "==", roleFilter));
  }

  constraints.push(orderBy("createdAt", "desc"));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  constraints.push(limit(safePageSize));

  const q = query(usersCol, ...constraints);
  const snapshot = await getDocs(q);

  const users: UserProfile[] = snapshot.docs.map((d) => ({
    ...d.data(),
    uid: d.id,
  })) as UserProfile[];

  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
  const hasMore = snapshot.docs.length === safePageSize;

  return {
    users,
    lastDoc: newLastDoc,
    hasMore,
  };
}

/**
 * Fetch user counts using getCountFromServer (0 document reads)
 */
export async function getUserCounts() {
  if (!auth.currentUser) {
    throw new Error("Unauthorized: Authentication required.");
  }

  const usersCol = collection(db, "users");
  const [totalSnap, studentSnap, staffSnap] = await Promise.all([
    getCountFromServer(usersCol),
    getCountFromServer(query(usersCol, where("role", "==", "student"))),
    getCountFromServer(query(usersCol, where("role", "in", ["admin", "principal", "grievance_cell"]))),
  ]);

  return {
    total: totalSnap.data().count,
    students: studentSnap.data().count,
    staff: staffSnap.data().count,
  };
}
