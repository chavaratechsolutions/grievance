"use client";

import React, { useEffect, useState } from "react";
import { 
  X, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  ExternalLink,
  Send,
  ShieldAlert,
  UserCheck
} from "lucide-react";
import { Grievance, TimelineEntry } from "@/types";
import { getGrievanceTimeline } from "@/lib/services/grievances";
import { formatDate, getStatusBadgeStyle, formatStatusLabel } from "@/lib/utils";

interface TimelineDrawerProps {
  grievance: Grievance | null;
  isOpen: boolean;
  onClose: () => void;
  onActionClick?: (grievance: Grievance) => void;
  onResolveClick?: (grievance: Grievance) => void;
  canTakeAction?: boolean;
}

export function TimelineDrawer({
  grievance,
  isOpen,
  onClose,
  onActionClick,
  onResolveClick,
  canTakeAction = false,
}: TimelineDrawerProps) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && grievance?.id) {
      setLoading(true);
      getGrievanceTimeline(grievance.id)
        .then((entries) => {
          setTimeline(entries);
        })
        .catch((err) => {
          console.error("Failed to load timeline entries:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setTimeline([]);
    }
  }, [isOpen, grievance?.id]);

  if (!isOpen || !grievance) return null;

  const isResolved = grievance.status === "resolved";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between">
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getStatusBadgeStyle(grievance.status)}`}>
                {formatStatusLabel(grievance.status)}
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Case ID: #{grievance.id}
              </span>
              {grievance.isAnonymous && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 font-medium">
                  Confidential / Anonymous
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {grievance.title}
            </h2>
            <div className="text-xs text-zinc-500 flex items-center gap-2">
              <span>{grievance.category}</span>
              <span>•</span>
              <span>{grievance.department}</span>
              <span>•</span>
              <span>Lodged {formatDate(grievance.createdAt)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Detailed Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Statement of Grievance
            </h3>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {grievance.description}
            </div>
          </div>

          {/* Submitter Details */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between text-xs">
            <span className="text-zinc-500">Complainant:</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {grievance.isAnonymous ? "Protected Anonymous Student" : (grievance.submitterName || "Student")}
            </span>
          </div>

          {/* Attachments / Evidence */}
          {grievance.attachmentUrls && grievance.attachmentUrls.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Submitted Evidence Documents ({grievance.attachmentUrls.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {grievance.attachmentUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition text-xs text-zinc-700 dark:text-zinc-300 group"
                  >
                    <FileText className="h-4 w-4 text-zinc-400 group-hover:text-blue-600 transition" />
                    <span className="truncate flex-1 font-medium">Attachment {idx + 1}</span>
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Card if resolved */}
          {isResolved && grievance.resolutionSummary && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-100 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" />
                Final Resolution & Committee Finding
              </div>
              <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">
                {grievance.resolutionSummary}
              </p>
              {grievance.resolvedBy && (
                <div className="pt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                  Closed by {grievance.resolvedBy.name} ({grievance.resolvedBy.role}) on {formatDate(grievance.resolvedAt)}
                </div>
              )}
            </div>
          )}

          {/* Activity & Action Timeline */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              Official Redressal History & Audit Trail
            </h3>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                Case has been logged. Committee review is currently scheduled.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                {timeline.map((entry, index) => {
                  const isResolutionStep = entry.actionType === "resolution";
                  return (
                    <div key={entry.id || index} className="relative group">
                      <div className={`absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                        isResolutionStep
                          ? "bg-emerald-500 ring-4 ring-emerald-500/20"
                          : "bg-blue-600 ring-2 ring-blue-500/20"
                      }`} />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {entry.performedBy.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            {entry.performedBy.role}
                          </span>
                          <span className="text-[11px] text-zinc-400 ml-auto font-mono">
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>

                        {entry.statusTo && entry.statusTo !== entry.statusFrom && (
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                            <span className="text-zinc-400">{formatStatusLabel(entry.statusFrom || "Logged")}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{formatStatusLabel(entry.statusTo)}</span>
                          </div>
                        )}

                        <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800 leading-relaxed">
                          {entry.remarks}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions for Grievance Cell / Principal */}
        {canTakeAction && !isResolved && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex gap-3">
            <button
              onClick={() => onActionClick && onActionClick(grievance)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              Update Next Step
            </button>
            <button
              onClick={() => onResolveClick && onResolveClick(grievance)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolve & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
