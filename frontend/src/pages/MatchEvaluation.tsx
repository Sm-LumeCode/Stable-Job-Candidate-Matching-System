import { useState, useEffect } from "react";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/ui";
import { getData } from "../lib/api";
import { Activity, BarChart2, LoaderCircle, Settings } from "lucide-react";

export default function MatchEvaluation() {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);

  const loadData = async () => {
    setBusy(true);
    try {
      const result = await getData<any>("/matching/evaluation");
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <PageHeader title="Algorithm Evaluation" description="Compare matching algorithms on regret, stability, and weight sensitivities." />

      <div className="mb-6">
        <button className="btn-primary flex items-center gap-2" onClick={loadData} disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Activity size={18} />}
          {busy ? "Running Evaluation..." : "Refresh Evaluation"}
        </button>
      </div>

      {data && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <Card>
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><BarChart2 size={20} className="text-blue-400"/> Algorithm Comparison</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Match Rate</th>
                    <th className="px-4 py-3 text-right">Avg Cand Regret</th>
                    <th className="px-4 py-3 text-right">Avg Job Regret</th>
                    <th className="px-4 py-3 text-right text-red-400">Blocking Pairs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.method_comparison.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-800/20">
                      <td className="px-4 py-4 font-medium text-white">{row.method}</td>
                      <td className="px-4 py-4 text-right font-mono">{(row.match_rate * 100).toFixed(1)}%</td>
                      <td className="px-4 py-4 text-right font-mono text-blue-400">{row.avg_regret.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-mono text-emerald-400">{row.avg_job_regret.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-mono text-red-400 font-bold">{row.num_blocking_pairs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8">
               <h4 className="text-sm font-semibold text-slate-300 mb-4">Total Regret Chart (Lower is Better)</h4>
               <div className="space-y-4">
                 {data.method_comparison.map((row: any, i: number) => (
                   <div key={i}>
                     <div className="flex justify-between text-xs text-slate-400 mb-1">
                       <span>{row.method}</span>
                       <span>{(row.avg_regret + row.avg_job_regret).toFixed(2)} total regret</span>
                     </div>
                     <div className="w-full bg-slate-800 rounded-full h-2">
                       <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (row.avg_regret + row.avg_job_regret) * 10)}%` }}></div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Settings size={20} className="text-purple-400"/> Weight Sensitivity</h3>
            <p className="text-sm text-slate-400 mb-6">Comparing how many matches change when using preset alternate scoring configurations versus the Default configuration.</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Configuration Variant</th>
                    <th className="px-4 py-3 text-right">Total Matches</th>
                    <th className="px-4 py-3 text-right text-amber-400">Matches Changed (Delta)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.weight_sensitivity.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-800/20">
                      <td className="px-4 py-4 font-medium text-white">{row.weights_variant}</td>
                      <td className="px-4 py-4 text-right font-mono">{row.total_matches}</td>
                      <td className="px-4 py-4 text-right font-mono text-amber-400 font-bold">{row.resulting_top_matches_delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8">
               <h4 className="text-sm font-semibold text-slate-300 mb-4">Matches Changed Chart (Lower is More Stable)</h4>
               <div className="space-y-4">
                 {data.weight_sensitivity.map((row: any, i: number) => (
                   <div key={i}>
                     <div className="flex justify-between text-xs text-slate-400 mb-1">
                       <span>{row.weights_variant}</span>
                       <span>{row.resulting_top_matches_delta} delta</span>
                     </div>
                     <div className="w-full bg-slate-800 rounded-full h-2">
                       <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, (row.resulting_top_matches_delta / Math.max(1, row.total_matches)) * 100)}%` }}></div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
