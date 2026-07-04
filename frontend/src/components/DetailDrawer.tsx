import type { ReactNode } from "react";
import { X } from "lucide-react";
export function DetailDrawer({ open, title, close, children }: { open: boolean; title: string; close: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/60" onClick={close}><aside className="absolute inset-y-0 right-0 w-full max-w-md border-l border-slate-800 bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="mb-8 flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2><button onClick={close}><X /></button></div>{children}</aside></div>;
}

