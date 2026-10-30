"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { 
  FilePlus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Inbox, 
  Eye, 
  RefreshCw,
  Search,
  Filter,
  GraduationCap
} from "lucide-react";
import { Grievance } from "@/types";
import { getGrievancesPaginated } from "@/lib/services/grievances";
import { TimelineDrawer } from "@/components/TimelineDrawer";
import { formatDate, getStatusBadgeStyle, formatStatusLabel } from "@/lib/utils";

export default function StudentDashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchStudentGrievances = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const res = await getGrievancesPaginated({
        studentUid: profile.uid,
        status: statusFilter,
        pageSize: 20,
      });
      setGrievances(res.grievances);
    } catch (err) {
      console.error("Failed to load grievances from Firebase:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!profile) {
        router.push("/login");
      } else {
        fetchStudentGrievances();
      }
    }
  }, [authLoading, profile?.uid, statusFilter]);

  const handleOpenTimeline = (g: Grievance) => {
    setSelectedGrievance(g);
    setDrawerOpen(true);
  };

  const totalCount = grievances.length;
  const inProgressCount = grievances.filter((g) => ["under_review", "investigating", "action_taken"].includes(g.status)).length;
  const resolvedCount = grievances.filter((g) => g.status === "resolved").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Student Welcome Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              Student Redressal Portal
            </span>
            {profile?.rollNumber && (
              <span className="text-xs text-zinc-400 font-mono">
                ID: {profile.rollNumber}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome, {profile?.displayName || "Student"}
          </h1>
          <p className="text-xs text-zinc-500 max-w-xl">
            {profile?.department || "General Department"} • Submit complaints, view investigation remarks, and track real-time resolution progress.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchStudentGrievances}
            disabled={loading}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition text-xs flex items-center gap-1.5"
            title="Refresh Complaints"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/student/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm"
          >
            <FilePlus className="h-4 w-4" />
            Submit New Grievance
          </Link>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-400 font-medium">My Total Submissions</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{totalCount}</div>
        </div>
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-400 font-medium">Under Review / Inquiry</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{inProgressCount}</div>
        </div>
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs text-zinc-400 font-medium">Successfully Resolved</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{resolvedCount}</div>
        </div>
      </div>

      {/* Complaints List Table / Cards */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Grievance History
            </h2>
            <span className="text-xs text-zinc-400">({grievances.length} cases)</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "All" },
              { id: "submitted", label: "Submitted" },
              { id: "under_review", label: "Under Review" },
              { id: "investigating", label: "Investigating" },
              { id: "action_taken", label: "Action Taken" },
              { id: "resolved", label: "Resolved" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition whitespace-nowrap ${
                  statusFilter === tab.id
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
            <p className="text-xs text-zinc-500">Retrieving case records...</p>
          </div>
        ) : grievances.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
              <Inbox className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                No Grievances Found
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                You have not filed any grievances under this filter. If you have an academic, exam, hostel, or campus issue, please submit a formal report.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/student/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-sm"
              >
                <FilePlus className="h-4 w-4" />
                Submit a Grievance
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {grievances.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenTimeline(item)}
                className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getStatusBadgeStyle(item.status)}`}>
                      {formatStatusLabel(item.status)}
                    </span>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {item.category}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-xs text-zinc-400">
                      {item.department}
                    </span>
                    {item.isAnonymous && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 font-medium">
                        Anonymous
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {item.title}
                  </h3>

                  <p className="text-xs text-zinc-500 line-clamp-1">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-zinc-400">Submitted</div>
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {formatDate(item.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl transition">
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Progress</span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Modal Component */}
      <TimelineDrawer
        grievance={selectedGrievance}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedGrievance(null);
        }}
      />
    </div>
  );
}
