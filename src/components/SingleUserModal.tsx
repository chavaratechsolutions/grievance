"use client";

import React, { useState } from "react";
import { X, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { createUserAccount } from "@/app/actions/user-actions";
import { Role } from "@/types";
import { auth } from "@/lib/firebase/client";

interface SingleUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: string[];
}

export function SingleUserModal({
  isOpen,
  onClose,
  onSuccess,
  departments,
}: SingleUserModalProps) {
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "student" as Role,
    department: departments[0] || "Computer Science & Engineering",
    rollNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInfo, setCreatedInfo] = useState<{ email: string; tempPass: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.role === "student") {
      const cleanRoll = formData.rollNumber.trim();
      if (!cleanRoll) {
        setError("Roll / Register Number is required for students as it serves as their password.");
        return;
      }
      if (!formData.password && cleanRoll.length < 6) {
        setError(`Roll / Register Number "${cleanRoll}" must be at least 6 characters long to be used as a password (or enter a custom 6+ character password).`);
        return;
      }
    }

    if (formData.password && formData.password.trim().length > 0 && formData.password.trim().length < 6) {
      setError("Custom password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const token = await auth.currentUser?.getIdToken();

    const res = await createUserAccount({
      displayName: formData.displayName,
      email: formData.email,
      password: formData.password || undefined,
      role: formData.role,
      department: formData.department,
      rollNumber: formData.role === "student" ? formData.rollNumber.trim() : undefined,
      idToken: token,
    });

    setSubmitting(false);

    if (res.success && res.data) {
      setCreatedInfo({
        email: res.data.email || formData.email,
        tempPass: res.data.temporaryPassword || "Assigned",
      });
      onSuccess();
    } else {
      setError(res.error || "Failed to create user account.");
    }
  };

  const handleResetAndClose = () => {
    setCreatedInfo(null);
    setError(null);
    setFormData({
      displayName: "",
      email: "",
      password: "",
      role: "student",
      department: departments[0] || "Computer Science & Engineering",
      rollNumber: "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <UserPlus className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Register New User
            </h3>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {createdInfo ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Account Created Successfully!
              </div>
              <p className="text-xs">
                Admin session was securely preserved. Share these credentials with the user:
              </p>
              <div className="bg-white/80 dark:bg-zinc-950/80 p-3 rounded-lg text-xs font-mono space-y-1">
                <div>Email: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{createdInfo.email}</span></div>
                <div>Password: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{createdInfo.tempPass}</span></div>
              </div>
            </div>

            <button
              onClick={handleResetAndClose}
              className="w-full py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs hover:opacity-90 transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g. Priya Nair"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="priya.nair@college.edu"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Assign Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="student">Student</option>
                  <option value="grievance_cell">Grievance Cell</option>
                  <option value="principal">Principal</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.role === "student" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Roll / Register Number <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-400">Used as login password</span>
                </div>
                <input
                  type="text"
                  required
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  placeholder="e.g. CS24-101 (min. 6 characters)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  This will be the student&apos;s initial password for logging into the portal (min. 6 characters).
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {formData.role === "student"
                  ? "Custom Password (Optional — defaults to Roll Number)"
                  : "Custom Password (Leave blank to auto-generate)"}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={
                  formData.role === "student"
                    ? formData.rollNumber.trim()
                      ? `Defaults to: ${formData.rollNumber.trim()}`
                      : "Defaults to Roll / Register Number"
                    : "Minimum 6 characters"
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition disabled:opacity-50 shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    Create Account
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
