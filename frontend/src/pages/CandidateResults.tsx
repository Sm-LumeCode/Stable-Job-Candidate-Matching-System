import { Trophy, Sparkles, Building2, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card, Badge } from "../components/ui";
import { useState, useEffect } from "react";
import { getData } from "../lib/api";

export default function CandidateResults() {
  const [status, setStatus] = useState("OPEN");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getData<{ status: string }>("/settings/status")
      .then((res) => {
        setStatus(res.status);
        if (res.status === "CLOSED") {
          return getData<any[]>("/matching/stable/results")
            .then(setResults)
            .catch(() => setError("Failed to load your results. Please try again later."));
        }
      })
      .catch(() => setError("Failed to load recruitment status. Please try again later."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="My Results" description="Job match scores and allocations" />
        <Card className="flex flex-col items-center py-20 text-center">
          <Loader2 size={36} className="animate-spin text-slate-400 mb-4" />
          <p className="text-sm text-slate-400">Loading your results…</p>
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="My Results" description="Job match scores and allocations" />
        <Card className="flex flex-col items-center py-20 text-center">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10">
            <AlertCircle size={36} className="text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
          <p className="mt-3 max-w-sm text-sm text-slate-400">{error}</p>
        </Card>
      </>
    );
  }

  if (status === "OPEN") {
    return (
      <>
        <PageHeader title="My Results" description="Job match scores and allocations" />
        <Card className="flex flex-col items-center py-20 text-center">
          <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10">
            <Sparkles size={36} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Application Submitted</h2>
          <Badge className="mt-2" color="blue">Recruitment Status: OPEN</Badge>
          <p className="mt-3 max-w-sm text-sm text-slate-400">
            Recruitment is still ongoing. The system is computing matches continuously in the
            background, but your final allocation will only be revealed once the cycle is closed by
            the Admin.
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-400">
            Status: Waiting for Final Allocation
          </div>
        </Card>
      </>
    );
  }

  const match = results[0];

  return (
    <>
      <PageHeader title="Final Allocation" description="The recruitment cycle is closed." />
      <Card className="flex flex-col items-center py-20 text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10">
          <Trophy size={36} className="text-emerald-400" />
        </div>

        {match ? (
          <>
            <h2 className="text-xl font-semibold text-white">Congratulations!</h2>
            <p className="mt-3 mb-6 text-sm text-slate-400">
              You have been allocated to a job based on the Gale-Shapley matching algorithm.
            </p>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex flex-col items-center min-w-[300px]">
              <Building2 size={24} className="text-emerald-400 mb-2" />
              <div className="text-lg font-semibold text-emerald-400">{match.assigned_job_id}</div>
              <div className="text-xs text-emerald-500 mt-2 font-medium bg-emerald-500/20 px-3 py-1 rounded-full">
                Preference Rank: #{match.preference_rank}
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white">Not Allocated</h2>
            <p className="mt-3 max-w-sm text-sm text-slate-400">
              Unfortunately, you were not allocated to a job during this cycle.
            </p>
          </>
        )}
      </Card>
    </>
  );
}
