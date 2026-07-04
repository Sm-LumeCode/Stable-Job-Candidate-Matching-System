import { Bell, Menu, Search } from "lucide-react";

export function Navbar({ menu }: { menu: () => void }) {
  return <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-background/90 px-4 backdrop-blur md:px-7">
    <div className="flex items-center gap-3"><button className="lg:hidden" onClick={menu}><Menu /></button><div className="relative hidden sm:block"><Search className="absolute left-3 top-2.5 text-slate-500" size={17} /><input className="input w-72 pl-9" placeholder="Search workspace..." /></div></div>
    <div className="flex items-center gap-4"><button className="text-slate-400 hover:text-white"><Bell size={19} /></button><div className="h-8 w-px bg-slate-800" /><div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400">AD</div><span className="hidden text-sm sm:block">Admin</span></div></div>
  </header>;
}

