import { Trophy, Sparkles } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/ui";

export default function CandidateResults() {
  return (
    <>
      <PageHeader title="My Results" description="Your job match scores and recommendations will appear here." />
      <Card className="flex flex-col items-center py-20 text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10">
          <Trophy size={36} className="text-violet-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Matching Coming Soon</h2>
        <p className="mt-3 max-w-sm text-sm text-slate-400">
          Once you've uploaded your resume, the Boyer–Moore–Horspool matching engine will rank available jobs by compatibility with your skill set.
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-4 py-2.5 text-xs text-violet-400">
          <Sparkles size={14} /> Next phase: run matching
        </div>
      </Card>
    </>
  );
}
