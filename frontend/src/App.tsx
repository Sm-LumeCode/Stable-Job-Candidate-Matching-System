import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Skills from "./pages/Skills";
import Settings from "./pages/Settings";
import ResumeUpload from "./pages/ResumeUpload";
import DatabaseStatus from "./pages/DatabaseStatus";

export default function App() {
  const [open, setOpen] = useState(false);
  return <div className="min-h-screen"><Sidebar open={open} close={() => setOpen(false)} /><div className="lg:pl-64"><Navbar menu={() => setOpen(true)} /><main className="p-4 md:p-7"><Routes>
    <Route path="/" element={<Dashboard />} /><Route path="/resume-upload" element={<ResumeUpload />} /><Route path="/jobs" element={<Jobs />} />
    <Route path="/skills" element={<Skills />} /><Route path="/database" element={<DatabaseStatus />} /><Route path="/settings" element={<Settings />} />
  </Routes></main></div></div>;
}
