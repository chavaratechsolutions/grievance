"use client";

import React, { useEffect, useState, useCallback } from "react";
import { 
  Inbox, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft,
  Eye, 
  Send, 
  RefreshCw,
  Search,
  SlidersHorizontal,
  Flame,
  ShieldCheck,
  Building2,
  FileCheck2
} from "lucide-react";
import { Grievance, DashboardStats, GrievanceStatus } from "@/types";
import { 
  getDashboardStats, 
  getGrievancesPaginated, 
  PAGE_SIZE 
} from "@/lib/services/grievances";
import { StatCard } from "@/components/StatCard";
import { TimelineDrawer } from "@/components/TimelineDrawer";
import { ActionTrackerModal } from "@/components/ActionTrackerModal";
import { ResolveModal } from "@/components/ResolveModal";
import { formatDate, getStatusBadgeStyle, formatStatusLabel } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

export default function GrievanceCellDashboardPage() {
  const { role, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // 1. Stats State
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // 2. Table & Filter State
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loadingTable, setLoadingTable] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(false);

  // Pagination cursors
  const [cursorHistory, setCursorHistory] = useState<Array<QueryDocumentSnapshot<DocumentData> | null>>([]);
  const [currentCursor, setCurrentCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageIndex, setPageIndex] = useState(1);

  // 3. Modals
  const [activeGrievance, setActiveGrievance] = useState<Grievance | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Stats loading error:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadTableData = useCallback(async (cursor: QueryDocumentSnapshot<DocumentData> | null = null) => {
    setLoadingTable(true);
    try {
      const res = await getGrievancesPaginated({
        pageSize: PAGE_SIZE,
        lastDoc: cursor,
        status: statusFilter,
        category: categoryFilter,
      });

      setGrievances(res.grievances);
      setCurrentCursor(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (err) {
      console.error("Table data loading error:", err);
    } finally {
      setLoadingTable(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    if (!authLoading) {
      if (!profile) {
        router.push("/login");
      } else if (role === "student") {
        router.push("/student");
      } else if (role !== "admin" && role !== "principal" && role !== "grievance_cell") {
        router.push("/login");
      } else {
        loadStats();
        setCursorHistory([]);
        setPageIndex(1);
        loadTableData(null);
      }
    }
  }, [authLoading, profile, role, loadStats, loadTableData, router]);

  const handleNextPage = () => {
    if (!currentCursor || !hasMore) return;
    setCursorHistory((prev) => [...prev, currentCursor]);
    setPageIndex((p) => p + 1);
    loadTableData(currentCursor);
  };

  const handlePrevPage = () => {
    if (pageIndex <= 1) return;
    const newHistory = [...cursorHistory];
    newHistory.pop();
    const prevCursor = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
    setCursorHistory(newHistory);
    setPageIndex((p) => p - 1);
    loadTableData(prevCursor);
  };

  const isStaff = role === "admin" || role === "principal" || role === "grievance_cell";

  const filteredGrievances = grievances.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.title.toLowerCase().includes(q) ||
      g.department.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              {role === "principal" ? "Principal Executive Oversight" : "Grievance Redressal Board"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            Complaints Management Console
          </h1>
          <p className="text-xs text-zinc-500">
            Official redressal log for managing student appeals, intermediate committee steps, and final resolutions.
          </p>
        </div>

        <button
          onClick={() => {
            loadStats();
            loadTableData(null);
          }}
          disabled={loadingTable || loadingStats}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingTable ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered"
          count={stats.total}
          icon={Inbox}
          description="Cumulative grievances logged"
          colorTheme="blue"
          loading={loadingStats}
        />
        <StatCard
          title="Pending Triage"
          count={stats.pending}
          icon={Clock}
          description="Awaiting initial assignment"
          colorTheme="amber"
          loading={loadingStats}
        />
        <StatCard
          title="Active Inquiries"
          count={stats.inProgress}
          icon={AlertCircle}
          description="Under committee investigation"
          colorTheme="purple"
          loading={loadingStats}
        />
        <StatCard
          title="Resolved Cases"
          count={stats.resolved}
          icon={CheckCircle2}
          description="Successfully redressed and closed"
          colorTheme="emerald"
          loading={loadingStats}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Cases" },
            { id: "submitted", label: "Submitted" },
            { id: "under_review", label: "Under Review" },
            { id: "investigating", label: "Investigating" },
            { id: "action_taken", label: "Action Taken" },
            { id: "resolved", label: "Resolved" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                statusFilter === tab.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, dept..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Grievances Data Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 uppercase tracking-wider text-[10px] font-semibold border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3.5 px-4">Case Details</th>
                <th className="py-3.5 px-4">Department & Category</th>
                <th className="py-3.5 px-4">Submitter</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loadingTable ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    Loading complaint records...
                  </td>
                </tr>
              ) : filteredGrievances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    No complaints found matching this criteria.
                  </td>
                </tr>
              ) : (
                filteredGrievances.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition group"
                  >
                    {/* Case Details */}
                    <td className="py-4 px-4 max-w-xs">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-xs mt-0.5">
                        {item.description}
                      </div>
                    </td>

                    {/* Department & Category */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">
                        {item.department}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {item.category}
                      </div>
                    </td>

                    {/* Submitter */}
                    <td className="py-4 px-4">
                      {item.isAnonymous ? (
                        <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
                          <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                          <span>Anonymous</span>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-zinc-800 dark:text-zinc-200">
                            {item.submitterName || "Student"}
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate max-w-[130px]">
                            {item.submitterEmail || item.submitterDepartment}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Status & Priority */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${getStatusBadgeStyle(item.status)}`}>
                          {formatStatusLabel(item.status)}
                        </span>
                        {item.priority === "urgent" && (
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20 flex items-center gap-1">
                            <Flame className="h-3 w-3" />
                            Urgent
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-zinc-500 font-mono text-[11px]">
                      {formatDate(item.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setActiveGrievance(item);
                            setTimelineOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition flex items-center gap-1 text-[11px] font-medium"
                          title="View Case Timeline"
                        >
                          <Eye className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Timeline</span>
                        </button>

                        {isStaff && item.status !== "resolved" && (
                          <>
                            <button
                              onClick={() => {
                                setActiveGrievance(item);
                                setActionModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition flex items-center gap-1 text-[11px] font-semibold"
                              title="Record Next Step"
                            >
                              <Send className="h-3 w-3 text-blue-500" />
                              <span>Action</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveGrievance(item);
                                setResolveModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1 text-[11px] font-semibold shadow-sm"
                              title="Resolve & Close"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Resolve</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-zinc-500">
            Showing Page {pageIndex}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={pageIndex <= 1 || loadingTable}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-40 transition font-medium"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>

            <button
              onClick={handleNextPage}
              disabled={!hasMore || loadingTable}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-40 transition font-medium"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TimelineDrawer
        grievance={activeGrievance}
        isOpen={timelineOpen}
        onClose={() => {
          setTimelineOpen(false);
          setActiveGrievance(null);
        }}
        onActionClick={(g) => {
          setTimelineOpen(false);
          setActiveGrievance(g);
          setActionModalOpen(true);
        }}
        onResolveClick={(g) => {
          setTimelineOpen(false);
          setActiveGrievance(g);
          setResolveModalOpen(true);
        }}
        canTakeAction={isStaff}
      />

      <ActionTrackerModal
        grievance={activeGrievance}
        isOpen={actionModalOpen}
        onClose={() => {
          setActionModalOpen(false);
          setActiveGrievance(null);
        }}
        onSuccess={() => {
          loadStats();
          loadTableData(null);
        }}
      />

      <ResolveModal
        grievance={activeGrievance}
        isOpen={resolveModalOpen}
        onClose={() => {
          setResolveModalOpen(false);
          setActiveGrievance(null);
        }}
        onSuccess={() => {
          loadStats();
          loadTableData(null);
        }}
      />
    </div>
  );
}
