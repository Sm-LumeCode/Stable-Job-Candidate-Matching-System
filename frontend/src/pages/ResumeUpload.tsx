import { DragEvent, useEffect, useRef, useState } from 'react';
import {
  BrainCircuit, CheckCircle2, Download, FileText, LoaderCircle, RefreshCw, UploadCloud,
} from 'lucide-react';
import type { Candidate, SkillMetadata } from '../types';
import { getData, request } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { Badge, Card } from '../components/ui';

export default function ResumeUpload() {
  const input = useRef<HTMLInputElement>(null);

  // checking  => loading from server
  // existing  => profile found, show view
  // upload    => no profile, show drop zone
  // saved     => just uploaded successfully
  const [phase, setPhase] = useState<'checking' | 'existing' | 'upload' | 'saved'>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [candidate, setCandidate] = useState<Candidate | null>(null);

  // On mount: check if this user already has a profile
  useEffect(() => {
    getData<Candidate>('/resumes/my')
      .then(c => { setCandidate(c); setPhase('existing'); })
      .catch(() => setPhase('upload'));
  }, []);

  // ── Upload handler — single-step: parse + save atomically ──
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    try {
      const saved = await request<Candidate>('/resumes/upload', { method: 'POST', body });
      setCandidate(saved);
      setPhase('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const drop = (e: DragEvent) => { e.preventDefault(); upload(e.dataTransfer.files[0]); };

  const aiMeta = (): SkillMetadata[] => {
    try { return JSON.parse(candidate?.ai_extraction_metadata || '[]'); }
    catch { return []; }
  };

  const splitSkills = (s?: string) => (s || '').split(',').map(x => x.trim()).filter(Boolean);

  const confidenceBadge = (c: number) => {
    if (c >= 0.9) return <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400">High</span>;
    if (c >= 0.7) return <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">Med</span>;
    return <span className="ml-2 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-400">Low</span>;
  };

  /* ── Checking ── */
  if (phase === 'checking') return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoaderCircle className="animate-spin text-slate-500" size={32} />
    </div>
  );

  /* ── Upload Drop Zone ── */
  if (phase === 'upload') return (
    <>
      <PageHeader title="Resume Intelligence" description="Upload your resume to create your candidate profile." />
      <Card className="mx-auto max-w-4xl p-8">
        <input ref={input} hidden type="file" accept=".pdf,.docx" onChange={e => upload(e.target.files?.[0])} />
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={drop}
          onClick={() => !busy && input.current?.click()}
          className="grid min-h-[380px] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 p-8 text-center transition hover:border-blue-500/60 hover:bg-blue-500/[.03]"
        >
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 text-blue-400">
              {busy ? <LoaderCircle className="animate-spin" size={30} /> : <UploadCloud size={30} />}
            </div>
            <h2 className="mt-5 text-xl font-semibold">{busy ? 'Parsing & saving resume…' : 'Drop your resume here'}</h2>
            <p className="mt-2 text-sm text-slate-400">PDF or DOCX · up to 8 MB</p>
            <button className="btn-primary mt-6" disabled={busy}>Choose Resume</button>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <Badge color="blue"><BrainCircuit size={12} className="mr-1 inline" /> AI Extraction</Badge>
              <Badge color="emerald">Taxonomy skill detection</Badge>
              <Badge>Auto-saved instantly</Badge>
            </div>
          </div>
        </div>
        {error && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
      </Card>
    </>
  );

  /* ── Just Saved / Success ── */
  if (phase === 'saved' && candidate) return (
    <>
      <PageHeader title="Resume Intelligence" description="" />
      <Card className="mx-auto max-w-3xl py-10">
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={34} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">Resume Saved!</h2>
          <p className="mt-2 text-slate-400">{candidate.name} · <span className="text-emerald-400">{candidate.candidate_id}</span></p>
          <p className="mt-1 text-sm text-slate-500">Your profile has been created and linked to your account permanently.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-300">Extracted Skills</h3>
            <div className="flex flex-wrap gap-2">
              {splitSkills(candidate.ai_skills || candidate.skills).map(s => (
                <span key={s} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">{s}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="mb-4 text-sm font-semibold text-emerald-400">Taxonomy Normalized</h3>
            <div className="flex flex-wrap gap-2">
              {splitSkills(candidate.normalized_skills).map(s => (
                <span key={s} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">{s}</span>
              ))}
            </div>
          </div>
        </div>
        <button className="btn-primary mx-auto mt-7 flex" onClick={() => setPhase('existing')}>
          View My Profile
        </button>
      </Card>
    </>
  );

  /* ── Existing Profile View ── */
  if (candidate) {
    const meta = aiMeta();
    return (
      <>
        <PageHeader
          title="My Resume"
          description={`Profile saved as ${candidate.candidate_id} · ${candidate.resume_filename || 'resume'}`}
        />
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <Card>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-sm font-bold text-white">
                    {candidate.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{candidate.name}</div>
                    <div className="text-xs text-slate-400">{candidate.email}{candidate.phone && ` · ${candidate.phone}`}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {candidate.resume_filename && (
                    <a
                      href={`http://localhost:8000/uploads/resumes/${encodeURIComponent(candidate.resume_filename)}`}
                      download={candidate.resume_filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Download size={15} /> Download
                    </a>
                  )}
                  <input
                    ref={input} hidden type="file" accept=".pdf,.docx"
                    onChange={e => upload(e.target.files?.[0])}
                  />
                  <button
                    className="btn-primary flex items-center gap-2"
                    onClick={() => input.current?.click()}
                    disabled={busy}
                  >
                    {busy ? <LoaderCircle size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                    {busy ? 'Processing…' : 'Update Resume'}
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                {[
                  ['Candidate ID', candidate.candidate_id],
                  ['Desired Role', candidate.desired_role || '—'],
                  ['Experience', `${candidate.experience_years} yrs`],
                  ['Location', candidate.preferred_location || '—'],
                  ['Education', candidate.education || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">{k}</div>
                    <div className="text-slate-200">{v}</div>
                  </div>
                ))}
              </div>
              {error && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
            </Card>

            <Card>
              <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
                <BrainCircuit size={16} className="text-blue-400" /> Extracted Skills
              </h3>
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Rule-Based Matches</p>
                  <div className="flex flex-wrap gap-2">
                    {splitSkills(candidate.skills).length > 0
                      ? splitSkills(candidate.skills).map(s => <span key={s} className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300">{s}</span>)
                      : <span className="text-xs text-slate-600">None detected</span>}
                  </div>
                </div>
                {meta.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-blue-400">AI Extraction</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {meta.map((m, i) => (
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
                    {splitSkills(candidate.normalized_skills).length > 0
                      ? splitSkills(candidate.normalized_skills).map(s => <span key={s} className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">{s}</span>)
                      : <span className="text-xs text-slate-600">None</span>}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between gap-2 text-sm font-medium text-slate-300">
              <span className="flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" /> {candidate.resume_filename || 'Resume Text'}
              </span>
              {candidate.resume_filename && (
                <a
                  href={`http://localhost:8000/uploads/resumes/${encodeURIComponent(candidate.resume_filename)}`}
                  download={candidate.resume_filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition"
                >
                  <Download size={13} /> Download
                </a>
              )}
            </div>
            <div className="mt-4 max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-400">
              {candidate.resume_text || 'No text stored.'}
            </div>
          </Card>
        </div>
      </>
    );
  }

  return null;
}
