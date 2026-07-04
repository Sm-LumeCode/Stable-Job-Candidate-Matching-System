import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("panel p-5", className)}>{children}</div>;
}
export function Badge({ children, color = "blue" }: { children: ReactNode; color?: "blue" | "emerald" }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", color === "blue" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400")}>{children}</span>;
}
export function EmptyState({ label = "No Data" }: { label?: string }) {
  return <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-slate-700 text-sm text-slate-500">{label}</div>;
}

