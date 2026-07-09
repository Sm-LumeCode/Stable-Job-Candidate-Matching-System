import { NavLink } from "react-router-dom";
import {
  BriefcaseBusiness, Database, Gauge, Settings, Tags,
  UploadCloud, X, UserRound, Trophy, Users, Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth, type UserRole } from "../context/AuthContext";

const ADMIN_LINKS = [
  ["/", "Dashboard", Gauge],
  ["/jobs", "Job Management", BriefcaseBusiness],
  ["/skills", "Skill Taxonomy", Tags],
  ["/matching", "Exact Matching", Sparkles],
  ["/benchmark", "BMH Benchmark", Database],
  ["/stable-matching", "Stable Matching", Sparkles],
  ["/evaluation", "Match Evaluation", Sparkles],
  ["/database", "Database", Database],
  ["/settings", "Settings", Settings],
] as const;

const RECRUITER_LINKS = [
  ["/recruiter", "Dashboard", Gauge],
  ["/recruiter/jobs", "My Jobs", BriefcaseBusiness],
  ["/recruiter/applicants", "Applicants", Users],
  ["/recruiter/matched", "Matched Candidates", Sparkles],
] as const;

const CANDIDATE_LINKS = [
  ["/candidate", "Dashboard", Gauge],
  ["/candidate/resume", "Upload Resume", UploadCloud],
  ["/candidate/profile", "My Profile", UserRound],
  ["/candidate/preferences", "My Preferences", Trophy],
  ["/candidate/jobs", "Job Matches", BriefcaseBusiness],
  ["/candidate/results", "My Results", Sparkles],
] as const;

function getLinks(role: UserRole) {
  if (role === "admin") return ADMIN_LINKS;
  if (role === "recruiter") return RECRUITER_LINKS;
  return CANDIDATE_LINKS;
}

function getRoleBadge(role: UserRole) {
  if (role === "admin") return { label: "Admin", color: "bg-violet-500/15 text-violet-400" };
  if (role === "recruiter") return { label: "Recruiter", color: "bg-blue-500/15 text-blue-400" };
  return { label: "Candidate", color: "bg-emerald-500/15 text-emerald-400" };
}

export function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const { user } = useAuth();
  const role = user?.role ?? "candidate";
  const links = getLinks(role);
  const badge = getRoleBadge(role);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-[#090e19] transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 font-bold text-white">
            S
          </div>
          <div>
            <div className="font-semibold">StableHire</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Matching Intelligence</div>
          </div>
        </div>
        <button className="lg:hidden" onClick={close}>
          <X size={19} />
        </button>
      </div>

      {user && (
        <div className="border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-xs font-bold text-white">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{user.username}</div>
              <span className={`mt-0.5 inline-block rounded-full px-2 py-px text-[10px] font-medium ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          </div>
        </div>
      )}

      <nav className="space-y-1 p-3">
        {links.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/" || to === "/recruiter" || to === "/candidate"}
            onClick={close}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                isActive
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
