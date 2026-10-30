"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Send, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { submitGrievance } from "@/lib/services/grievances";
import { getCachedSystemSettings } from "@/app/actions/settings-actions";

export default function NewGrievancePage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [categories, setCategories] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    getCachedSystemSettings()
      .then((settings) => {
        setCategories(settings.categories);
        setDepartments(settings.departments);
        if (settings.categories.length > 0) setCategory(settings.categories[0]);
        if (settings.departments.length > 0) setDepartment(settings.departments[0]);
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      })
      .finally(() => {
        setLoadingSettings(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) {
      setError("Please sign in with your institutional credentials to submit a grievance.");
      router.push("/login");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError("Please provide a title and detailed description.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitGrievance({
        title: title.trim(),
        category: category || "General / Other",
        department: department || "Administrative Office",
        description: description.trim(),
        priority: "medium",
        isAnonymous: false,
        submittedByUid: profile.uid,
        submitterName: profile.displayName || "Student",
        submitterEmail: profile.email || "",
        submitterDepartment: profile.department || department,
        files: [],
      });

      if (result.success && result.grievanceId) {
        setSuccessId(result.grievanceId);
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      setError(err.message || "Failed to submit grievance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/student"
          className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Submit a Formal Grievance
          </h1>
          <p className="text-xs text-zinc-500">
            Your complaint will be reviewed by the College Grievance Redressal Committee.
          </p>
        </div>
      </div>

      {successId ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-4 shadow-sm animate-in fade-in">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Grievance Registered Successfully
            </h2>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Your grievance reference ID is <strong className="font-mono text-zinc-900 dark:text-zinc-100">#{successId}</strong>. You will receive time-stamped status updates as the committee processes your case.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-4">
            <Link
              href="/student"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-sm"
            >
              Track in My Grievances
            </Link>
            <button
              onClick={() => {
                setSuccessId(null);
                setTitle("");
                setDescription("");
              }}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition"
            >
              Submit Another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-5 shadow-sm">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Subject / Title of Grievance <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of the issue (e.g. Non-functional air conditioning in CS Lab 3)"
                className="w-full px-4 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Category & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Grievance Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={loadingSettings}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Concerned Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={loadingSettings}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Detailed Description & Incident Facts <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={6}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="State the date, time, location, specific individuals involved, and what action you seek from the Redressal Cell."
                className="w-full px-4 py-3 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder:text-zinc-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/student"
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Grievance
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
