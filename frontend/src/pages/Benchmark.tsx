import { Activity, Gauge, Timer, Zap } from "lucide-react";
import { BenchmarkChart } from "../components/BenchmarkChart";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { Card } from "../components/ui";
export default function Benchmark() {
  return <><PageHeader title="Benchmark" description="Compare search and matching performance across dataset sizes." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Naive Search Runtime" value="245 ms" icon={Timer} /><StatCard label="BMH Runtime" value="61 ms" icon={Zap} color="emerald" /><StatCard label="Speedup" value="4.0×" icon={Gauge} /><StatCard label="Gale-Shapley Runtime" value="105 ms" icon={Activity} color="emerald" /></div><Card className="mt-6"><div className="mb-5"><h2 className="font-semibold">Runtime Comparison</h2><p className="text-sm text-slate-500">Dummy benchmark data for layout preview</p></div><BenchmarkChart /></Card></>;
}

