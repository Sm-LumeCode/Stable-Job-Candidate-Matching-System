import { NavLink } from "react-router-dom";
import { BriefcaseBusiness, Database, Gauge, Settings, Tags, UploadCloud, X } from "lucide-react";
import { cn } from "../lib/utils";

const links = [
  ["/", "Dashboard", Gauge], ["/resume-upload", "Resume Upload", UploadCloud],
  ["/jobs", "Jobs", BriefcaseBusiness], ["/skills", "Skill Taxonomy", Tags],
  ["/database", "Database Status", Database], ["/settings", "Settings", Settings],
] as const;

export function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  return <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-[#090e19] transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
    <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
      <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 font-bold text-white">S</div><div><div className="font-semibold">StableHire</div><div className="text-[10px] uppercase tracking-widest text-slate-500">Matching Intelligence</div></div></div>
      <button className="lg:hidden" onClick={close}><X size={19} /></button>
    </div>
    <nav className="space-y-1 p-3">{links.map(([to, label, Icon]) =>
      <NavLink key={to} to={to} end={to === "/"} onClick={close} className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition", isActive ? "bg-blue-500/10 text-blue-400" : "text-slate-400 hover:bg-slate-800/60 hover:text-white")}>
        <Icon size={18} />{label}
      </NavLink>)}</nav>
  </aside>;
}
