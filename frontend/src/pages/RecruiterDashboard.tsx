import { Link } from "react-router-dom";
import { BriefcaseBusiness, Users, Sparkles, ArrowRight, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/ui";

const cards = [
  {
    to: "/recruiter/jobs",
    icon: BriefcaseBusiness,
    label: "My Jobs",
    description: "Create, edit, and manage your posted job listings. View required skills with normalization.",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    badge: "Active",
    badgeColor: "bg-blue-500/10 text-blue-400",
  },
  {
    to: "/recruiter/applicants",
    icon: Users,
    label: "Applicants",
    description: "View candidates who applied to your positions (coming soon).",
    color: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
    badge: "Coming Soon",
    badgeColor: "bg-emerald-500/10 text-emerald-400",
  },
  {
    to: "/recruiter/matched",
    icon: Sparkles,
    label: "Matched Candidates",
    description: "See the best-matched candidates for each of your job postings (coming soon).",
    color: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
    badge: "Coming Soon",
    badgeColor: "bg-violet-500/10 text-violet-400",
  },
];

export default function RecruiterDashboard() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.username ?? "Recruiter"}`}
        description="Your recruiter workspace — manage your job postings and discover matched candidates."
        actions={
          <Link to="/recruiter/jobs/new" className="btn-primary">
            <Plus size={16} /> Post a Job
          </Link>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ to, icon: Icon, label, description, color, iconColor, badge, badgeColor }) => (
          <Link key={to} to={to} className="group block">
            <Card className={`h-full bg-gradient-to-br ${color} border-slate-700/60 p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30`}>
              <div className="mb-4 flex items-start justify-between">
                <div className={`rounded-xl bg-slate-900/60 p-3 ${iconColor}`}>
                  <Icon size={24} />
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>{badge}</span>
              </div>
              <h2 className="text-lg font-semibold text-white">{label}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
              <div className={`mt-5 flex items-center gap-1.5 text-sm font-medium ${iconColor} opacity-0 transition-opacity group-hover:opacity-100`}>
                Go to {label} <ArrowRight size={15} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
