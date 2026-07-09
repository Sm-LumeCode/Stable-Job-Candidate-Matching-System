import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Card, Badge } from "../components/ui";
import { DataTable } from "../components/DataTable";
import { request } from "../lib/api";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Job } from "../types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function JobFinalResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [jobData, resultsData] = await Promise.all([
          request<Job[]>(`/jobs`),
          request<any[]>(`/jobs/${id}/results`)
        ]);
        const currentJob = jobData.find(j => j.id === Number(id));
        if (currentJob) setJob(currentJob);
        setCandidates(resultsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results");
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadData();
    }
  }, [id]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Final Allocation Report: ${job?.title || 'Unknown Job'}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Company: ${job?.company_name || 'N/A'}`, 14, 32);
    doc.text(`Total Allocated: ${candidates.length} / ${job?.capacity || 0}`, 14, 38);
    
    const tableData = candidates.map(c => [
      c.name,
      c.email,
      c.skills || 'N/A',
      c.experience_years,
      c.education || 'N/A'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Candidate Name', 'Email', 'Skills', 'Experience (yrs)', 'Education']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9 }
    });

    doc.save(`StableHire_Report_${job?.job_id || 'Job'}.pdf`);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading final results...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/20 text-red-400">{error}</div>
        <button onClick={() => navigate("/jobs")} className="mt-4 text-emerald-400 hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Jobs
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Final Results: ${job?.title || 'Unknown Job'}`}
        description="These are the candidates finally allocated to this job by the matching algorithm."
        actions={
          <button className="btn-secondary flex items-center gap-2" onClick={() => navigate("/jobs")}>
            <ArrowLeft size={16} /> Back
          </button>
        }
      />
      <div className="px-4 md:px-7 mb-6">
        <div className="flex flex-wrap gap-4 items-center p-4 rounded-xl border border-slate-800 bg-slate-900/50">
          <div>
            <div className="text-sm text-slate-400 mb-1">Company</div>
            <div className="font-semibold text-white">{job?.company_name}</div>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div>
            <div className="text-sm text-slate-400 mb-1">Capacity</div>
            <Badge color="emerald">{job?.capacity}</Badge>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div>
            <div className="text-sm text-slate-400 mb-1">Total Allocated</div>
            <Badge color="blue">{candidates.length}</Badge>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div>
            <div className="text-sm text-slate-400 mb-1">Status</div>
            <Badge color="slate">{job?.status}</Badge>
          </div>
        </div>
      </div>
      
      <Card className="p-0 mx-4 md:mx-7">
        <div className="border-b border-slate-800 p-4 flex justify-between items-center">
          <h3 className="font-semibold text-white">Allocated Candidates</h3>
          {candidates.length > 0 && (
            <button onClick={generatePDF} className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
              <FileText size={14} /> Export PDF Report
            </button>
          )}
        </div>
        <DataTable headers={["Candidate", "Contact", "Skills", "Exp (yrs)", "Education", "Actions"]}>
          {candidates.length > 0 ? candidates.map((c, i) => (
            <tr key={c.id} className="hover:bg-slate-800/30">
              <td className="px-5 py-4">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-slate-500">{c.candidate_id}</div>
              </td>
              <td className="px-5 py-4">
                <div className="text-sm">{c.email}</div>
                <div className="text-xs text-slate-500">{c.phone || "—"}</div>
              </td>
              <td className="max-w-48 truncate px-5 py-4 text-xs text-slate-400">{c.skills || "—"}</td>
              <td className="px-5 py-4 text-center">{c.experience_years}</td>
              <td className="px-5 py-4 max-w-48 truncate text-xs text-slate-400">{c.education || "—"}</td>
              <td className="px-5 py-4">
                {c.resume_filename && (
                  <a href={`http://localhost:8000/uploads/resumes/${c.resume_filename}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1">
                    <Download size={14} /> Resume
                  </a>
                )}
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6} className="p-12 text-center text-slate-500">
                No candidates were allocated to this job.
              </td>
            </tr>
          )}
        </DataTable>
      </Card>
    </>
  );
}
