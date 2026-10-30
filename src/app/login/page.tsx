"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Scale,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { checkAdminExists, initializeFirstAdmin } from "@/app/actions/setup-actions";

export default function LoginPage() {
  const router = useRouter();
  const { login, role, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial Admin Setup State (for fresh Firebase deployments)
  const [showSetup, setShowSetup] = useState(false);
  const [setupData, setSetupData] = useState({
    displayName: "",
    email: "",
    password: "",
    department: "College Administration",
  });
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [adminExists, setAdminExists] = useState(true);

  // Check if system has an admin on mount
  useEffect(() => {
    checkAdminExists().then((exists) => setAdminExists(exists));
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (profile && role) {
      if (role === "student") router.push("/student");
      else router.push("/dashboard");
    }
  }, [profile, role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      // AuthProvider onAuthStateChanged will handle profile & redirect
    } else {
      const errMsg = res.error || "email or password incorrect";
      if (
        errMsg.includes("auth/invalid-credential") ||
        errMsg.includes("auth/wrong-password") ||
        errMsg.includes("auth/user-not-found") ||
        errMsg.includes("auth/invalid-email")
      ) {
        setError("email or password incorrect");
      } else {
        setError(errMsg);
      }
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupLoading(true);
    setError(null);

    const res = await initializeFirstAdmin(setupData);
    setSetupLoading(false);

    if (res.success) {
      setSetupSuccess(true);
      setShowSetup(false);
      setEmail(setupData.email);
      setPassword(setupData.password);
      setAdminExists(true);
    } else {
      setError(res.error || "Failed to initialize root administrator.");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Portal Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Scale className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {showSetup ? "Initialize Root Administrator" : "Sign In to Redressal Portal"}
          </h1>
          <p className="text-xs text-zinc-500">
            {showSetup
              ? "First-time setup: Create the primary Administrator account in your Firebase database."
              : "Enter your email and password to access the portal."}
          </p>
        </div>

        {/* Login / Setup Card */}
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
          {error && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
              {error}
            </div>
          )}

          {setupSuccess && (
            <div className="p-3 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
              Root Administrator created in Firebase! You can now sign in below.
            </div>
          )}

          {showSetup ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={setupData.displayName}
                  onChange={(e) => setSetupData({ ...setupData, displayName: e.target.value })}
                  placeholder="System Administrator"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={setupData.email}
                  onChange={(e) => setSetupData({ ...setupData, email: e.target.value })}
                  placeholder="admin@college.edu"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={setupData.password}
                  onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Department / Office
                </label>
                <input
                  type="text"
                  required
                  value={setupData.department}
                  onChange={(e) => setSetupData({ ...setupData, department: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={setupLoading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                >
                  {setupLoading ? "Initializing..." : "Create Admin"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@college.edu"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating with Firebase...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* First-time setup link if no admin exists */}
          {!showSetup && !adminExists && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-center">
              <button
                type="button"
                onClick={() => setShowSetup(true)}
                className="text-xs text-blue-600 hover:underline font-semibold flex items-center justify-center gap-1.5 mx-auto"
              >
                <ShieldCheck className="h-4 w-4" />
                Fresh Database? Initialize Root Administrator
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-zinc-400">
          Account registrations are provisioned by the College Administration. For new credentials or password resets, contact your department office.
        </p>
      </div>
    </div>
  );
}
