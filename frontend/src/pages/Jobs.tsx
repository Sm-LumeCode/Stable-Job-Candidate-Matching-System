import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, ArrowDown } from "lucide-react";
import type { Job } from "../types";
import { getData, request } from "../lib/api";
import { ImportDialog } from "../components/ImportDialog";
import { DataTable } from "../components/DataTable";
import { DetailDrawer } from "../components/DetailDrawer";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { Badge, Card } from "../components/ui";

export default function Jobs() {
  const [items, setItems] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Job | null>(null);

  const load = () => getData<Job[]>("/jobs").then(setItems).catch(() => setItems([]));
  useEffect(() => { void load(); }, []);

  // Dual-field search: matches on original skills AND normalized skills
  const filtered = useMemo(() =>
    items.filter(x => {
      const q = query.toLowerCase();
      return `${x.title} ${x.company_name} ${x.required_skills} ${x.normalized_required_skills}`.toLowerCase().includes(q);
    }),
    [items, query]
  );

  const save = async () => {
    if (!editing) return;
    await request(`/jobs/${editing.id}`, { method: "PUT", body: JSON.stringify(editing) });
    setEditing(null);
    load();
  };

  const remove = async (job: Job) => {
    if (confirm(`Delete ${job.title}?`)) {
      await request(`/jobs/${job.id}`, { method: "DELETE" });
      load();
    }
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
        title="Job Management"
        description="Import, search, edit, and manage available roles. Skills are dual-indexed for normalized search."
        actions={<ImportDialog resource="jobs" label="Import jobs.csv" onComplete={load} />}
      />
      <Card className="p-0">
        <div className="border-b border-slate-800 p-4">
          <SearchInput value={query} onChange={setQuery} placeholder='Search by title, company, skills… try "ML" to find "Machine Learning"' />
        </div>
        <DataTable headers={["ID / Role", "Company", "Original Skills", "Normalized Skills", "Experience", "Salary", "Capacity", ""]}>
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
              <td className="px-5 py-4">{j.offered_salary ? `$${j.offered_salary.toLocaleString()}` : "—"}</td>
              <td className="px-5 py-4"><Badge color="emerald">{j.capacity}</Badge></td>
              <td className="px-5 py-4">
                <div className="flex gap-3">
                  <button onClick={() => setEditing(j)} className="text-blue-400"><Pencil size={16} /></button>
                  <button onClick={() => remove(j)} className="text-red-400"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          )) : (
            <tr><td colSpan={8} className="p-12 text-center text-slate-500">No jobs imported yet</td></tr>
          )}
        </DataTable>
      </Card>

      <DetailDrawer open={!!editing} close={() => setEditing(null)} title="Edit Job">
        <div className="space-y-4">
          {field("Job ID", "job_id")}
          {field("Title", "title")}
          {field("Company", "company_name")}
          {field("Required skills", "required_skills")}
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
          {field("Minimum experience", "min_experience_years", "number")}
          {field("Offered salary", "offered_salary", "number")}
          {field("Location", "location")}
          {field("Capacity", "capacity", "number")}
          <button className="btn-primary w-full" onClick={save}>Save Changes</button>
        </div>
      </DetailDrawer>
    </>
  );
}
