import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Skill } from "../types";
import { getData, request } from "../lib/api";
import { ImportDialog } from "../components/ImportDialog";
import { DataTable } from "../components/DataTable";
import { DetailDrawer } from "../components/DetailDrawer";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { Badge, Card } from "../components/ui";
export default function Skills() {
  const [items, setItems] = useState<Skill[]>([]), [query, setQuery] = useState(""), [editing, setEditing] = useState<Skill | null>(null);
  const load = () => getData<Skill[]>("/skills").then(setItems).catch(() => setItems([])); useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => items.filter(x => `${x.skill_term} ${x.canonical_skill} ${x.category}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const save = async () => { if (!editing) return; await request(`/skills/${editing.id}`, { method: "PUT", body: JSON.stringify(editing) }); setEditing(null); load(); };
  const remove = async (s: Skill) => { if (confirm(`Delete taxonomy term “${s.skill_term}”?`)) { await request(`/skills/${s.id}`, { method: "DELETE" }); load(); } };
  return <><PageHeader title="Skill Taxonomy" description="Normalize resume and job language into matching-ready skills." actions={<ImportDialog resource="skills" label="Import skills_taxonomy.csv" onComplete={load} />} /><Card className="p-0"><div className="border-b border-slate-800 p-4"><SearchInput value={query} onChange={setQuery} placeholder="Search terms, canonical skills, or categories…" /></div><DataTable headers={["Raw Term", "Canonical Skill", "Category", ""]}>{filtered.length ? filtered.map(s => <tr key={s.id}><td className="px-5 py-4 font-medium">{s.skill_term}</td><td className="px-5 py-4 text-emerald-400">{s.canonical_skill}</td><td className="px-5 py-4"><Badge>{s.category}</Badge></td><td className="px-5 py-4"><div className="flex gap-3"><button onClick={() => setEditing(s)} className="text-blue-400"><Pencil size={16} /></button><button onClick={() => remove(s)} className="text-red-400"><Trash2 size={16} /></button></div></td></tr>) : <tr><td colSpan={4} className="p-12 text-center text-slate-500">No taxonomy terms imported yet</td></tr>}</DataTable></Card>
  <DetailDrawer open={!!editing} close={() => setEditing(null)} title="Edit Taxonomy Term"><div className="space-y-4">{(["skill_term","canonical_skill","category"] as const).map(k => <label className="block text-sm" key={k}><span className="mb-1 block capitalize text-slate-400">{k.replace("_"," ")}</span><input className="input" value={editing?.[k] ?? ""} onChange={e => setEditing(editing ? {...editing,[k]:e.target.value}:null)} /></label>)}<button className="btn-primary w-full" onClick={save}>Save Changes</button></div></DetailDrawer></>;
}
