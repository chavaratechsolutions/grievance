"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import LoginPage from "@/app/login/page";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { profile, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && profile) {
      if (role === "student") {
        router.replace("/student");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [loading, profile, role, router]);

  // If session state is still loading from Firebase
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs text-zinc-500 font-medium">Checking session...</p>
      </div>
    );
  }

  // If user is authenticated, show redirecting state while effect executes
  if (profile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs text-zinc-500 font-medium">Redirecting to your dashboard...</p>
      </div>
    );
  }

  // When not logged in, home screen is the Login Page
  return <LoginPage />;
}
