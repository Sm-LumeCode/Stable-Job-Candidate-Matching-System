import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("panel p-5", className)}>{children}</div>;
}
export function Badge({ children, color = "blue", className = "" }: { children: ReactNode; color?: "blue" | "emerald" | "violet" | "red" | "amber" | "slate"; className?: string }) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    violet: "bg-violet-500/10 text-violet-400",
    red: "bg-red-500/10 text-red-400",
    amber: "bg-amber-500/10 text-amber-400",
    slate: "bg-slate-500/10 text-slate-400"
  };
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", colorMap[color], className)}>{children}</span>;
}
export function EmptyState({ label = "No Data" }: { label?: string }) {
  return <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-slate-700 text-sm text-slate-500">{label}</div>;
}

