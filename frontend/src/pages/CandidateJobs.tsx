import { useState, useEffect, useCallback } from "react";
import {
  BriefcaseBusiness, CheckCircle2, XCircle, Plus, Loader2,
  Building2, MapPin, Star, Zap, TrendingUp, AlertCircle, RefreshCw,
  Lock, Settings2, ArrowRight,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card, Badge } from "../components/ui";
import { getData, request } from "../lib/api";
import type { JobWithApplication, ApplicationsResponse } from "../types";
import { Link } from "react-router-dom";

/* ── Match badge helper ─────────────────────────────────────────────────────── */
function matchBadge(pct: number) {
  if (pct >= 70) return { label: "Excellent", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (pct >= 50) return { label: "Good",      cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  if (pct >= 30) return { label: "Moderate",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  return              { label: "Low",         cls: "bg-slate-500/15 text-slate-400 border-slate-700" };
}

function scoreColor(pct: number) {
  if (pct >= 70) return "text-emerald-400";
  if (pct >= 50) return "text-blue-400";
  if (pct >= 30) return "text-amber-400";
  return "text-slate-400";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "auto_applied")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        <Zap size={10} /> Auto Applied
      </span>
    );
  if (status === "manually_applied")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-xs font-medium text-blue-400">
        <CheckCircle2 size={10} /> Applied
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/60 border border-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-400">
      Not Applied
    </span>
  );
}

/* ── Job Card ───────────────────────────────────────────────────────────────── */
function JobCard({
  job,
  onApply,
  onCancel,
  busy,
}: {
  job: JobWithApplication;
  onApply: (id: string) => void;
  onCancel: (id: string) => void;
  busy: boolean;
}) {
  const pct = Math.round(job.compatibility_score * 100);
  const badge = matchBadge(pct);
  const applied = job.status === "auto_applied" || job.status === "manually_applied";

  return (
    <Card
      className={`flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 ${
        applied ? "border-slate-700/80" : "border-slate-800/60 opacity-80 hover:opacity-100"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
            <Building2 size={18} className="text-blue-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white truncate">{job.job_title}</div>
            <div className="text-xs text-slate-400 truncate">{job.company_name}</div>
          </div>
        </div>

        {/* Compatibility score */}
        <div className="shrink-0 text-right">
          <div className={`text-2xl font-bold font-mono leading-none ${scoreColor(pct)}`}>{pct}%</div>
          <div className="mt-0.5 text-[10px] text-slate-500">match</div>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-800">
        <div
          className={`h-1.5 rounded-full transition-all ${
            pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-slate-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        {job.location && (
          <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
        )}
        <span className="flex items-center gap-1"><TrendingUp size={11} />{job.min_experience_years}+ yrs</span>
        {job.offered_salary && (
          <span className="flex items-center gap-1"><Star size={11} />{job.offered_salary} LPA</span>
        )}
      </div>

      {/* Skills */}
      {job.required_skills && (
        <div className="flex flex-wrap gap-1">
          {job.required_skills.split(",").map(s => s.trim()).filter(Boolean).slice(0, 5).map(s => (
            <span key={s} className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">{s}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} />
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.label}</span>
        </div>
        {applied ? (
          <button
            onClick={() => onCancel(job.job_id)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            <XCircle size={13} /> Cancel
          </button>
        ) : (
          <button
            onClick={() => onApply(job.job_id)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20 disabled:opacity-50"
          >
            <Plus size={13} /> Apply
          </button>
        )}
      </div>
    </Card>
  );
}

/* ── Filter bar ─────────────────────────────────────────────────────────────── */
type Filter = "all" | "applied" | "not_applied";

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function CandidateJobs() {
  const [data, setData] = useState<ApplicationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [preferredCompanies, setPreferredCompanies] = useState<string[]>([]);

  const load = useCallback(async (forceCompute = false) => {
    setError("");
    if (forceCompute) {
      setComputing(true);
      try {
        const res = await request<ApplicationsResponse & { preferred_companies: string[] }>("/applications/compute", { method: "POST" });
        setData(res);
        setPreferredCompanies(res.preferred_companies || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to compute scores");
      } finally {
        setComputing(false);
        setLoading(false);
      }
    } else {
      try {
        const res = await getData<ApplicationsResponse & { preferred_companies: string[] }>("/applications/my");
        setData(res);
        setPreferredCompanies(res.preferred_companies || []);
      } catch {
        // No applications yet — trigger compute
        setComputing(true);
        try {
          const res = await request<ApplicationsResponse & { preferred_companies: string[] }>("/applications/compute", { method: "POST" });
          setData(res);
          setPreferredCompanies(res.preferred_companies || []);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to compute scores");
        } finally {
          setComputing(false);
        }
      } finally {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApply = async (jobId: string) => {
    setBusy(true);
    try {
      await request(`/applications/apply/${jobId}`, { method: "POST" });
      setData(prev => prev ? {
        ...prev,
        jobs: prev.jobs.map(j => j.job_id === jobId ? { ...j, status: "manually_applied" } : j),
      } : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (jobId: string) => {
    setBusy(true);
    try {
      await request(`/applications/cancel/${jobId}`, { method: "DELETE" });
      setData(prev => prev ? {
        ...prev,
        jobs: prev.jobs.map(j => j.job_id === jobId ? { ...j, status: "not_applied", preference_order: null } : j),
      } : prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setBusy(false);
    }
  };

  const appliedCount = data?.jobs.filter(j => j.status === "auto_applied" || j.status === "manually_applied").length ?? 0;
  const threshold = data ? Math.round(data.threshold * 100) : 70;

  const visibleJobs = (data?.jobs ?? []).filter(j => {
    const matchesFilter =
      filter === "all" ? true :
      filter === "applied" ? (j.status === "auto_applied" || j.status === "manually_applied") :
      j.status === "not_applied";
    const q = search.toLowerCase();
    const matchesSearch = !q || `${j.job_title} ${j.company_name} ${j.required_skills} ${j.location}`.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  if (loading || computing) {
    return (
      <>
        <PageHeader title="Job Matches" description="Finding compatible jobs using BMH + DP scoring…" />
        <Card className="flex flex-col items-center py-20 text-center">
          <Loader2 size={36} className="animate-spin text-blue-400 mb-4" />
          <p className="text-sm text-slate-400">
            {computing ? "Computing compatibility scores against all jobs…" : "Loading your job matches…"}
          </p>
        </Card>
      </>
    );
  }

  // ── Gate: Must set preferences first ──
  if (preferredCompanies.length < 3) {
    return (
      <>
        <PageHeader title="Job Matches" description="" />
        <Card className="flex flex-col items-center py-20 text-center max-w-2xl mx-auto">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <Lock size={30} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">Set Your Company Preferences First</h2>
          <p className="text-sm text-slate-400 max-w-sm mb-2">
            You must choose your <strong className="text-white">Top 3 preferred companies</strong> before you can view job matches or apply to any jobs.
          </p>
          <p className="text-xs text-slate-500 mb-8">
            This ensures the Gale–Shapley matching algorithm uses your genuine preferences.
          </p>
          <Link
            to="/candidate/preferences"
            className="btn-primary flex items-center gap-2"
          >
            <Settings2 size={16} /> Go to My Preferences <ArrowRight size={15} />
          </Link>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Job Matches"
        description={`${data?.jobs.length ?? 0} jobs scored · ${appliedCount} applied · Auto-apply threshold: ${threshold}%`}
        actions={
          <button
            onClick={() => load(true)}
            disabled={computing}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw size={15} className={computing ? "animate-spin" : ""} />
            Recompute Scores
          </button>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Preferred companies banner */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm">
        <Settings2 size={16} className="shrink-0 text-violet-400 mt-0.5" />
        <div>
          <span className="font-semibold text-violet-300">Your preferred companies:</span>{" "}
          {preferredCompanies.map((c, i) => (
            <span key={c} className="inline-flex items-center gap-1">
              <span className="font-bold text-white">#{i + 1}</span>{" "}
              <span className="text-violet-200">{c}</span>
              {i < 2 && <span className="text-slate-600 mx-1">·</span>}
            </span>
          ))}
          <Link to="/candidate/preferences" className="ml-3 text-xs text-violet-400 underline hover:text-violet-300">Edit</Link>
        </div>
      </div>



      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1 gap-1">
          {(["all", "applied", "not_applied"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filter === f ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:text-white"
              }`}
            >
              {f === "all" ? `All (${data?.jobs.length ?? 0})` :
               f === "applied" ? `Applied (${appliedCount})` :
               `Not Applied (${(data?.jobs.length ?? 0) - appliedCount})`}
            </button>
          ))}
        </div>
        <input
          className="input flex-1 min-w-40 py-2 text-sm"
          placeholder="Search jobs, companies, skills…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {visibleJobs.length === 0 ? (
        <Card className="flex flex-col items-center py-20 text-center">
          <BriefcaseBusiness size={36} className="text-slate-600 mb-4" />
          <p className="text-sm text-slate-400">No jobs match your filter.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleJobs.map(job => (
            <JobCard
              key={job.job_id}
              job={job}
              onApply={handleApply}
              onCancel={handleCancel}
              busy={busy}
            />
          ))}
        </div>
      )}
    </>
  );
}
