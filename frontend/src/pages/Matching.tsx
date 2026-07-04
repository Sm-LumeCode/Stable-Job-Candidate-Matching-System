import { PageHeader } from "../components/PageHeader";
import { Card, EmptyState } from "../components/ui";
export default function Matching() {
  return <><PageHeader title="Stable Matching" description="Preference generation and stable assignment workspace." actions={<button className="btn-primary" disabled>Run Matching (Coming Soon)</button>} /><div className="mb-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300">The matching algorithm integration point is ready. No algorithm has been implemented.</div><div className="grid gap-5 xl:grid-cols-2">{["Candidate Preference List", "Job Preference List", "Matching Results", "Blocking Pairs"].map(x => <Card key={x}><h2 className="mb-4 font-semibold">{x}</h2><EmptyState /></Card>)}</div></>;
}

