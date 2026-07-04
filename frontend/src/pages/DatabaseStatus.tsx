import { useEffect, useState } from "react";
import { CheckCircle2, Database, HardDrive, RefreshCw, ShieldCheck } from "lucide-react";
import type { DatabaseStatus as Status } from "../types";
import { getData } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { Card } from "../components/ui";
export default function DatabaseStatus() {
  const [status,setStatus]=useState<Status|null>(null); const load=()=>getData<Status>("/admin/status").then(setStatus); useEffect(() => { void load(); },[]);
  return <><PageHeader title="Database Status" description="Operational readiness of the StableHire data layer." actions={<button className="btn-secondary" onClick={load}><RefreshCw size={16}/>Refresh</button>}/><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Jobs Stored" value={status?.total_jobs??"—"} icon={Database}/><StatCard label="Skills Stored" value={status?.total_skills??"—"} icon={HardDrive} color="emerald"/><StatCard label="Candidates Stored" value={status?.total_candidates??"—"} icon={ShieldCheck}/></div><Card className="mt-6"><div className="flex items-center justify-between border-b border-slate-800 pb-5"><div><h2 className="font-semibold">SQLite Connection</h2><p className="mt-1 text-sm text-slate-500">Persistent local application database</p></div><span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-400"><CheckCircle2 size={16}/>{status?.database??"Checking"}</span></div><div className="grid gap-5 pt-5 text-sm sm:grid-cols-2"><div className="rounded-lg bg-slate-950 p-4"><div className="text-slate-500">Admin setup</div><div className="mt-2 font-medium">{status?.setup_complete?"Complete and ready":"Awaiting jobs and taxonomy"}</div></div><div className="rounded-lg bg-slate-950 p-4"><div className="text-slate-500">Total hiring capacity</div><div className="mt-2 font-medium">{status?.total_capacity??0} openings</div></div></div></Card></>;
}
