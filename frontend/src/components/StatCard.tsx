import type { LucideIcon } from "lucide-react";
import { Card } from "./ui";

export function StatCard({ label, value, icon: Icon, color = "blue" }: { label: string; value: string | number; icon: LucideIcon; color?: "blue" | "emerald" }) {
  return <Card><div className="flex items-start justify-between"><div><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></div><div className={color === "blue" ? "rounded-lg bg-blue-500/10 p-2.5 text-blue-400" : "rounded-lg bg-emerald-500/10 p-2.5 text-emerald-400"}><Icon size={20} /></div></div></Card>;
}

