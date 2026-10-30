"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Users, 
  UserPlus, 
  FileSpreadsheet, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  CheckCircle2
} from "lucide-react";
import { UserProfile, Role } from "@/types";
import { getUsersPaginated, getUserCounts } from "@/lib/services/users";
import { toggleUserStatus } from "@/app/actions/user-actions";
import { SingleUserModal } from "@/components/SingleUserModal";
import { BulkUploadModal } from "@/components/BulkUploadModal";
import { getCachedSystemSettings } from "@/app/actions/settings-actions";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { auth } from "@/lib/firebase/client";
import { DEFAULT_SYSTEM_SETTINGS } from "@/types";

export default function UserManagementPage() {
  const { role, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [counts, setCounts] = useState({ total: 0, students: 0, staff: 0 });
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [departments, setDepartments] = useState<string[]>(DEFAULT_SYSTEM_SETTINGS.departments);

  // Modals
  const [singleUserModalOpen, setSingleUserModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Pagination
  const [cursorHistory, setCursorHistory] = useState<Array<QueryDocumentSnapshot<DocumentData> | null>>([]);
  const [currentCursor, setCurrentCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);

  // Load departments from cached settings
  useEffect(() => {
    getCachedSystemSettings().then((s) => {
      if (s?.departments?.length) setDepartments(s.departments);
    }).catch((err) => {
      console.warn("Could not load departments (using defaults):", err);
    });
  }, []);

  const loadData = useCallback(async (cursor: QueryDocumentSnapshot<DocumentData> | null = null) => {
    setLoading(true);
    try {
      const [userRes, countRes] = await Promise.all([
        getUsersPaginated({
          pageSize: 10,
          lastDoc: cursor,
          roleFilter,
        }),
        getUserCounts(),
      ]);

      setUsers(userRes.users);
      setCurrentCursor(userRes.lastDoc);
      setHasMore(userRes.hasMore);
      setCounts(countRes);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    if (!authLoading) {
      if (!profile || role !== "admin") {
        router.push("/login");
      } else {
        setCursorHistory([]);
        setPageIndex(1);
        loadData(null);
      }
    }
  }, [authLoading, profile, role, loadData, router]);

  const handleNext = () => {
    if (!currentCursor || !hasMore) return;
    setCursorHistory((prev) => [...prev, currentCursor]);
    setPageIndex((p) => p + 1);
    loadData(currentCursor);
  };

  const handlePrev = () => {
    if (pageIndex <= 1) return;
    const newHist = [...cursorHistory];
    newHist.pop();
    const prevCursor = newHist.length > 0 ? newHist[newHist.length - 1] : null;
    setCursorHistory(newHist);
    setPageIndex((p) => p - 1);
    loadData(prevCursor);
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const shouldDisable = !user.isDisabled;
    const confirmMsg = shouldDisable 
      ? `Are you sure you want to disable access for ${user.displayName}?`
      : `Re-enable account access for ${user.displayName}?`;

    if (!confirm(confirmMsg)) return;

    const token = await auth.currentUser?.getIdToken();
    const res = await toggleUserStatus(user.uid, shouldDisable, token);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, isDisabled: shouldDisable } : u))
      );
    } else {
      alert(`Error updating user status: ${res.error}`);
    }
  };

  const getRoleBadge = (r: Role) => {
    switch (r) {
      case "admin":
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-semibold border border-rose-500/20">Admin</span>;
      case "principal":
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">Principal</span>;
      case "grievance_cell":
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-semibold border border-indigo-500/20">Grievance Cell</span>;
      case "student":
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">Student</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
              System Administration
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            User Provisioning & Directory
          </h1>
          <p className="text-xs text-zinc-500">
            Manage institutional user accounts, issue student credentials, and configure access permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Bulk Student Register</span>
          </button>

          <button
            onClick={() => setSingleUserModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register New User</span>
          </button>
        </div>
      </div>

      {/* Mini Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-xs text-zinc-400 font-medium">Total Registered</div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {counts.total} users
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-xs text-zinc-400 font-medium">Enrolled Students</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {counts.students} students
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-xs text-zinc-400 font-medium">App Admins & Staff</div>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {counts.staff} staff members
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 mr-1">
            <Filter className="h-3.5 w-3.5" />
            Filter:
          </span>
          {[
            { id: "all", label: "All Users" },
            { id: "student", label: "Students" },
            { id: "grievance_cell", label: "Grievance Cell" },
            { id: "principal", label: "Principal" },
            { id: "admin", label: "Admins" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id as Role | "all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                roleFilter === tab.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => loadData(null)}
          className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 uppercase tracking-wider text-[10px] font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3.5 px-4">User Profile</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Roll / ID</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    Fetching user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No users found matching filter.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.uid} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">
                        {u.displayName}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        {u.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>
                    <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">{u.department}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                      {u.rollNumber || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.isDisabled ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-medium">
                          Disabled
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                          u.isDisabled
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-600 hover:bg-rose-500/20"
                        }`}
                      >
                        {u.isDisabled ? "Enable" : "Disable"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Cursor Pagination Nav */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-zinc-500">
            Showing Page {pageIndex}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={pageIndex <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-40 transition font-medium"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!hasMore || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-40 transition font-medium"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SingleUserModal
        isOpen={singleUserModalOpen}
        onClose={() => setSingleUserModalOpen(false)}
        onSuccess={() => loadData(null)}
        departments={departments}
      />

      <BulkUploadModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={() => loadData(null)}
      />
    </div>
  );
}
