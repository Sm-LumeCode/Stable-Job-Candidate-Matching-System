import { Search } from "lucide-react";
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-500" size={17} /><input className="input pl-9" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

