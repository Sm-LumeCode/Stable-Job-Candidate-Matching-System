import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Unauthorized() {
  const { user } = useAuth();
  const home = user?.role === "admin" ? "/" : user?.role === "recruiter" ? "/recruiter" : "/candidate";
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060b14]">
      <div className="text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-red-500/10">
          <ShieldOff size={36} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="mt-3 text-sm text-slate-400">
          You don't have permission to view this page.
        </p>
        <Link to={home} className="btn-primary mt-8 inline-flex">Return Home</Link>
      </div>
    </div>
  );
}
