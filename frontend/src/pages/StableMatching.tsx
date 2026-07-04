import { useState, useEffect, useRef } from "react";
import { PageHeader } from "../components/PageHeader";
import { Card, Badge } from "../components/ui";
import { request } from "../lib/api";
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Activity } from "lucide-react";

type GSStats = {
  proposals: number;
  rejections: number;
  replacements: number;
  execution_time_ms: number;
  theoretical_complexity: string;
  total_candidates: number;
  total_jobs: number;
  total_capacity: number;
  blocking_pairs: number;
  avg_proposals: number;
  max_proposals: number;
};

type Match = {
  candidate_id: string;
  job_id: string;
  candidate_rank: number;
  job_rank: number;
};

type HistoryEvent = {
  type: "accept" | "reject" | "replace";
  candidate: string;
  job: string;
  replaced?: string;
  reason: string;
};

type GSResponse = {
  matches: Match[];
  unmatched_candidates: string[];
  history: HistoryEvent[];
  stats: GSStats;
  is_stable: boolean;
};

function generateMockData(numCandidates = 5, numJobs = 3, capacityPerJob = 2) {
  const candidates = Array.from({ length: numCandidates }, (_, i) => `C${i + 1}`);
  const jobs = Array.from({ length: numJobs }, (_, i) => `J${i + 1}`);

  const candidatePrefs = candidates.map(c => ({
    candidate_id: c,
    // Shuffle jobs for random preference
    preferences: [...jobs].sort(() => 0.5 - Math.random())
  }));

  const jobPrefs = jobs.map(j => ({
    job_id: j,
    capacity: capacityPerJob,
    // Shuffle candidates for random preference
    preferences: [...candidates].sort(() => 0.5 - Math.random())
  }));

  return { candidates: candidatePrefs, jobs: jobPrefs };
}

function GsVisualizer({ payload, result }: { payload: any, result: GSResponse }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [speed, setSpeed] = useState(1000);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  const history = result.history;

  useEffect(() => {
    if (playing) {
      timerRef.current = window.setTimeout(() => {
        setStepIdx((prev) => {
          if (prev < history.length - 1) return prev + 1;
          setPlaying(false);
          return prev;
        });
      }, speed);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, stepIdx, speed, history.length]);

  if (history.length === 0) return <div>No history to visualize.</div>;

  // Compute state up to stepIdx
  const currentAssignments: Record<string, string[]> = {};
  payload.jobs.forEach((j: any) => currentAssignments[j.job_id] = []);

  for (let i = 0; i <= stepIdx; i++) {
    const event = history[i];
    if (event.type === "accept") {
      currentAssignments[event.job].push(event.candidate);
    } else if (event.type === "replace") {
      currentAssignments[event.job] = currentAssignments[event.job].filter(c => c !== event.replaced);
      currentAssignments[event.job].push(event.candidate);
    }
  }

  const currentEvent = history[stepIdx];

  const getEventBadge = (type: string) => {
    switch (type) {
      case "accept": return <Badge color="emerald">Tentatively Accepted</Badge>;
      case "reject": return <Badge color="red">Rejected</Badge>;
      case "replace": return <Badge color="blue">Replaced</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h3 className="text-lg font-semibold text-white">Algorithm Execution Trace</h3>
        <div className="flex gap-2 text-sm">
          <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded" onClick={() => setSpeed(2000)}>Slow</button>
          <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded" onClick={() => setSpeed(1000)}>Normal</button>
          <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded" onClick={() => setSpeed(300)}>Fast</button>
        </div>
      </div>

      <div className="flex gap-2 items-center mb-6">
         <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300" onClick={() => setStepIdx(0)}><RotateCcw size={16}/></button>
         <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300" onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0}><SkipBack size={16}/></button>
         <button className="p-2 bg-blue-600 hover:bg-blue-500 rounded text-white" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause size={16}/> : <Play size={16}/>}
         </button>
         <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300" onClick={() => setStepIdx(Math.min(history.length - 1, stepIdx + 1))} disabled={stepIdx === history.length - 1}><SkipForward size={16}/></button>
         <div className="flex items-center ml-2 text-sm text-slate-400">Proposal {stepIdx + 1} of {history.length}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Event Panel */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 text-center flex flex-col items-center justify-center min-h-48">
           <div className="text-slate-400 text-xs uppercase tracking-wider mb-4">Current Proposal Event</div>
           <div className="flex items-center gap-4 text-xl font-mono text-white mb-4">
             <div className="px-4 py-2 bg-slate-800 rounded-lg">{currentEvent.candidate}</div>
             <div className="text-slate-500">→ proposes to →</div>
             <div className="px-4 py-2 bg-slate-800 rounded-lg">{currentEvent.job}</div>
           </div>
           <div className="mb-2">{getEventBadge(currentEvent.type)}</div>
           <div className="text-sm text-slate-400 mt-2">{currentEvent.reason}</div>
           {currentEvent.replaced && (
             <div className="text-sm text-red-400 mt-2">Candidate {currentEvent.replaced} was unassigned and returns to pool.</div>
           )}
        </div>

        {/* Jobs State Panel */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
           <div className="text-slate-400 text-xs uppercase tracking-wider mb-4">Job Assignments (State)</div>
           <div className="space-y-3">
             {payload.jobs.map((j: any) => {
               const assigned = currentAssignments[j.job_id] || [];
               const isFull = assigned.length >= j.capacity;
               const isTarget = currentEvent.job === j.job_id;
               return (
                 <div key={j.job_id} className={`p-3 rounded-lg border ${isTarget ? 'border-blue-500/50 bg-blue-500/10' : 'border-slate-800 bg-slate-950'} flex justify-between items-center`}>
                   <div className="flex flex-col">
                     <span className="font-mono text-slate-200">{j.job_id}</span>
                     <span className="text-[10px] text-slate-500">Capacity: {j.capacity}</span>
                   </div>
                   <div className="flex gap-2">
                     {assigned.length > 0 ? assigned.map((c: string) => (
                       <span key={c} className={`px-2 py-1 rounded text-xs font-mono ${isTarget && c === currentEvent.candidate && currentEvent.type !== 'reject' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'}`}>{c}</span>
                     )) : <span className="text-xs text-slate-600">Empty</span>}
                   </div>
                   <div className="text-xs">
                     {isFull ? <span className="text-red-400">Full</span> : <span className="text-emerald-400">{j.capacity - assigned.length} open</span>}
                   </div>
                 </div>
               )
             })}
           </div>
        </div>
      </div>
    </div>
  );
}

export default function StableMatching() {
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState<any>(null);
  const [result, setResult] = useState<GSResponse | null>(null);
  
  // Settings for mock generator
  const [numC, setNumC] = useState(5);
  const [numJ, setNumJ] = useState(3);
  const [cap, setCap] = useState(2);

  const runSimulation = async () => {
    setBusy(true);
    try {
      const mockPayload = generateMockData(numC, numJ, cap);
      setPayload(mockPayload);
      const res = await request<GSResponse>("/matching/stable", { method: "POST", body: JSON.stringify(mockPayload) });
      setResult(res);
    } catch(e) {
      console.error(e);
      alert("Error running simulation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Gale-Shapley Stable Matching" description="Integration layer for the DP-generated Preference Lists to execute Hospital/Residents matching." />

      <Card className="mb-6">
        <h3 className="font-semibold text-slate-200 mb-4">Run Simulation</h3>
        <p className="text-xs text-slate-500 mb-4">Use mock preference lists to verify the Gale-Shapley algorithm works with capacities. (DP module will provide these later).</p>
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <label className="block text-sm text-slate-400">
             Candidates
             <input type="number" className="input mt-1 w-24 block" value={numC} onChange={e => setNumC(Number(e.target.value))} min={1} max={50} />
          </label>
          <label className="block text-sm text-slate-400">
             Jobs
             <input type="number" className="input mt-1 w-24 block" value={numJ} onChange={e => setNumJ(Number(e.target.value))} min={1} max={20} />
          </label>
          <label className="block text-sm text-slate-400">
             Capacity per Job
             <input type="number" className="input mt-1 w-32 block" value={cap} onChange={e => setCap(Number(e.target.value))} min={1} max={10} />
          </label>
          <button className="btn-primary flex items-center gap-2 h-[42px]" onClick={runSimulation} disabled={busy}>
            {busy ? <Activity className="animate-spin" size={16} /> : <Play size={16}/>} 
            Execute Algorithm
          </button>
        </div>
      </Card>

      {result && payload && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           
           <Card>
              <GsVisualizer payload={payload} result={result} />
           </Card>

           <div className="grid md:grid-cols-2 gap-6">
             <Card>
               <h3 className="text-lg font-semibold text-white mb-4">Algorithm Report</h3>
               <div className="grid grid-cols-2 gap-y-3 text-sm">
                 <div className="text-slate-500">Theoretical Complexity</div>
                 <div className="text-blue-400 font-mono">{result.stats.theoretical_complexity}</div>
                 
                 <div className="text-slate-500">Execution Time</div>
                 <div className="text-emerald-400 font-mono">{result.stats.execution_time_ms.toFixed(3)} ms</div>

                 <div className="text-slate-500">Stability Check</div>
                 <div>{result.is_stable ? <Badge color="emerald">Stable (No Blocking Pairs)</Badge> : <Badge color="red">Not Stable</Badge>}</div>
                 
                 <div className="col-span-2 border-b border-slate-800 my-2"></div>

                 <div className="text-slate-500">Total Proposals</div>
                 <div className="text-slate-200">{result.stats.proposals}</div>
                 
                 <div className="text-slate-500">Avg Proposals / Candidate</div>
                 <div className="text-slate-200">{result.stats.avg_proposals}</div>
                 
                 <div className="text-slate-500">Max Proposals / Candidate</div>
                 <div className="text-slate-200">{result.stats.max_proposals}</div>
                 
                 <div className="text-slate-500">Total Rejections</div>
                 <div className="text-slate-200">{result.stats.rejections}</div>
                 
                 <div className="text-slate-500">Total Replacements</div>
                 <div className="text-slate-200">{result.stats.replacements}</div>
               </div>
             </Card>

             <Card>
               <h3 className="text-lg font-semibold text-white mb-4">Final Matches</h3>
               <div className="overflow-auto max-h-[300px]">
                 <table className="w-full text-left text-sm text-slate-300">
                   <thead className="bg-slate-800/50 text-xs uppercase text-slate-400 sticky top-0">
                     <tr>
                       <th className="px-4 py-3">Candidate</th>
                       <th className="px-4 py-3">Assigned Job</th>
                       <th className="px-4 py-3">Rank Received</th>
                       <th className="px-4 py-3">Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                     {result.matches.map(m => (
                       <tr key={m.candidate_id} className="hover:bg-slate-800/20">
                         <td className="px-4 py-3 font-mono">{m.candidate_id}</td>
                         <td className="px-4 py-3 font-mono text-emerald-400">{m.job_id}</td>
                         <td className="px-4 py-3">Pref #{m.candidate_rank}</td>
                         <td className="px-4 py-3"><Badge color="emerald">Matched</Badge></td>
                       </tr>
                     ))}
                     {result.unmatched_candidates.map(c => (
                       <tr key={c} className="hover:bg-slate-800/20">
                         <td className="px-4 py-3 font-mono">{c}</td>
                         <td className="px-4 py-3 text-slate-500">-</td>
                         <td className="px-4 py-3 text-slate-500">-</td>
                         <td className="px-4 py-3"><Badge color="red">Unmatched</Badge></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </Card>
           </div>
        </div>
      )}
    </>
  );
}
