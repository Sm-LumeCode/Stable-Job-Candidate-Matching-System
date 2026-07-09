import { useEffect, useState } from "react";
import { BriefcaseBusiness, Building2, Database, Sparkles, Tags, UploadCloud, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { DatabaseStatus } from "../types";
import { getData, request } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { Card } from "../components/ui";

export default function Dashboard() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null), [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  const [recruitmentStatus, setRecruitmentStatus] = useState<string>("OPEN");
  const load = async () => {
    try {
      setStatus(await getData<DatabaseStatus>("/admin/status"));
      const res = await getData<{status: string}>("/settings/status");
      setRecruitmentStatus(res.status);
    } catch {
      setStatus(null);
    }
  };
  useEffect(() => { void load(); }, []);
  const sample = async () => { setLoading(true); setMessage(""); try { const result = await request<{message:string}>("/admin/load-sample-data", { method: "POST" }); setMessage(result.message); load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Load failed"); } finally { setLoading(false); } };
  const closeRecruitment = async () => {
    if (!confirm("Are you sure you want to close recruitment? This will run the final matching algorithm.")) return;
    setLoading(true); setMessage("");
    try {
      await request("/settings/close", { method: "POST" });
      setMessage("Recruitment cycle closed and final allocations computed.");
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to close recruitment");
    } finally { setLoading(false); }
  };
  return <><PageHeader title="Admin Dashboard" description="Prepare recruitment data once, then run a polished resume-first demo." actions={<button className="btn-secondary" onClick={sample} disabled={loading}><Database size={16} />{loading ? "Loading…" : "Load Sample Data"}</button>} />
    {message && <div className="mb-5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-400">{message}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total Jobs" value={status?.total_jobs ?? "—"} icon={BriefcaseBusiness} /><StatCard label="Closed Jobs" value={status?.closed_jobs ?? "—"} icon={BriefcaseBusiness} color="amber" /><StatCard label="Total Capacity" value={status?.total_capacity ?? "—"} icon={Users} /><StatCard label="Taxonomy Terms" value={status?.total_skills ?? "—"} icon={Tags} color="emerald" /></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-3"><Card className="lg:col-span-2"><div className="flex items-start gap-4"><div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 p-3 text-blue-400"><Sparkles /></div><div><h2 className="text-lg font-semibold">Resume Intelligence</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Upload one real resume. StableHire extracts candidate details, normalizes skills against the imported taxonomy, and lets you verify everything before saving.</p><Link className="btn-primary mt-5" to="/resume-upload"><UploadCloud size={17} />Process a Resume</Link></div></div></Card><Card><h2 className="font-semibold">System Readiness</h2><div className="mt-5 space-y-4 text-sm"><div className="flex justify-between"><span className="text-slate-400">Database</span><span className="text-emerald-400">● {status?.database ?? "checking"}</span></div><div className="flex justify-between"><span className="text-slate-400">Admin setup</span><span className={status?.setup_complete ? "text-emerald-400" : "text-amber-400"}>{status?.setup_complete ? "Complete" : "Required"}</span></div><div className="flex justify-between"><span className="text-slate-400">Candidates</span><span>{status?.total_candidates ?? 0}</span></div><div className="flex justify-between border-t border-slate-800 pt-4 mt-4"><span className="text-slate-400">Recruitment</span><span className={recruitmentStatus === "OPEN" ? "text-emerald-400" : "text-red-400"}>{recruitmentStatus}</span></div>{recruitmentStatus === "OPEN" && <button className="w-full mt-2 btn-primary bg-amber-600 hover:bg-amber-500" onClick={closeRecruitment} disabled={loading}>Close Global Recruitment</button>}</div></Card></div>
  </>;
}
