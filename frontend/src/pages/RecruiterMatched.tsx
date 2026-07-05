import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "../components/PageHeader";
import { Card, Badge } from "../components/ui";
import { getData } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { type Job } from "../types";
import {
  Sparkles, ChevronDown, ChevronUp, LoaderCircle,
  UserRound, Briefcase, RefreshCw
} from "lucide-react";

// ─── Inline ExplainPanel (reuses Feature 8 logic, no import coupling) ──────────
function ExplainPanel({ candidateId, jobId }: { candidateId: string; jobId: string }) {
  const [data, setData] = useState<Record<string, { raw_score: number; weight: number; contribution: number }> | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    if (data) { setOpen(true); return; }   // already fetched
    setLoading(true);
    try {
      const res = await getData<Record<string, { raw_score: number; weight: number; contribution: number }>>(
        `/matching/explain/${candidateId}/${jobId}`
      );
      setData(res);
      setOpen(true);
    } catch {
      /* silently ignore — backend may not have data for this pair */
    } finally {
      setLoading(false);
    }
  };

  const COLORS: Record<string, string> = {
    exact_match: "bg-blue-500",
    dp_similarity: "bg-violet-500",
    experience: "bg-emerald-500",
    salary: "bg-amber-500",
    location: "bg-rose-500",
  };

  return (
    <div className="mt-3 border-t border-slate-700/40 pt-3">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
      >
        {loading
          ? <LoaderCircle size={12} className="animate-spin" />
          : open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? "Hide score breakdown" : "Why this match?"}
      </button>

      {open && data && (
        <div className="mt-3 space-y-2.5 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Combined Score Breakdown</p>
          {Object.entries(data).map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span className="capitalize">{key.replace(/_/g, " ")}
                  <span className="text-slate-500 ml-1">({(val.weight * 100).toFixed(0)}%)</span>
                </span>
                <span>
                  <span className="text-slate-400">{val.raw_score.toFixed(2)}</span>
                  <span className="ml-2 text-emerald-400 font-medium">+{val.contribution.toFixed(3)}</span>
                </span>
              </div>
              <div className="w-full rounded-full bg-slate-900 h-1.5">
                <div
                  className={`${COLORS[key] ?? "bg-slate-500"} h-1.5 rounded-full transition-all`}
                  style={{ width: `${Math.min(100, val.raw_score * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Candidate row ────────────────────────────────────────────────────────────
function CandidateRow({
  candidate, rank, jobId,
}: {
  candidate: {
    candidate_id: string; name: string; email?: string;
    experience_years: number; desired_role: string;
    normalized_skills: string; total_score: number;
  };
  rank: number;
  jobId: string;
}) {
  const pct = Math.round(candidate.total_score * 100);
  const scoreColor = pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Rank badge */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{candidate.name}</span>
            <Badge color="blue">{candidate.candidate_id}</Badge>
            {candidate.desired_role && (
              <span className="text-xs text-slate-400">{candidate.desired_role}</span>
            )}
          </div>
          {candidate.email && (
            <div className="text-xs text-slate-500 mt-0.5">{candidate.email}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {(candidate.normalized_skills || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 6).map(s => (
              <span key={s} className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{s}</span>
            ))}
          </div>
        </div>

        {/* Score pill */}
        <div className="flex-shrink-0 text-right">
          <div className={`text-2xl font-bold font-mono ${scoreColor}`}>{pct}%</div>
          <div className="text-[10px] text-slate-500">{candidate.experience_years}yr exp</div>
        </div>
      </div>

      <ExplainPanel candidateId={candidate.candidate_id} jobId={jobId} />
    </div>
  );
}

// ─── Job panel ────────────────────────────────────────────────────────────────
function JobMatchPanel({ job }: { job: Job }) {
  const [result, setResult] = useState<{ job_title: string; company: string; candidates: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    if (result) { setExpanded(e => !e); return; }
    setLoading(true);
    setExpanded(true);
    try {
      const data = await getData<any>(`/matching/job-candidates/${job.job_id}`);
      setResult(data);
    } catch {
      setResult({ job_title: job.title, company: job.company_name, candidates: [] });
    } finally {
      setLoading(false);
    }
  }, [job, result]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getData<any>(`/matching/job-candidates/${job.job_id}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      {/* Header — always visible */}
      <button
        onClick={load}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-500/15 p-2.5">
            <Briefcase size={18} className="text-violet-400" />
          </div>
          <div>
            <div className="font-semibold text-white">{job.title}</div>
            <div className="text-xs text-slate-400">{job.company_name} · {job.location} · Capacity: {job.capacity}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge color="violet">{job.job_id}</Badge>
          {loading
            ? <LoaderCircle size={16} className="animate-spin text-slate-400" />
            : expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {/* Candidate list */}
      {expanded && (
        <div className="border-t border-slate-800 p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500 gap-2">
              <LoaderCircle size={18} className="animate-spin" /> Computing ranked candidates…
            </div>
          ) : !result || result.candidates.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-slate-500 text-sm gap-2">
              <UserRound size={32} className="opacity-30" />
              No candidates scored above threshold for this posting.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  {result.candidates.length} candidate{result.candidates.length !== 1 ? "s" : ""} ranked
                </span>
                <button onClick={refresh} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>
              <div className="space-y-3">
                {result.candidates.map((c, i) => (
                  <CandidateRow key={c.candidate_id} candidate={c} rank={i + 1} jobId={job.job_id} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RecruiterMatched() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData<Job[]>("/jobs")
      .then(all => {
        // Filter to jobs belonging to the logged-in recruiter (same ownership
        // pattern as RecruiterJobs — recruiter_id matches user.user_id)
        const mine = all.filter(j => j.recruiter_id === user?.user_id);
        setJobs(mine);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <PageHeader
        title="Matched Candidates"
        description="Candidates ranked by combined compatibility score for each of your job postings."
      />

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-slate-500">
          <LoaderCircle size={20} className="animate-spin" /> Loading your jobs…
        </div>
      ) : jobs.length === 0 ? (
        <Card className="flex flex-col items-center py-20 text-center">
          <div className="mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10">
            <Sparkles size={36} className="text-violet-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">No Jobs Posted Yet</h2>
          <p className="mt-3 max-w-sm text-sm text-slate-400">
            Post your first job from the <strong>My Jobs</strong> section, then return here to see ranked candidates.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Click any job card to load the ranked candidate list. Expand "Why this match?" under each candidate for the component score breakdown.
          </p>
          {jobs.map(j => (
            <JobMatchPanel key={j.job_id} job={j} />
          ))}
        </div>
      )}
    </>
  );
}
