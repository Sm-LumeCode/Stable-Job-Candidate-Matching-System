import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
const data = [{ size: 100, naive: 12, bmh: 5, gale: 8 }, { size: 500, naive: 45, bmh: 15, gale: 24 }, { size: 1000, naive: 98, bmh: 27, gale: 48 }, { size: 2500, naive: 245, bmh: 61, gale: 105 }];
export function BenchmarkChart() {
  return <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid stroke="#1e293b" strokeDasharray="3 3" /><XAxis dataKey="size" stroke="#64748b" /><YAxis stroke="#64748b" /><Tooltip contentStyle={{ background: "#0d1422", border: "1px solid #334155", borderRadius: 8 }} /><Line type="monotone" dataKey="naive" stroke="#3b82f6" strokeWidth={2} /><Line type="monotone" dataKey="bmh" stroke="#10b981" strokeWidth={2} /><Line type="monotone" dataKey="gale" stroke="#a78bfa" strokeWidth={2} /></LineChart></ResponsiveContainer></div>;
}

