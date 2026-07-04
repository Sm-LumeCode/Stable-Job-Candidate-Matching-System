import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, LoaderCircle, ScanText, UploadCloud } from "lucide-react";
import type { Candidate } from "../types";
import { request } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Badge, Card } from "../components/ui";

type Draft = Omit<Candidate, "id" | "candidate_id">;
type ParseResult = { filename: string; text: string; extracted: Draft & { warnings: string[] }; duplicate: { candidate_id: string; name: string } | null };

const blank: Draft = { name: "", email: "", phone: "", skills: "", experience_years: 0, desired_role: "", desired_salary: undefined, preferred_location: "", education: "", resume_filename: "", resume_text: "" };

export default function ResumeUpload() {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"upload"|"review"|"saved">("upload"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>(blank), [warnings, setWarnings] = useState<string[]>([]), [duplicate, setDuplicate] = useState<ParseResult["duplicate"]>(null), [saved, setSaved] = useState<Candidate | null>(null);
  const process = async (file?: File) => {
    if (!file) return; setBusy(true); setError("");
    const body = new FormData(); body.append("file", file);
    try {
      const result = await request<ParseResult>("/resumes/parse", { method: "POST", body });
      const { warnings: notes, ...fields } = result.extracted;
      setDraft({ ...fields, resume_filename: result.filename, resume_text: result.text }); setWarnings(notes); setDuplicate(result.duplicate); setPhase("review");
    } catch (e) { setError(e instanceof Error ? e.message : "Resume processing failed"); }
    finally { setBusy(false); }
  };
  const drop = (e: DragEvent) => { e.preventDefault(); process(e.dataTransfer.files[0]); };
  const change = (key: keyof Draft) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft({...draft, [key]: e.target.type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value});
  const save = async () => { setBusy(true); setError(""); try { const candidate = await request<Candidate>("/candidates", { method: "POST", body: JSON.stringify(draft) }); setSaved(candidate); setPhase("saved"); } catch (e) { setError(e instanceof Error ? e.message : "Could not save candidate"); } finally { setBusy(false); } };
  const restart = () => { setPhase("upload"); setDraft(blank); setSaved(null); setDuplicate(null); setWarnings([]); setError(""); };
  return <><PageHeader title="Resume Intelligence" description="Turn an unstructured resume into a matching-ready candidate profile." />
    {phase === "upload" && <Card className="mx-auto max-w-4xl p-8"><input ref={input} hidden type="file" accept=".pdf,.docx,application/pdf" onChange={e => process(e.target.files?.[0])} /><div onDragOver={e => e.preventDefault()} onDrop={drop} className="grid min-h-[380px] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 p-8 text-center transition hover:border-blue-500/60 hover:bg-blue-500/[.03]" onClick={() => input.current?.click()}><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 text-blue-400">{busy ? <LoaderCircle className="animate-spin" size={30} /> : <UploadCloud size={30} />}</div><h2 className="mt-5 text-xl font-semibold">{busy ? "Reading resume…" : "Drop a resume here"}</h2><p className="mt-2 text-sm text-slate-400">PDF or DOCX · up to 8 MB</p><button className="btn-primary mt-6" disabled={busy}>Choose Resume</button><div className="mt-7 flex flex-wrap justify-center gap-2"><Badge>Multi-column extraction</Badge><Badge color="emerald">Taxonomy skill detection</Badge><Badge>Manual review</Badge></div></div></div>{error && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}</Card>}
    {phase === "review" && <div className="grid gap-5 xl:grid-cols-3"><Card className="xl:col-span-2"><div className="mb-6 flex items-center gap-3"><div className="rounded-lg bg-blue-500/10 p-2 text-blue-400"><ScanText /></div><div><h2 className="font-semibold">Review Extracted Profile</h2><p className="text-xs text-slate-500">Correct anything before saving to the candidate database.</p></div></div>
      {(warnings.length > 0 || duplicate) && <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300"><div className="flex gap-2"><AlertTriangle size={17} className="shrink-0" /><div>{duplicate && <p className="mb-1">Possible duplicate: {duplicate.name} ({duplicate.candidate_id})</p>}{warnings.map(w => <p key={w}>• {w}</p>)}</div></div></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {([["Full name","name"],["Email","email"],["Phone","phone"],["Preferred role","desired_role"],["Preferred location","preferred_location"],["Experience (years)","experience_years"],["Expected salary","desired_salary"],["Education","education"]] as [string,keyof Draft][]).map(([label,key]) => <label key={key} className="block text-sm"><span className="mb-1.5 block text-slate-400">{label}</span><input className="input" type={key === "experience_years" || key === "desired_salary" ? "number":"text"} value={String(draft[key] ?? "")} onChange={change(key)} /></label>)}
        <label className="block text-sm sm:col-span-2"><span className="mb-1.5 block text-slate-400">Normalized skills</span><textarea className="input min-h-24 py-3" value={draft.skills} onChange={change("skills")} /></label>
      </div>{error && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}<div className="mt-6 flex justify-end gap-3"><button className="btn-secondary" onClick={restart}>Start Over</button><button className="btn-primary" disabled={busy || !draft.name.trim()} onClick={save}>{busy ? "Saving…" : "Save Candidate"}</button></div>
    </Card><Card><div className="flex items-center gap-2 text-sm font-medium"><FileText size={17} className="text-emerald-400" />{draft.resume_filename}</div><p className="mt-4 text-xs uppercase tracking-wider text-slate-500">Extracted text preview</p><div className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-400">{draft.resume_text}</div></Card></div>}
    {phase === "saved" && <Card className="mx-auto max-w-xl py-14 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-400"><CheckCircle2 size={34} /></div><h2 className="mt-5 text-2xl font-semibold">Candidate Ready</h2><p className="mt-2 text-slate-400">{saved?.name} was saved as <span className="text-emerald-400">{saved?.candidate_id}</span> and is ready for the future matching pipeline.</p><button className="btn-primary mt-7" onClick={restart}>Process Another Resume</button></Card>}
  </>;
}
