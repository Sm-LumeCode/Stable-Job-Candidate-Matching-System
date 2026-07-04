import { BarChart3, FileCheck2, PieChart, Timer } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card, EmptyState } from "../components/ui";
const reports = [["Complexity Analysis", BarChart3], ["Matching Statistics", PieChart], ["Stability Report", FileCheck2], ["Runtime Report", Timer]] as const;
export default function Reports() { return <><PageHeader title="Reports" description="Evidence and operational insight from every matching run." /><div className="grid gap-5 md:grid-cols-2">{reports.map(([name, Icon]) => <Card key={name}><div className="mb-4 flex items-center gap-3"><div className="rounded-lg bg-blue-500/10 p-2 text-blue-400"><Icon size={18} /></div><h2 className="font-semibold">{name}</h2></div><EmptyState label="Available after matching runs" /></Card>)}</div></>; }

