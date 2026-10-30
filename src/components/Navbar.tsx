"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { 
  Scale, 
  FilePlus, 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  ChevronDown
} from "lucide-react";
import { useState } from "react";
import { Role } from "@/types";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, role, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await logout();
    router.push("/login");
  };

  const getRoleLabel = (r?: Role | null) => {
    switch (r) {
      case "admin":
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-semibold border border-rose-500/20">System Admin</span>;
      case "principal":
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold border border-amber-500/20">Principal</span>;
      case "grievance_cell":
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-semibold border border-blue-500/20">Grievance Cell</span>;
      case "student":
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">Student</span>;
      default:
        return null;
    }
  };

  const isStaff = role === "admin" || role === "principal" || role === "grievance_cell";
  const isAdmin = role === "admin";
  const isStudent = role === "student";

  const homeHref = profile ? (role === "student" ? "/student" : "/dashboard") : "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & College Branding */}
          <div className="flex items-center gap-6">
            <Link href={homeHref} className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm group-hover:bg-blue-500 transition">
                <Scale className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Grievance Redressal Portal
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  College Grievance Redressal System
                </span>
              </div>
            </Link>

            {/* Navigation Links for Authenticated Users */}
            {profile && (
              <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-zinc-200 dark:border-zinc-800 text-xs font-medium">
                {isStudent && (
                  <>
                    <Link
                      href="/student"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                        pathname === "/student"
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Dashboard
                    </Link>
                    <Link
                      href="/student/new"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                        pathname === "/student/new"
                          ? "bg-blue-600 text-white font-semibold"
                          : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      }`}
                    >
                      <FilePlus className="h-3.5 w-3.5" />
                      Submit Grievance
                    </Link>
                  </>
                )}

                {isStaff && (
                  <Link
                    href="/dashboard"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                      pathname === "/dashboard"
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Dashboard
                  </Link>
                )}

                {isAdmin && (
                  <>
                    <Link
                      href="/admin/users"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                        pathname.startsWith("/admin/users")
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      User Directory
                    </Link>
                    <Link
                      href="/admin/settings"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                        pathname === "/admin/settings"
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </Link>
                  </>
                )}
              </nav>
            )}
          </div>

          {/* Right Section: Real Authenticated User Profile */}
          <div className="flex items-center gap-3">
            {profile ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition text-left"
                >
                  <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center text-xs font-bold">
                    {profile.displayName ? profile.displayName[0].toUpperCase() : "U"}
                  </div>
                  <div className="hidden sm:flex flex-col pr-1">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[130px]">
                      {profile.displayName}
                    </span>
                    <span className="text-[10px] text-zinc-400 truncate max-w-[130px]">
                      {profile.department}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400 pr-1" />
                </button>

                {/* Real Profile Dropdown */}
                {showProfileMenu && (
                  <div 
                    className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 shadow-xl z-50 animate-in fade-in zoom-in-95"
                    onMouseLeave={() => setShowProfileMenu(false)}
                  >
                    <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{profile.displayName}</span>
                        {getRoleLabel(role)}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono truncate">{profile.email}</div>
                      {profile.rollNumber && (
                        <div className="text-[10px] text-zinc-400 font-mono">Roll: {profile.rollNumber}</div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition shadow-sm"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
