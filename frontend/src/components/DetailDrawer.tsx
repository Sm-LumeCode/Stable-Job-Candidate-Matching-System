import type { ReactNode } from "react";
import { X } from "lucide-react";
export function DetailDrawer({ open, title, close, children }: { open: boolean; title: string; close: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={close}><aside className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l border-slate-800 bg-[#060b14] p-6 shadow-2xl" onClick={e => e.stopPropagation()}><div className="mb-8 flex items-center justify-between"><h2 className="text-xl font-semibold text-white">{title}</h2><button className="text-slate-400 hover:text-white" onClick={close}><X /></button></div>{children}</aside></div>;
}

