import { useState, useEffect } from "react";
import {
  Briefcase, Users, Loader2, UserRound, ChevronDown, ChevronUp,
  Building2, MapPin, Star,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card, Badge } from "../components/ui";
import { getData } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Job } from "../types";

/* ── Applicant row ──────────────────────────────────────────────────────────── */
function ApplicantRow({
  applicant,
  rank,
}: {
  applicant: {
    candidate_id: string;
    name: string;
    email?: string;
    experience_years: number;
    desired_role: string;
    normalized_skills: string;
    compatibility_score: number;
    application_status: string;
  };
  rank: number;
}) {
  const pct = Math.round(applicant.compatibility_score * 100);
  const scoreColor = pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-blue-400" : pct >= 30 ? "text-amber-400" : "text-slate-400";

  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors">
      {/* Rank */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
        {rank}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-white text-sm">{applicant.name}</span>
          <Badge color="blue">{applicant.candidate_id}</Badge>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            applicant.application_status === "auto_applied"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-blue-500/30 bg-blue-500/10 text-blue-400"
          }`}>
            {applicant.application_status === "auto_applied" ? "Auto Applied" : "Applied"}
          </span>
        </div>
        {applicant.email && (
          <div className="text-xs text-slate-500 mb-2">{applicant.email}</div>
        )}
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-xs text-slate-400">{applicant.experience_years} yrs exp</span>
          {applicant.desired_role && (
            <span className="text-xs text-slate-500">· {applicant.desired_role}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {(applicant.normalized_skills || "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 6).map(s => (
            <span key={s} className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{s}</span>
          ))}
        </div>
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <div className={`text-2xl font-bold font-mono leading-none ${scoreColor}`}>{pct}%</div>
        <div className="text-[10px] text-slate-500 mt-0.5">match</div>
      </div>
    </div>
  );
}

/* ── Job applicants panel ────────────────────────────────────────────────────── */
function JobApplicantsPanel({ job }: { job: Job }) {
  const [result, setResult] = useState<{
    job_title: string;
    company: string;
    applicant_count: number;
    applicants: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const toggle = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (result) return; // already loaded
    setLoading(true);
    try {
      const data = await getData<any>(`/applications/for-job/${job.job_id}`);
      setResult(data);
    } catch {
      setResult({ job_title: job.title, company: job.company_name, applicant_count: 0, applicants: [] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/15 p-2.5">
            <Briefcase size={18} className="text-blue-400" />
          </div>
          <div>
            <div className="font-semibold text-white">{job.title}</div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1"><Building2 size={10} />{job.company_name}</span>
              {job.location && <span className="flex items-center gap-1"><MapPin size={10} />{job.location}</span>}
              <span className="flex items-center gap-1"><Star size={10} />Cap. {job.capacity}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge color="blue">{job.job_id}</Badge>
          {result && (
            <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
              <Users size={11} /> {result.applicant_count}
            </span>
          )}
          {loading
            ? <Loader2 size={16} className="animate-spin text-slate-400" />
            : expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {/* Applicant list */}
      {expanded && (
        <div className="border-t border-slate-800 p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <Loader2 size={18} className="animate-spin" /> Loading applicants…
            </div>
          ) : !result || result.applicants.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-500 text-sm">
              <UserRound size={32} className="opacity-30" />
              No candidates have applied for this position yet.
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                {result.applicant_count} applicant{result.applicant_count !== 1 ? "s" : ""} · ranked by compatibility
              </p>
              {result.applicants.map((a, i) => (
                <ApplicantRow key={a.candidate_id} applicant={a} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function RecruiterApplicants() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData<Job[]>("/jobs")
      .then(all => setJobs(all.filter(j => j.recruiter_id === user?.user_id)))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <>
      <PageHeader
        title="Applicants"
        description="Candidates who have applied for your jobs — ranked by compatibility score."
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
          <Loader2 size={20} className="animate-spin" /> Loading your jobs…
        </div>
      ) : jobs.length === 0 ? (
        <Card className="flex flex-col items-center py-20 text-center">
          <div className="mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
            <Briefcase size={36} className="text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">No Jobs Posted Yet</h2>
          <p className="mt-3 max-w-sm text-sm text-slate-400">
            Post your first job from <strong>My Jobs</strong>, then candidates will be able to apply.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Click any job to see candidates who applied. Only actively-applied candidates are shown — cancelled applications are excluded.
          </p>
          {jobs.map(j => (
            <JobApplicantsPanel key={j.job_id} job={j} />
          ))}
        </div>
      )}
    </>
  );
}
