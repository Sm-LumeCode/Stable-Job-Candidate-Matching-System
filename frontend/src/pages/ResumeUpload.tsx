import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ArrowDown, BrainCircuit, CheckCircle2,
  FileText, LoaderCircle, Pencil, RefreshCw, ScanText, UploadCloud,
} from "lucide-react";
import type { Candidate, SkillMetadata } from "../types";
import { getData, request } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Badge, Card } from "../components/ui";

type Draft = Omit<Candidate, "id" | "candidate_id" | "normalized_skills" | "ai_extraction_metadata">;
type ParseResult = {
  filename: string;
  text: string;
  extracted: Draft & { warnings: string[]; merged_skills_temp: string; ai_extraction_metadata: string };
  duplicate: { candidate_id: string; name: string } | null;
};

const blank: Draft = {
  name: "", email: "", phone: "", skills: "", ai_skills: "", experience_years: 0,
  desired_role: "", desired_salary: undefined, preferred_location: "",
  education: "", resume_filename: "", resume_text: "",
};

/* ──────────────────────────────────────────────── */

export default function ResumeUpload() {
  const input = useRef<HTMLInputElement>(null);
  const updateInput = useRef<HTMLInputElement>(null);

  // "checking" → loading from server
  // "existing" → candidate profile already saved, show view
  // "upload"   → no profile yet, show drop zone
  // "review"   → parsed new resume, show editable form
  // "saved"    → just saved/updated, show success
  const [phase, setPhase] = useState<"checking" | "existing" | "upload" | "review" | "saved">("checking");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>(blank);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [duplicate, setDuplicate] = useState<ParseResult["duplicate"]>(null);
  const [savedCandidate, setSavedCandidate] = useState<Candidate | null>(null);
  const [metadata, setMetadata] = useState<SkillMetadata[]>([]);
  const [mergedSkills, setMergedSkills] = useState("");
  const [isUpdating, setIsUpdating] = useState(false); // true if updating an existing profile

  // ── On mount: check if this candidate already has a saved profile ──
  useEffect(() => {
    getData<Candidate>("/resumes/my")
      .then((c) => {
        setSavedCandidate(c);
        setPhase("existing");
      })
      .catch(() => {
        setPhase("upload");
      });
  }, []);

  // ── Parse a new resume file ──
  const process = async (file?: File, updating = false) => {
    if (!file) return;
    setBusy(true); setError("");
    const body = new FormData();
    body.append("file", file);
    try {
      const endpoint = updating ? "/resumes/my" : "/resumes/parse";
      const method = updating ? "PUT" : "POST";
      const result = await request<ParseResult>(endpoint, { method, body });
      const { warnings: notes, merged_skills_temp, ai_extraction_metadata, ...fields } = result.extracted;
      setDraft({ ...fields, resume_filename: result.filename, resume_text: result.text });
      setWarnings(notes || []);
      setDuplicate(result.duplicate ?? null);
      setMergedSkills(merged_skills_temp || "");
      try { setMetadata(JSON.parse(ai_extraction_metadata || "[]")); }
      catch { setMetadata([]); }
      setIsUpdating(updating);
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resume processing failed");
    } finally {
      setBusy(false);
    }
  };

  const drop = (e: DragEvent) => { e.preventDefault(); process(e.dataTransfer.files[0], isUpdating); };
  const change = (key: keyof Draft) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft({ ...draft, [key]: e.target.type === "number" ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value });

  // ── Save brand-new candidate OR commit an update ──
  const save = async () => {
    setBusy(true); setError("");
    try {
      if (isUpdating) {
        // The update already happened in process(). Just reload the profile and show existing view.
        const updated = await getData<Candidate>("/resumes/my");
        setSavedCandidate(updated);
        setPhase("saved");
      } else {
        const payload = { ...draft, ai_extraction_metadata: JSON.stringify(metadata) };
        const candidate = await request<Candidate>("/candidates", { method: "POST", body: JSON.stringify(payload) });
        setSavedCandidate(candidate);
        setPhase("saved");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save candidate");
    } finally {
      setBusy(false);
    }
  };

  const confidenceBadge = (c: number) => {
    if (c >= 0.9) return <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400">High</span>;
    if (c >= 0.7) return <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">Med</span>;
    return <span className="ml-2 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">Low</span>;
  };

  const SkillPill = ({ label, color = "slate" }: { label: string; color?: "slate" | "emerald" | "blue" }) =>
    <span className={`rounded-md border px-2 py-1 text-xs ${
      color === "emerald" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : color === "blue" ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
      : "border-slate-700 bg-slate-800 text-slate-300"
    }`}>{label}</span>;

  const splitSkills = (s?: string) => (s || "").split(",").map(x => x.trim()).filter(Boolean);

  /* ────────────── PHASE: Checking ────────────── */
  if (phase === "checking") return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoaderCircle className="animate-spin text-slate-500" size={32} />
    </div>
  );

  /* ────────────── PHASE: Existing Profile View ────────────── */
  if (phase === "existing" && savedCandidate) {
    const aiMeta: SkillMetadata[] = (() => {
      try { return JSON.parse(savedCandidate.ai_extraction_metadata || "[]"); }
      catch { return []; }
    })();
    return (
      <>
        <PageHeader
          title="My Resume"
          description={`Saved as ${savedCandidate.candidate_id} · Last updated from ${savedCandidate.resume_filename || "resume"}`}
        />
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            {/* Profile Card */}
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-sm font-bold text-white">
                    {savedCandidate.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{savedCandidate.name}</div>
                    <div className="text-xs text-slate-400">{savedCandidate.email} {savedCandidate.phone && `· ${savedCandidate.phone}`}</div>
                  </div>
                </div>
                <button
                  className="btn-primary flex items-center gap-2"
                  onClick={() => { setIsUpdating(true); updateInput.current?.click(); }}
                  disabled={busy}
                >
                  <RefreshCw size={15} />
                  {busy ? "Processing…" : "Update Resume"}
                </button>
                <input
                  ref={updateInput} hidden type="file" accept=".pdf,.docx"
                  onChange={e => process(e.target.files?.[0], true)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                {[
                  ["Candidate ID", savedCandidate.candidate_id],
                  ["Desired Role", savedCandidate.desired_role || "—"],
                  ["Experience", `${savedCandidate.experience_years} yrs`],
                  ["Location", savedCandidate.preferred_location || "—"],
                  ["Education", savedCandidate.education || "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">{k}</div>
                    <div className="text-slate-200">{v}</div>
                  </div>
                ))}
              </div>
              {error && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
            </Card>

            {/* Skill Extraction Panel */}
            <Card>
              <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
                <BrainCircuit size={16} className="text-blue-400" /> Extracted Skills
              </h3>

              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Rule-Based Matches</p>
                  <div className="flex flex-wrap gap-2">
                    {splitSkills(savedCandidate.skills).length > 0
                      ? splitSkills(savedCandidate.skills).map(s => <SkillPill key={s} label={s} />)
                      : <span className="text-xs text-slate-600">None detected</span>}
                  </div>
                </div>

                {aiMeta.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-blue-400">AI Extraction</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {aiMeta.map((m, i) => (
                        <div key={i} className="rounded border border-slate-800 bg-slate-900/50 p-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-slate-200">{m.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500">{m.source}</span>
                              {confidenceBadge(m.confidence)}
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500">{m.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-emerald-400">Taxonomy Normalized</p>
                  <div className="flex flex-wrap gap-2">
                    {splitSkills(savedCandidate.normalized_skills).length > 0
                      ? splitSkills(savedCandidate.normalized_skills).map(s => <SkillPill key={s} label={s} color="emerald" />)
                      : <span className="text-xs text-slate-600">None</span>}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Resume Text Preview */}
          <Card>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <FileText size={16} className="text-emerald-400" /> {savedCandidate.resume_filename || "Resume Text"}
            </div>
            <div className="mt-4 max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-400">
              {savedCandidate.resume_text || "No text stored."}
            </div>
          </Card>
        </div>
      </>
    );
  }

  /* ────────────── PHASE: Upload (no profile yet) ────────────── */
  if (phase === "upload") return (
    <>
      <PageHeader title="Resume Intelligence" description="Upload your resume to create your candidate profile." />
      <Card className="mx-auto max-w-4xl p-8">
        <input ref={input} hidden type="file" accept=".pdf,.docx" onChange={e => process(e.target.files?.[0])} />
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={drop}
          onClick={() => input.current?.click()}
          className="grid min-h-[380px] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 p-8 text-center transition hover:border-blue-500/60 hover:bg-blue-500/[.03]"
        >
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 text-blue-400">
              {busy ? <LoaderCircle className="animate-spin" size={30} /> : <UploadCloud size={30} />}
            </div>
            <h2 className="mt-5 text-xl font-semibold">{busy ? "Reading resume with AI…" : "Drop your resume here"}</h2>
            <p className="mt-2 text-sm text-slate-400">PDF or DOCX · up to 8 MB</p>
            <button className="btn-primary mt-6" disabled={busy}>Choose Resume</button>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <Badge color="blue"><BrainCircuit size={12} className="mr-1 inline" /> AI Extraction</Badge>
              <Badge color="emerald">Taxonomy skill detection</Badge>
              <Badge>Manual review</Badge>
            </div>
          </div>
        </div>
        {error && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
      </Card>
    </>
  );

  /* ────────────── PHASE: Review (editable form) ────────────── */
  if (phase === "review") return (
    <>
      <PageHeader
        title={isUpdating ? "Review Updated Resume" : "Review Extracted Profile"}
        description="Correct anything before saving. Skills will be auto-normalized."
      />
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400"><ScanText /></div>
            <div>
              <h2 className="font-semibold">{isUpdating ? "Update Profile" : "New Candidate Profile"}</h2>
              <p className="text-xs text-slate-500">Edit fields, then click save.</p>
            </div>
          </div>

          {(warnings.length > 0 || duplicate) && (
            <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
              <div className="flex gap-2">
                <AlertTriangle size={17} className="shrink-0" />
                <div>
                  {duplicate && <p className="mb-1">Possible duplicate: {duplicate.name} ({duplicate.candidate_id})</p>}
                  {warnings.map(w => <p key={w}>• {w}</p>)}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {(([
              ["Full name", "name"], ["Email", "email"], ["Phone", "phone"],
              ["Preferred role", "desired_role"], ["Preferred location", "preferred_location"],
              ["Experience (years)", "experience_years"], ["Expected salary", "desired_salary"],
              ["Education", "education"],
            ]) as [string, keyof Draft][]).map(([label, key]) => (
              <label key={key} className="block text-sm">
                <span className="mb-1.5 block text-slate-400">{label}</span>
                <input
                  className="input"
                  type={key === "experience_years" || key === "desired_salary" ? "number" : "text"}
                  value={String(draft[key] ?? "")}
                  onChange={change(key)}
                />
              </label>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <BrainCircuit size={16} className="text-blue-400" /> Skill Extraction Pipeline
            </h3>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">1. Rule-Based Matches</p>
              <textarea className="input min-h-16 py-2 text-sm" value={draft.skills} onChange={change("skills")} />
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-blue-400">2. AI Extraction</p>
              {metadata.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {metadata.map((m, i) => (
                    <div key={i} className="rounded border border-slate-800 bg-slate-900/50 p-2 text-xs group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-200">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">{m.source}</span>
                          {confidenceBadge(m.confidence)}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 group-hover:line-clamp-none">{m.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-2">No AI skills extracted (AI disabled or key missing).</div>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-wider text-emerald-400">3. Merged (for Normalization)</p>
              <textarea className="input min-h-16 py-2 text-sm text-emerald-400 border-emerald-500/30 focus:border-emerald-500" readOnly value={mergedSkills} />
              <p className="mt-1 text-[10px] text-slate-500">Will be taxonomy-normalized on save.</p>
            </div>
          </div>

          {error && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
          <div className="mt-6 flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setPhase(savedCandidate ? "existing" : "upload")}>
              Cancel
            </button>
            <button className="btn-primary" disabled={busy || !draft.name.trim()} onClick={save}>
              {busy ? "Saving…" : isUpdating ? "Save Update" : "Save Candidate"}
            </button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText size={17} className="text-emerald-400" />
            {draft.resume_filename}
          </div>
          <p className="mt-4 text-xs uppercase tracking-wider text-slate-500">Extracted text preview</p>
          <div className="mt-3 max-h-[700px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-400">
            {draft.resume_text}
          </div>
        </Card>
      </div>
    </>
  );

  /* ────────────── PHASE: Saved / Updated Success ────────────── */
  if (phase === "saved" && savedCandidate) return (
    <>
      <PageHeader title="Resume Intelligence" description="" />
      <Card className="mx-auto max-w-3xl py-10">
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={34} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">
            {isUpdating ? "Profile Updated!" : "Candidate Saved!"}
          </h2>
          <p className="mt-2 text-slate-400">
            {savedCandidate.name} · <span className="text-emerald-400">{savedCandidate.candidate_id}</span>
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-300">Extracted (Rule + AI)</h3>
            <div className="flex flex-wrap gap-2">
              {splitSkills(savedCandidate.ai_skills || savedCandidate.skills).map(s => (
                <span key={s} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">{s}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="absolute top-1/2 -left-3 -translate-y-1/2 text-slate-700 md:hidden"><ArrowDown size={20} /></div>
            <h3 className="mb-4 text-sm font-semibold text-emerald-400">Taxonomy Normalized</h3>
            <div className="flex flex-wrap gap-2">
              {splitSkills(savedCandidate.normalized_skills).map(s => (
                <span key={s} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <button className="btn-primary mx-auto mt-7 flex" onClick={() => setPhase("existing")}>
          View My Profile
        </button>
      </Card>
    </>
  );

  return null;
}
