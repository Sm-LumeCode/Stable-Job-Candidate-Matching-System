import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { uploadCsv } from "../lib/api";

export function CsvUpload({ resource, label, onComplete }: { resource: string; label: string; onComplete?: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const select = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try { await uploadCsv(resource, file); onComplete?.(); }
    catch (error) { alert(error instanceof Error ? error.message : "Upload failed"); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return <><input ref={ref} type="file" accept=".csv,text/csv" className="hidden" onChange={e => select(e.target.files?.[0])} /><button className="btn-primary" disabled={busy} onClick={() => ref.current?.click()}><Upload size={16} />{busy ? "Uploading..." : label}</button></>;
}

