import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, BriefcaseBusiness, UserRound, ShieldCheck, Loader2, LogIn } from "lucide-react";
import { useAuth, type UserRole } from "../context/AuthContext";

const ROLES: { value: UserRole; label: string; icon: typeof UserRound; description: string; color: string }[] = [
  { value: "candidate", label: "Candidate", icon: UserRound, description: "Upload resume & view matches", color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400" },
  { value: "recruiter", label: "Recruiter", icon: BriefcaseBusiness, description: "Manage jobs & applicants", color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400" },
  { value: "admin", label: "Admin", icon: ShieldCheck, description: "Full system access", color: "from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400" },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [role, setRole] = useState<UserRole>("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"login" | "register">("login");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBusy, setRegBusy] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || roleHome(role);

  function roleHome(r: UserRole) {
    if (r === "admin") return "/";
    if (r === "recruiter") return "/recruiter";
    return "/candidate";
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await login(email.trim(), password, role);
      navigate(roleHome(role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally { setBusy(false); }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (role === "admin") { setRegError("Admin accounts cannot be self-registered."); return; }
    setRegBusy(true); setRegError(""); setRegSuccess("");
    try {
      const res = await fetch("http://localhost:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: regUsername.trim(), email: regEmail.trim(), password: regPassword, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      setRegSuccess(`Account created! You can now log in with ${regEmail}.`);
      setTab("login"); setEmail(regEmail);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Registration failed");
    } finally { setRegBusy(false); }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060b14]">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 shadow-lg shadow-blue-500/25">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">StableHire</h1>
          <p className="mt-1 text-sm text-slate-400">Matching Intelligence Platform</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
          {/* Role selector */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-slate-500">Sign in as</p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border bg-gradient-to-br p-3 text-xs font-medium transition-all ${
                    role === value
                      ? `${color} shadow-md`
                      : "border-slate-800 bg-slate-950/50 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div className="mb-6 flex rounded-lg border border-slate-800 bg-slate-950 p-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(""); setRegError(""); setRegSuccess(""); }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition ${
                  tab === t ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {regSuccess && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">{regSuccess}</div>
              )}
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Email</label>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Password</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">{error}</div>
              )}
              <button type="submit" disabled={busy} className="btn-primary w-full mt-2">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
                {busy ? "Signing in…" : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {role === "admin" && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-400">
                  Admin accounts cannot be self-registered. Please use the seeded admin account.
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Username</label>
                <input className="input" placeholder="Choose a username" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Email</label>
                <input className="input" type="email" placeholder="your@email.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-400">Password</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPwd ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {regError && <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">{regError}</div>}
              <button type="submit" disabled={regBusy || role === "admin"} className="btn-primary w-full mt-2">
                {regBusy ? <Loader2 size={16} className="animate-spin" /> : null}
                {regBusy ? "Creating account…" : `Create ${role} Account`}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">StableHire v0.2 · Matching Intelligence</p>
      </div>
    </div>
  );
}
