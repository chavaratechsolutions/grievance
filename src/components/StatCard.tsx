import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  description: string;
  badge?: string;
  colorTheme?: "blue" | "amber" | "emerald" | "purple";
  loading?: boolean;
}

export function StatCard({
  title,
  count,
  icon: Icon,
  description,
  badge,
  colorTheme = "blue",
  loading = false,
}: StatCardProps) {
  const getThemeClasses = () => {
    switch (colorTheme) {
      case "amber":
        return {
          iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          cardBorder: "hover:border-amber-500/30",
        };
      case "emerald":
        return {
          iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          cardBorder: "hover:border-emerald-500/30",
        };
      case "purple":
        return {
          iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          cardBorder: "hover:border-purple-500/30",
        };
      case "blue":
      default:
        return {
          iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          cardBorder: "hover:border-blue-500/30",
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div className={`p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm transition-all duration-200 shadow-sm ${theme.cardBorder}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl border ${theme.iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        {loading ? (
          <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        ) : (
          <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            {count.toLocaleString()}
          </span>
        )}
        {badge && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-zinc-400">{description}</p>
    </div>
  );
}
