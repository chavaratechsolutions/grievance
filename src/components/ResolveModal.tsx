"use client";

import React, { useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { Grievance } from "@/types";
import { resolveGrievance } from "@/lib/services/grievances";
import { useAuth } from "@/context/auth-context";

interface ResolveModalProps {
  grievance: Grievance | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResolveModal({
  grievance,
  isOpen,
  onClose,
  onSuccess,
}: ResolveModalProps) {
  const { profile } = useAuth();
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !grievance) return null;

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setError("You must be authenticated as staff to resolve a grievance.");
      return;
    }

    if (!resolutionSummary.trim()) {
      setError("Please provide the final action taken.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await resolveGrievance({
        grievanceId: grievance.id,
        currentStatus: grievance.status,
        finalResolution: resolutionSummary.trim(),
        performedBy: {
          uid: profile.uid,
          name: profile.displayName || "Resolution Authority",
          role: profile.role || "principal",
        },
      });

      setResolutionSummary("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Resolve error:", err);
      setError(err.message || "Failed to resolve complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Final Resolution & Closure
              </h3>
              <p className="text-xs text-zinc-500 truncate max-w-xs">
                {grievance.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleResolve} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
              {error}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs">
            Marking this grievance as resolved will notify the student and permanently record your resolution summary into the timeline audit history.
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Final Action Taken / Resolution Summary
            </label>
            <textarea
              rows={4}
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="e.g. Committee reviewed the evidence, warned the concerned party, and adjusted the attendance record. Case amicably closed."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-zinc-400"
              required
            />
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
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolve & Close Complaint
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
