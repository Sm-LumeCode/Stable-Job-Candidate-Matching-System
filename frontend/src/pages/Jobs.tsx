import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Job } from "../types";
import { getData, request } from "../lib/api";
import { ImportDialog } from "../components/ImportDialog";
import { DataTable } from "../components/DataTable";
import { DetailDrawer } from "../components/DetailDrawer";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { Badge, Card } from "../components/ui";
export default function Jobs() {
  const [items, setItems] = useState<Job[]>([]), [query, setQuery] = useState(""), [editing, setEditing] = useState<Job | null>(null);
  const load = () => getData<Job[]>("/jobs").then(setItems).catch(() => setItems([])); useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => items.filter(x => `${x.title} ${x.company_name} ${x.required_skills}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const save = async () => { if (!editing) return; await request(`/jobs/${editing.id}`, { method: "PUT", body: JSON.stringify(editing) }); setEditing(null); load(); };
  const remove = async (job: Job) => { if (confirm(`Delete ${job.title}?`)) { await request(`/jobs/${job.id}`, { method: "DELETE" }); load(); } };
  const field = (label: string, key: keyof Job, type = "text") => <label className="block text-sm"><span className="mb-1 block text-slate-400">{label}</span><input className="input" type={type} value={String(editing?.[key] ?? "")} onChange={e => setEditing(editing ? {...editing, [key]: type === "number" ? Number(e.target.value) : e.target.value} : null)} /></label>;
  return <><PageHeader title="Jobs" description="Import, search, edit, and manage available roles." actions={<ImportDialog resource="jobs" label="Import jobs.csv" onComplete={load} />} /><Card className="p-0"><div className="border-b border-slate-800 p-4"><SearchInput value={query} onChange={setQuery} placeholder="Search jobs, companies, or skills…" /></div><DataTable headers={["ID / Role", "Company", "Skills", "Experience", "Salary", "Capacity", ""]}>{filtered.length ? filtered.map(j => <tr key={j.id} className="hover:bg-slate-800/30"><td className="px-5 py-4"><div className="font-medium">{j.title}</div><div className="text-xs text-slate-500">{j.job_id} · {j.location}</div></td><td className="px-5 py-4">{j.company_name}</td><td className="max-w-72 truncate px-5 py-4 text-slate-400">{j.required_skills}</td><td className="px-5 py-4">{j.min_experience_years}+ yrs</td><td className="px-5 py-4">{j.offered_salary ? `$${j.offered_salary.toLocaleString()}` : "—"}</td><td className="px-5 py-4"><Badge color="emerald">{j.capacity}</Badge></td><td className="px-5 py-4"><div className="flex gap-3"><button onClick={() => setEditing(j)} className="text-blue-400"><Pencil size={16} /></button><button onClick={() => remove(j)} className="text-red-400"><Trash2 size={16} /></button></div></td></tr>) : <tr><td colSpan={7} className="p-12 text-center text-slate-500">No jobs imported yet</td></tr>}</DataTable></Card>
  <DetailDrawer open={!!editing} close={() => setEditing(null)} title="Edit Job"><div className="space-y-4">{field("Job ID","job_id")}{field("Title","title")}{field("Company","company_name")}{field("Required skills","required_skills")}{field("Minimum experience","min_experience_years","number")}{field("Offered salary","offered_salary","number")}{field("Location","location")}{field("Capacity","capacity","number")}<button className="btn-primary w-full" onClick={save}>Save Changes</button></div></DetailDrawer></>;
}
