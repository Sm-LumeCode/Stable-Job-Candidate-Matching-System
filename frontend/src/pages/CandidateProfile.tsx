import { useEffect, useState } from "react";
import { User, ArrowDown } from "lucide-react";
import type { Candidate } from "../types";
import { getData } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Card, Badge } from "../components/ui";

export default function CandidateProfile() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData<Candidate[]>("/candidates")
      .then(data => { setCandidates(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Show most recent candidate (for a logged-in candidate we'd filter by their profile;
  // for now show the most recently created profile)
  const profile = candidates[0] ?? null;

  if (loading) {
    return (
      <>
        <PageHeader title="My Profile" description="View your saved candidate profile and normalized skills." />
        <Card className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </Card>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <PageHeader title="My Profile" description="View your saved candidate profile and normalized skills." />
        <Card className="flex flex-col items-center py-20 text-center">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-slate-800">
            <User size={36} className="text-slate-500" />
          </div>
          <h2 className="text-lg font-semibold text-white">No Profile Found</h2>
          <p className="mt-2 text-sm text-slate-400">Upload a resume first to create your candidate profile.</p>
        </Card>
      </>
    );
  }

  const originalSkills = profile.skills ? profile.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
  const normalizedSkills = profile.normalized_skills ? profile.normalized_skills.split(",").map(s => s.trim()).filter(Boolean) : [];

  return (
    <>
      <PageHeader title="My Profile" description={`Candidate ID: ${profile.candidate_id}`} />
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2 space-y-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <User size={18} className="text-blue-400" /> Profile Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            {([
              ["Full Name", profile.name],
              ["Email", profile.email ?? "—"],
              ["Phone", profile.phone ?? "—"],
              ["Desired Role", profile.desired_role ?? "—"],
              ["Preferred Location", profile.preferred_location ?? "—"],
              ["Experience", `${profile.experience_years} years`],
              ["Expected Salary", profile.desired_salary ? `$${profile.desired_salary.toLocaleString()}` : "—"],
              ["Education", profile.education ?? "—"],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <div className="text-slate-500">{label}</div>
                <div className="mt-0.5 text-white">{value}</div>
              </div>
            ))}
          </div>

          {/* Skills section */}
          <div className="pt-2 border-t border-slate-800">
            <h3 className="mb-3 text-sm font-medium text-slate-400">Skills (from Resume)</h3>
            {originalSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {originalSkills.map(s => (
                  <span key={s} className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">{s}</span>
                ))}
              </div>
            ) : <p className="text-xs text-slate-500">No skills recorded</p>}
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <ArrowDown size={14} /> <span className="text-xs">Normalized via taxonomy</span>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <h3 className="mb-3 text-sm font-medium text-emerald-400">Normalized Skills (Canonical)</h3>
            {normalizedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {normalizedSkills.map(s => (
                  <span key={s} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">{s}</span>
                ))}
              </div>
            ) : <p className="text-xs text-slate-500">No normalized skills yet</p>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-white">Resume Info</h2>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-slate-500">Filename</div>
              <div className="mt-0.5 text-white text-xs break-all">{profile.resume_filename ?? "—"}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-2">Preview</div>
              <div className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-400 whitespace-pre-wrap">
                {profile.resume_text || "No text extracted"}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
