import { Bell, Menu, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function roleBadge(role: string) {
  if (role === "admin") return "bg-violet-500/15 text-violet-400";
  if (role === "recruiter") return "bg-blue-500/15 text-blue-400";
  return "bg-emerald-500/15 text-emerald-400";
}

export function Navbar({ menu }: { menu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-background/90 px-4 backdrop-blur md:px-7">
      <div className="flex items-center gap-3">
        <button className="lg:hidden" onClick={menu}>
          <Menu />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-white">
          <Bell size={19} />
        </button>
        <div className="h-8 w-px bg-slate-800" />
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-white">{user.username}</div>
              <span className={`rounded-full px-2 py-px text-[10px] font-medium capitalize ${roleBadge(user.role)}`}>
                {user.role}
              </span>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-xs font-bold text-white">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={17} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
