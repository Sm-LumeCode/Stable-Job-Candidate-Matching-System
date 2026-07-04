import type { ReactNode } from "react";
export function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-800 bg-slate-900/40 text-xs uppercase tracking-wide text-slate-500"><tr>{headers.map(h => <th className="px-5 py-3 font-medium" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{children}</tbody></table></div>;
}

