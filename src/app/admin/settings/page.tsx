"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Layers, 
  Building2,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { getCachedSystemSettings, updateSystemSettings } from "@/app/actions/settings-actions";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";

export default function SystemSettingsPage() {
  const { role, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const [newCategory, setNewCategory] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getCachedSystemSettings();
      setCategories(data.categories);
      setDepartments(data.departments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!profile || role !== "admin") {
        router.push("/login");
      } else {
        loadSettings();
      }
    }
  }, [authLoading, profile, role, router]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    if (!categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()]);
    }
    setNewCategory("");
  };

  const handleRemoveCategory = (cat: string) => {
    setCategories(categories.filter((c) => c !== cat));
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartment.trim()) return;
    if (!departments.includes(newDepartment.trim())) {
      setDepartments([...departments, newDepartment.trim()]);
    }
    setNewDepartment("");
  };

  const handleRemoveDepartment = (dept: string) => {
    setDepartments(departments.filter((d) => d !== dept));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(false);

    const token = await auth.currentUser?.getIdToken();
    const res = await updateSystemSettings({
      categories,
      departments,
    }, token);

    setSaving(false);
    if (res.success) {
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
    } else {
      alert(`Save error: ${res.error}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              Cached Server Config (Next.js ISR)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            Complaint Categories & Departments
          </h1>
          <p className="text-xs text-zinc-500">
            Configure grievance classifications and academic department options available on student forms.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
            title="Reload Settings"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            System categories and department lists have been saved successfully.
          </span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-xs text-zinc-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading cached settings...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Grievance Categories ({categories.length})
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Displayed in the student complaint submission dropdown
                  </p>
                </div>
              </div>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </form>

            {/* Category Pill List */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs"
                >
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{cat}</span>
                  <button
                    onClick={() => handleRemoveCategory(cat)}
                    className="text-zinc-400 hover:text-rose-500 p-1"
                    title="Remove Category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Departments Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    College Departments ({departments.length})
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Used for routing and user department assignments
                  </p>
                </div>
              </div>
            </div>

            {/* Add Department Form */}
            <form onSubmit={handleAddDepartment} className="flex gap-2">
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="New department name..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </form>

            {/* Department Pill List */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {departments.map((dept) => (
                <div
                  key={dept}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-xs"
                >
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{dept}</span>
                  <button
                    onClick={() => handleRemoveDepartment(dept)}
                    className="text-zinc-400 hover:text-rose-500 p-1"
                    title="Remove Department"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
