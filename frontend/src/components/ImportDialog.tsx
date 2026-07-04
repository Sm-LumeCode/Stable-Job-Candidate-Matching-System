import { useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload, X } from "lucide-react";
import { previewCsv, uploadCsv } from "../lib/api";
import { DataTable } from "./DataTable";

export function ImportDialog({ resource, label, onComplete }: { resource: "jobs" | "skills"; label: string; onComplete: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<Awaited<ReturnType<typeof previewCsv>> | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const select = async (selected?: File) => {
    if (!selected) return;
    setFile(selected); setBusy(true); setError("");
    try { setPreview(await previewCsv(resource, selected)); } catch (e) { setError(e instanceof Error ? e.message : "Preview failed"); }
    finally { setBusy(false); }
  };
  const close = () => { setFile(null); setPreview(null); setError(""); if (input.current) input.current.value = ""; };
  const commit = async () => {
    if (!file) return; setBusy(true);
    try { await uploadCsv(resource, file); onComplete(); close(); }
    catch (e) { setError(e instanceof Error ? e.message : "Import failed"); }
    finally { setBusy(false); }
  };
  const headers = preview?.rows[0] ? Object.keys(preview.rows[0]) : [];
  return <><input ref={input} hidden type="file" accept=".csv,text/csv" onChange={e => select(e.target.files?.[0])} /><button className="btn-primary" onClick={() => input.current?.click()}><Upload size={16} />{label}</button>
    {file && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="panel max-h-[88vh] w-full max-w-5xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 p-5"><div className="flex items-center gap-3"><FileSpreadsheet className="text-emerald-400" /><div><h2 className="font-semibold">Review import</h2><p className="text-xs text-slate-500">{file.name}</p></div></div><button onClick={close}><X /></button></div>
      <div className="max-h-[58vh] overflow-auto">{busy && !preview ? <div className="p-12 text-center text-slate-400">Validating CSV…</div> : preview && <DataTable headers={headers}>{preview.rows.slice(0, 10).map((row, i) => <tr key={i}>{headers.map(h => <td key={h} className="max-w-52 truncate px-5 py-3 text-slate-300">{row[h]}</td>)}</tr>)}</DataTable>}</div>
      <div className="flex flex-col gap-3 border-t border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between"><div>{error ? <span className="text-sm text-red-400">{error}</span> : preview?.valid ? <span className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 size={16} />{preview.total} rows ready to import</span> : preview && <span className="text-sm text-amber-400">Missing: {preview.missing_columns.join(", ")}</span>}</div><div className="flex gap-2"><button className="btn-secondary" onClick={close}>Cancel</button><button className="btn-primary" disabled={!preview?.valid || busy} onClick={commit}>{busy ? "Importing…" : "Confirm Import"}</button></div></div>
    </div></div>}</>;
}
