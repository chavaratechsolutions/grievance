import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: any): string {
  if (!timestamp) return "Just now";
  
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return "Recent";
}

export function getStatusBadgeStyle(status: string) {
  switch (status) {
    case "submitted":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "under_review":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "investigating":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "action_taken":
      return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
    case "resolved":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "rejected":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
  }
}

export function formatStatusLabel(status: string) {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under Review";
    case "investigating":
      return "Investigating";
    case "action_taken":
      return "Action Taken";
    case "resolved":
      return "Resolved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}
