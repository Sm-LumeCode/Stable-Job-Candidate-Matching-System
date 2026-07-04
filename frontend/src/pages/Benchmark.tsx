import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/ui";
import { getData } from "../lib/api";
import { Activity, FastForward, LoaderCircle, Server } from "lucide-react";

export default function Benchmark() {
  const [busy, setBusy] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  const runBenchmark = async () => {
    setBusy(true);
    try {
      const result = await getData<any>("/benchmark/bmh");
      setMetrics(result);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Algorithm Benchmark" description="Performance comparison: Naive vs Boyer-Moore-Horspool for substring search." />

      <div className="mb-6">
        <button className="btn-primary flex items-center gap-2" onClick={runBenchmark} disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Activity size={18} />}
          {busy ? "Running Benchmark..." : "Run Benchmark"}
        </button>
      </div>

      {metrics && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid md:grid-cols-3 gap-4">
             <Card className="flex flex-col items-center justify-center text-center">
               <h4 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">BMH Speedup</h4>
               <div className="text-4xl font-bold text-emerald-400 flex items-center gap-2">
                 {metrics.speedup}x <FastForward size={24}/>
               </div>
               <p className="text-xs text-slate-500 mt-2">BMH is {metrics.speedup}x faster than Naive search</p>
             </Card>
             <Card className="flex flex-col items-center justify-center text-center">
               <h4 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Comparisons</h4>
               <div className="flex w-full justify-between mt-4">
                 <div>
                   <div className="text-xl font-semibold text-slate-300">{metrics.naive_comps.toLocaleString()}</div>
                   <div className="text-xs text-slate-500">Naive</div>
                 </div>
                 <div className="border-r border-slate-700"></div>
                 <div>
                   <div className="text-xl font-semibold text-blue-400">{metrics.bmh_comps.toLocaleString()}</div>
                   <div className="text-xs text-slate-500">BMH</div>
                 </div>
               </div>
             </Card>
             <Card className="flex flex-col items-center justify-center text-center">
               <h4 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Test Parameters</h4>
               <div className="text-sm text-slate-300">
                 <div className="flex justify-between w-40 mb-1"><span className="text-slate-500">Iterations:</span> {metrics.iterations}</div>
                 <div className="flex justify-between w-40 mb-1"><span className="text-slate-500">Text Length:</span> {metrics.text_length}</div>
                 <div className="flex justify-between w-40"><span className="text-slate-500">Pattern Length:</span> {metrics.pattern_length}</div>
               </div>
             </Card>
          </div>

          <Card>
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Server size={20} className="text-blue-400"/> Runtime Statistics</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Metric</th>
                    <th className="px-4 py-3 text-right">Naive Search</th>
                    <th className="px-4 py-3 text-right">Boyer-Moore-Horspool</th>
                    <th className="px-4 py-3 text-right text-emerald-400">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-4 font-medium">Total Runtime</td>
                    <td className="px-4 py-4 text-right font-mono">{metrics.naive_runtime_ms.toFixed(2)} ms</td>
                    <td className="px-4 py-4 text-right font-mono text-blue-400">{metrics.bmh_runtime_ms.toFixed(2)} ms</td>
                    <td className="px-4 py-4 text-right font-mono text-emerald-400">{((metrics.naive_runtime_ms - metrics.bmh_runtime_ms) / metrics.naive_runtime_ms * 100).toFixed(1)}% less</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-4 font-medium">Average Runtime</td>
                    <td className="px-4 py-4 text-right font-mono">{metrics.naive_avg_ms.toFixed(4)} ms</td>
                    <td className="px-4 py-4 text-right font-mono text-blue-400">{metrics.bmh_avg_ms.toFixed(4)} ms</td>
                    <td className="px-4 py-4 text-right font-mono text-emerald-400">{metrics.speedup}x speedup</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-4 font-medium">Best Case (Min)</td>
                    <td className="px-4 py-4 text-right font-mono">{metrics.naive_best_ms.toFixed(4)} ms</td>
                    <td className="px-4 py-4 text-right font-mono text-blue-400">{metrics.bmh_best_ms.toFixed(4)} ms</td>
                    <td className="px-4 py-4 text-right font-mono">-</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="px-4 py-4 font-medium">Worst Case (Max)</td>
                    <td className="px-4 py-4 text-right font-mono">{metrics.naive_worst_ms.toFixed(4)} ms</td>
                    <td className="px-4 py-4 text-right font-mono text-blue-400">{metrics.bmh_worst_ms.toFixed(4)} ms</td>
                    <td className="px-4 py-4 text-right font-mono">-</td>
                  </tr>
                  <tr className="hover:bg-slate-800/20 bg-slate-900/50">
                    <td className="px-4 py-4 font-bold text-white">Character Comparisons</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-red-400">{metrics.naive_comps.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-emerald-400">{metrics.bmh_comps.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-emerald-400">{((metrics.naive_comps - metrics.bmh_comps) / metrics.naive_comps * 100).toFixed(1)}% fewer</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="mt-8">
               <h4 className="text-sm font-semibold text-slate-300 mb-4">Comparison Chart (Lower is Better)</h4>
               <div className="space-y-4">
                 <div>
                   <div className="flex justify-between text-xs text-slate-400 mb-1">
                     <span>Naive Time</span>
                     <span>{metrics.naive_runtime_ms.toFixed(2)} ms</span>
                   </div>
                   <div className="w-full bg-slate-800 rounded-full h-2">
                     <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                   </div>
                 </div>
                 <div>
                   <div className="flex justify-between text-xs text-slate-400 mb-1">
                     <span>BMH Time</span>
                     <span>{metrics.bmh_runtime_ms.toFixed(2)} ms</span>
                   </div>
                   <div className="w-full bg-slate-800 rounded-full h-2">
                     <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.max((metrics.bmh_runtime_ms / metrics.naive_runtime_ms) * 100, 1)}%` }}></div>
                   </div>
                 </div>
               </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
