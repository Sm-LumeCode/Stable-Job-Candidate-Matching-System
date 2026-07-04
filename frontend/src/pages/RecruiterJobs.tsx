import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Plus, ArrowRight, ArrowDown } from "lucide-react";
import type { Job } from "../types";
import { getData, request } from "../lib/api";
import { DataTable } from "../components/DataTable";
import { DetailDrawer } from "../components/DetailDrawer";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { Badge, Card } from "../components/ui";

const blankJob: Omit<Job, "id" | "recruiter_id"> = {
  job_id: "", title: "", company_name: "", required_skills: "",
  normalized_required_skills: "", min_experience_years: 0,
  offered_salary: undefined, location: "", capacity: 1, description: "",
};

export default function RecruiterJobs() {
  const [items, setItems] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Partial<Job> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => getData<Job[]>("/jobs").then(setItems).catch(() => setItems([]));
  useEffect(() => { void load(); }, []);

  // Normalized search: search in both required_skills AND normalized_required_skills
  const filtered = useMemo(() =>
    items.filter(x => {
      const q = query.toLowerCase();
      return `${x.title} ${x.company_name} ${x.required_skills} ${x.normalized_required_skills}`.toLowerCase().includes(q);
    }),
    [items, query]
  );

  const openNew = () => { setEditing({ ...blankJob }); setIsNew(true); setError(""); };
  const openEdit = (j: Job) => { setEditing({ ...j }); setIsNew(false); setError(""); };

  const save = async () => {
    if (!editing) return;
    setBusy(true); setError("");
    try {
      if (isNew) {
        await request("/jobs", { method: "POST", body: JSON.stringify(editing) });
      } else {
        await request(`/jobs/${editing.id}`, { method: "PUT", body: JSON.stringify(editing) });
      }
      setEditing(null); load();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const remove = async (job: Job) => {
    if (!confirm(`Delete "${job.title}"?`)) return;
    await request(`/jobs/${job.id}`, { method: "DELETE" });
    load();
  };

  const field = (label: string, key: keyof Job, type = "text") => (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-400">{label}</span>
      <input
        className="input"
        type={type}
        value={String(editing?.[key] ?? "")}
        onChange={e => setEditing(editing ? { ...editing, [key]: type === "number" ? Number(e.target.value) : e.target.value } : null)}
      />
    </label>
  );

  return (
    <>
      <PageHeader
        title="My Jobs"
        description="Manage your posted positions. Skills are automatically normalized using the taxonomy."
        actions={<button className="btn-primary" onClick={openNew}><Plus size={16} /> Post New Job</button>}
      />
      <Card className="p-0">
        <div className="border-b border-slate-800 p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search by title, company, skills, or canonical terms…" />
        </div>
        <DataTable headers={["ID / Role", "Company", "Original Skills", "Normalized Skills", "Exp", "Capacity", ""]}>
          {filtered.length ? filtered.map(j => (
            <tr key={j.id} className="hover:bg-slate-800/30">
              <td className="px-5 py-4">
                <div className="font-medium">{j.title}</div>
                <div className="text-xs text-slate-500">{j.job_id} · {j.location}</div>
              </td>
              <td className="px-5 py-4">{j.company_name}</td>
              <td className="max-w-48 truncate px-5 py-4 text-slate-400 text-xs">{j.required_skills || "—"}</td>
              <td className="max-w-48 truncate px-5 py-4 text-emerald-400 text-xs">{j.normalized_required_skills || "—"}</td>
              <td className="px-5 py-4">{j.min_experience_years}+ yrs</td>
              <td className="px-5 py-4"><Badge color="emerald">{j.capacity}</Badge></td>
              <td className="px-5 py-4">
                <div className="flex gap-3">
                  <button onClick={() => openEdit(j)} className="text-blue-400"><Pencil size={16} /></button>
                  <button onClick={() => remove(j)} className="text-red-400"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          )) : (
            <tr><td colSpan={7} className="p-12 text-center text-slate-500">No jobs yet. Post your first job!</td></tr>
          )}
        </DataTable>
      </Card>

      <DetailDrawer open={!!editing} close={() => setEditing(null)} title={isNew ? "Post New Job" : "Edit Job"}>
        <div className="space-y-4">
          {field("Job ID", "job_id")}
          {field("Title", "title")}
          {field("Company", "company_name")}
          <label className="block text-sm">
            <span className="mb-1 block text-slate-400">Required Skills</span>
            <textarea
              className="input min-h-20 py-2.5"
              placeholder="Python, Machine Learning, SQL…"
              value={String(editing?.required_skills ?? "")}
              onChange={e => setEditing(editing ? { ...editing, required_skills: e.target.value } : null)}
            />
            <span className="mt-1 block text-xs text-slate-500">Comma-separated. Will be auto-normalized on save.</span>
          </label>
          {editing?.normalized_required_skills && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                <ArrowDown size={12} /> Normalized (canonical)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {editing.normalized_required_skills.split(",").map(s => s.trim()).filter(Boolean).map(s => (
                  <span key={s} className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">{s}</span>
                ))}
              </div>
            </div>
          )}
          {field("Minimum experience (yrs)", "min_experience_years", "number")}
          {field("Offered salary ($)", "offered_salary", "number")}
          {field("Location", "location")}
          {field("Capacity", "capacity", "number")}
          {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">{error}</div>}
          <button className="btn-primary w-full" onClick={save} disabled={busy}>
            {busy ? "Saving…" : isNew ? "Post Job" : "Save Changes"}
          </button>
        </div>
      </DetailDrawer>
    </>
  );
}
