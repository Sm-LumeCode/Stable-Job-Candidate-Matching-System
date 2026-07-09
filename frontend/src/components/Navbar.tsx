import { Bell, Menu, LogOut, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { request } from "../lib/api";

function roleBadge(role: string) {
  if (role === "admin") return "bg-violet-500/15 text-violet-400";
  if (role === "recruiter") return "bg-blue-500/15 text-blue-400";
  return "bg-emerald-500/15 text-emerald-400";
}

type Notification = {
  id: number;
  message: string;
  is_read: boolean;
  type: string;
  created_at: string;
};

export function Navbar({ menu }: { menu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    request<Notification[]>("/notifications")
      .then(data => setNotifications(data))
      .catch(console.error);
      
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user]);

  const markRead = async (id: number) => {
    try {
      await request(`/notifications/${id}/read`, { method: "PUT" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-background/90 px-4 backdrop-blur md:px-7">
      <div className="flex items-center gap-3">
        <button className="lg:hidden" onClick={menu}>
          <Menu />
        </button>
      </div>
      <div className="flex items-center gap-4">
        
        {user && (
          <div className="relative" ref={notifRef}>
            <button 
              className="relative text-slate-400 hover:text-white"
              onClick={() => setShowNotifs(!showNotifs)}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-3 w-80 rounded-xl border border-slate-800 bg-slate-900 shadow-xl overflow-hidden z-50">
                <div className="border-b border-slate-800 p-3 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && <span className="text-xs text-slate-400">{unreadCount} unread</span>}
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`mb-2 rounded-lg border p-3 text-sm last:mb-0 relative ${n.is_read ? 'border-slate-800 bg-slate-900/50 opacity-70' : 'border-slate-700 bg-slate-800'} ${n.type === 'success' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-blue-500'}`}>
                        <p className="text-slate-300 text-xs pr-6 leading-tight">{n.message}</p>
                        {!n.is_read && (
                          <button onClick={() => markRead(n.id)} className="absolute right-2 top-2 text-slate-400 hover:text-emerald-400" title="Dismiss">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
