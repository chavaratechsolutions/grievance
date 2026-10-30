"use client";

import React, { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Grievance, GrievanceStatus } from "@/types";
import { addNextStepAction } from "@/lib/services/grievances";
import { useAuth } from "@/context/auth-context";

interface ActionTrackerModalProps {
  grievance: Grievance | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ActionTrackerModal({
  grievance,
  isOpen,
  onClose,
  onSuccess,
}: ActionTrackerModalProps) {
  const { profile } = useAuth();
  const [newStatus, setNewStatus] = useState<GrievanceStatus>("investigating");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !grievance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setError("You must be authenticated as staff to record action steps.");
      return;
    }

    if (!remarks.trim()) {
      setError("Please describe the next step taken.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addNextStepAction({
        grievanceId: grievance.id,
        currentStatus: grievance.status,
        newStatus,
        remarks: remarks.trim(),
        performedBy: {
          uid: profile.uid,
          name: profile.displayName || "Staff Officer",
          role: profile.role || "grievance_cell",
        },
      });

      setRemarks("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to add next step:", err);
      setError(err.message || "Failed to update action step.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Record Next Step Taken
            </h3>
            <p className="text-xs text-zinc-500 truncate max-w-sm">
              Grievance: {grievance.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Update Status To
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as GrievanceStatus)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            >
              <option value="under_review">Under Review (Committee Review)</option>
              <option value="investigating">Investigating (Gathering Info/Hearing)</option>
              <option value="action_taken">Action Taken (Corrective measures initiated)</option>
              <option value="rejected">Rejected (Does not qualify / Invalid)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Next Step Details & Notes (Appended to Timeline)
            </label>
            <textarea
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Scheduled hearing with the department head and contacted student for additional clarification."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 placeholder:text-zinc-400"
              required
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              This entry is recorded into the sub-collection timeline with your name and role timestamp.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Record Step
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
