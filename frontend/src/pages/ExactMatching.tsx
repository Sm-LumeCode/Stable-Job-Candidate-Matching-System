import { useEffect, useState, useRef } from "react";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/ui";
import { getData } from "../lib/api";
import { Play, Pause, SkipForward, SkipBack, RotateCcw } from "lucide-react";

type BMHState = {
  text: string;
  pattern: string;
  textIndex: number;
  patternIndex: number;
  bct: Record<string, number>;
  status: "idle" | "comparing" | "match" | "mismatch" | "shifting" | "done_match" | "done_no_match";
  shiftValue: number;
  comparisons: number;
};

function buildBct(pattern: string) {
  const bct: Record<string, number> = {};
  const m = pattern.length;
  for (let i = 0; i < m - 1; i++) {
    bct[pattern[i]] = m - 1 - i;
  }
  return bct;
}

function BmhVisualizer({ text, pattern }: { text: string; pattern: string }) {
  const [history, setHistory] = useState<BMHState[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [speed, setSpeed] = useState(500);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // Generate states
    const states: BMHState[] = [];
    const bct = buildBct(pattern);
    const n = text.length;
    const m = pattern.length;
    let comparisons = 0;
    
    if (m === 0) {
      states.push({ text, pattern, textIndex: 0, patternIndex: 0, bct, status: "done_match", shiftValue: 0, comparisons: 0 });
      setHistory(states);
      return;
    }

    let i = m - 1;
    let found = false;

    while (i < n) {
      let k = 0;
      
      while (k < m) {
        comparisons++;
        states.push({ text, pattern, textIndex: i - k, patternIndex: m - 1 - k, bct, status: "comparing", shiftValue: 0, comparisons });
        
        if (pattern[m - 1 - k] !== text[i - k]) {
          states.push({ text, pattern, textIndex: i - k, patternIndex: m - 1 - k, bct, status: "mismatch", shiftValue: 0, comparisons });
          break;
        }
        
        states.push({ text, pattern, textIndex: i - k, patternIndex: m - 1 - k, bct, status: "match", shiftValue: 0, comparisons });
        k++;
      }
      
      if (k === m) {
        found = true;
        states.push({ text, pattern, textIndex: i - m + 1, patternIndex: 0, bct, status: "done_match", shiftValue: 0, comparisons });
        break;
      }
      
      const charAtI = text[i];
      const shift = bct[charAtI] !== undefined ? bct[charAtI] : m;
      states.push({ text, pattern, textIndex: i, patternIndex: m - 1, bct, status: "shifting", shiftValue: shift, comparisons });
      i += shift;
    }
    
    if (!found) {
       states.push({ text, pattern, textIndex: i, patternIndex: 0, bct, status: "done_no_match", shiftValue: 0, comparisons });
    }
    
    setHistory(states);
    setStepIdx(0);
    setPlaying(false);
  }, [text, pattern]);

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

  if (history.length === 0) return null;
  const state = history[stepIdx];

  return (
    <div className="mt-4 p-4 border border-slate-700 bg-slate-900 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-200">BMH Animation</h4>
        <div className="flex gap-2 text-sm">
          <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded" onClick={() => setSpeed(1000)}>Slow</button>
          <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded" onClick={() => setSpeed(500)}>Normal</button>
          <button className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded" onClick={() => setSpeed(150)}>Fast</button>
        </div>
      </div>
      
      <div className="flex gap-2">
         <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300" onClick={() => setStepIdx(0)}><RotateCcw size={16}/></button>
         <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300" onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0}><SkipBack size={16}/></button>
         <button className="p-2 bg-blue-600 hover:bg-blue-500 rounded text-white" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause size={16}/> : <Play size={16}/>}
         </button>
         <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300" onClick={() => setStepIdx(Math.min(history.length - 1, stepIdx + 1))} disabled={stepIdx === history.length - 1}><SkipForward size={16}/></button>
         <div className="flex items-center ml-2 text-sm text-slate-400">Step {stepIdx + 1} / {history.length}</div>
      </div>

      <div className="overflow-x-auto text-xl font-mono pb-2">
        <div className="flex">
          {state.text.split('').map((char, idx) => (
             <div key={`text-${idx}`} className={`w-8 h-8 flex items-center justify-center border-b-2 
                ${state.status !== 'shifting' && state.status !== 'done_no_match' && state.status !== 'done_match' && idx === state.textIndex ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300' : 'border-slate-700 text-slate-300'}
             `}>
                {char === ' ' ? '\u00A0' : char}
             </div>
          ))}
        </div>
        <div className="flex" style={{ marginLeft: `${(state.status === 'done_match' ? state.textIndex : state.textIndex - state.patternIndex) * 2}rem` }}>
          {state.pattern.split('').map((char, idx) => {
             let colorClass = "border-slate-700 text-slate-400";
             if (state.status !== 'shifting' && state.status !== 'done_no_match' && state.status !== 'done_match' && idx === state.patternIndex) {
               if (state.status === 'comparing') colorClass = "border-blue-400 bg-blue-400/20 text-blue-300";
               if (state.status === 'match') colorClass = "border-emerald-400 bg-emerald-400/20 text-emerald-300";
               if (state.status === 'mismatch') colorClass = "border-red-400 bg-red-400/20 text-red-300";
             }
             return (
               <div key={`pat-${idx}`} className={`w-8 h-8 flex items-center justify-center border-t-2 ${colorClass}`}>
                 {char === ' ' ? '\u00A0' : char}
               </div>
             )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mt-4">
        <div>
          <h5 className="font-semibold text-slate-400 mb-2">Status & Info</h5>
          <div>Status: <span className="text-white font-medium capitalize">{state.status.replace("_", " ")}</span></div>
          <div>Comparisons: <span className="text-white">{state.comparisons}</span></div>
          {state.status === 'shifting' && <div>Shift Value: <span className="text-blue-400 font-bold">{state.shiftValue}</span></div>}
        </div>
        <div>
           <h5 className="font-semibold text-slate-400 mb-2">Bad Character Table</h5>
           <div className="flex flex-wrap gap-2">
             {Object.entries(state.bct).map(([k, v]) => (
               <div key={k} className="bg-slate-800 px-2 py-1 rounded text-xs">
                 <span className="text-slate-400">'{k}':</span> <span className="text-white font-mono">{v}</span>
               </div>
             ))}
             <div className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-500">
               * : {pattern.length}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

export default function ExactMatching() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [visSkill, setVisSkill] = useState<string | null>(null);

  useEffect(() => {
    getData<any[]>("/candidates").then(setCandidates).catch(() => {});
    getData<any[]>("/jobs").then(setJobs).catch(() => {});
  }, []);

  const runMatch = () => {
    if (!selectedCandidate || !selectedJob) return;
    
    // Simulate API logic locally just for display purposes since we have the data
    const cSkills = (selectedCandidate.normalized_skills || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const jSkills = (selectedJob.normalized_required_skills || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    
    const matched: string[] = [];
    const missing: string[] = [];
    
    const text = `, ${cSkills.join(", ")} ,`;
    
    jSkills.forEach((req: string) => {
       const pattern = `, ${req} ,`;
       if (text.includes(pattern)) {
          matched.push(req);
       } else {
          missing.push(req);
       }
    });
    
    setMatchResult({
       matched, missing, percentage: jSkills.length ? (matched.length / jSkills.length) * 100 : 0
    });
    setVisSkill(null);
  };

  return (
    <>
      <PageHeader title="BMH Exact Skill Matching" description="Algorithm Visualization for matching candidate skills to job requirements using Boyer-Moore-Horspool." />
      
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <label className="block text-sm text-slate-400 mb-2">Select Candidate</label>
          <select className="input" onChange={e => {
            setSelectedCandidate(candidates.find(c => c.id == e.target.value));
            setMatchResult(null);
          }}>
            <option value="">-- Choose Candidate --</option>
            {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.candidate_id})</option>)}
          </select>
          {selectedCandidate && (
             <div className="mt-3 text-sm">
                <div className="text-slate-400 text-xs uppercase mb-1">Normalized Skills</div>
                <div className="text-white">{selectedCandidate.normalized_skills || "None"}</div>
             </div>
          )}
        </Card>
        
        <Card>
          <label className="block text-sm text-slate-400 mb-2">Select Job</label>
          <select className="input" onChange={e => {
            setSelectedJob(jobs.find(j => j.id == e.target.value));
            setMatchResult(null);
          }}>
            <option value="">-- Choose Job --</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.job_id})</option>)}
          </select>
          {selectedJob && (
             <div className="mt-3 text-sm">
                <div className="text-slate-400 text-xs uppercase mb-1">Required Skills</div>
                <div className="text-white">{selectedJob.normalized_required_skills || "None"}</div>
             </div>
          )}
        </Card>
      </div>

      <div className="mb-6">
        <button className="btn-primary" onClick={runMatch} disabled={!selectedCandidate || !selectedJob}>
          Run BMH Match
        </button>
      </div>

      {matchResult && (
        <Card className="mb-6 border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold text-lg text-white">Match Result: <span className={matchResult.percentage >= 50 ? 'text-emerald-400' : 'text-red-400'}>{matchResult.percentage.toFixed(2)}%</span></h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
               <h4 className="font-semibold text-emerald-400 mb-2">Matched Skills</h4>
               <div className="flex flex-wrap gap-2">
                 {matchResult.matched.length === 0 ? <span className="text-slate-500">None</span> : null}
                 {matchResult.matched.map((s: string) => (
                    <button key={s} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded hover:bg-emerald-500/20" onClick={() => setVisSkill(s)}>
                      {s} (Visualize)
                    </button>
                 ))}
               </div>
            </div>
            <div>
               <h4 className="font-semibold text-red-400 mb-2">Missing Skills</h4>
               <div className="flex flex-wrap gap-2">
                 {matchResult.missing.length === 0 ? <span className="text-slate-500">None</span> : null}
                 {matchResult.missing.map((s: string) => (
                    <button key={s} className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500/20" onClick={() => setVisSkill(s)}>
                      {s} (Visualize)
                    </button>
                 ))}
               </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Click on any skill above to visualize the BMH algorithm searching for it in the candidate's skill list.</p>
        </Card>
      )}

      {visSkill && selectedCandidate && (
        <Card>
          <h3 className="font-semibold text-lg text-white mb-2">BMH Algorithm Trace: <span className="text-blue-400">{visSkill}</span></h3>
          <p className="text-sm text-slate-400 mb-4">Searching for pattern <code className="bg-slate-800 px-1 rounded">, {visSkill} ,</code> inside text <code className="bg-slate-800 px-1 rounded">, {selectedCandidate.normalized_skills || ""} ,</code></p>
          <BmhVisualizer text={`, ${selectedCandidate.normalized_skills || ""} ,`} pattern={`, ${visSkill} ,`} />
        </Card>
      )}
    </>
  );
}
