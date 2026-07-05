import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";

// Pages
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";

// Admin pages
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Skills from "./pages/Skills";
import Settings from "./pages/Settings";
import DatabaseStatus from "./pages/DatabaseStatus";
import ExactMatching from "./pages/ExactMatching";
import Benchmark from "./pages/Benchmark";
import StableMatching from "./pages/StableMatching";
import MatchEvaluation from "./pages/MatchEvaluation";

// Recruiter pages
import RecruiterDashboard from "./pages/RecruiterDashboard";
import RecruiterJobs from "./pages/RecruiterJobs";
import RecruiterMatched from "./pages/RecruiterMatched";

// Candidate pages
import CandidateDashboard from "./pages/CandidateDashboard";
import ResumeUpload from "./pages/ResumeUpload";
import CandidateProfile from "./pages/CandidateProfile";
import CandidateResults from "./pages/CandidateResults";

function AppShell() {
  const [open, setOpen] = useState(false);
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060b14]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {user && <Sidebar open={open} close={() => setOpen(false)} />}
      <div className={user ? "lg:pl-64" : ""}>
        {user && <Navbar menu={() => setOpen(true)} />}
        <main className={user ? "p-4 md:p-7" : ""}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={user ? <Navigate to={roleHome(user.role)} replace /> : <Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Admin routes */}
            <Route path="/" element={<ProtectedRoute allowedRoles={["admin"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute allowedRoles={["admin"]}><Jobs /></ProtectedRoute>} />
            <Route path="/skills" element={<ProtectedRoute allowedRoles={["admin"]}><Skills /></ProtectedRoute>} />
            <Route path="/database" element={<ProtectedRoute allowedRoles={["admin"]}><DatabaseStatus /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={["admin"]}><Settings /></ProtectedRoute>} />
            <Route path="/matching" element={<ProtectedRoute allowedRoles={["admin"]}><ExactMatching /></ProtectedRoute>} />
            <Route path="/benchmark" element={<ProtectedRoute allowedRoles={["admin"]}><Benchmark /></ProtectedRoute>} />
            <Route path="/evaluation" element={<ProtectedRoute allowedRoles={["admin"]}><MatchEvaluation /></ProtectedRoute>} />
            <Route path="/stable-matching" element={<ProtectedRoute allowedRoles={["admin"]}><StableMatching /></ProtectedRoute>} />

            {/* Recruiter routes */}
            <Route path="/recruiter" element={<ProtectedRoute allowedRoles={["recruiter"]}><RecruiterDashboard /></ProtectedRoute>} />
            <Route path="/recruiter/jobs" element={<ProtectedRoute allowedRoles={["recruiter"]}><RecruiterJobs /></ProtectedRoute>} />
            <Route path="/recruiter/jobs/new" element={<ProtectedRoute allowedRoles={["recruiter"]}><RecruiterJobs /></ProtectedRoute>} />
            <Route path="/recruiter/applicants" element={<ProtectedRoute allowedRoles={["recruiter"]}><PlaceholderPage title="Applicants" description="Applicant tracking coming in the next phase." /></ProtectedRoute>} />
            <Route path="/recruiter/matched" element={<ProtectedRoute allowedRoles={["recruiter"]}><RecruiterMatched /></ProtectedRoute>} />

            {/* Candidate routes */}
            <Route path="/candidate" element={<ProtectedRoute allowedRoles={["candidate"]}><CandidateDashboard /></ProtectedRoute>} />
            <Route path="/candidate/resume" element={<ProtectedRoute allowedRoles={["candidate"]}><ResumeUpload /></ProtectedRoute>} />
            <Route path="/candidate/profile" element={<ProtectedRoute allowedRoles={["candidate"]}><CandidateProfile /></ProtectedRoute>} />
            <Route path="/candidate/results" element={<ProtectedRoute allowedRoles={["candidate"]}><CandidateResults /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to={user ? roleHome(user.role) : "/login"} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function roleHome(role: string) {
  if (role === "admin") return "/";
  if (role === "recruiter") return "/recruiter";
  return "/candidate";
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 text-4xl">🚧</div>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-sm text-sm text-slate-400">{description}</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
