import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, ToggleLeft, ToggleRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/ui";
import { getData, request } from "../lib/api";
import type { AppSettings } from "../types";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getData<AppSettings>("/settings");
      setSettings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const toggleAi = async () => {
    if (!settings) return;
    const nextState = !settings.ai_parsing_enabled;
    setSaving(true);
    setMessage("");
    try {
      await request("/settings", {
        method: "PUT",
        body: JSON.stringify({ ai_parsing_enabled: nextState }),
      });
      setSettings({ ...settings, ai_parsing_enabled: nextState });
      setMessage("Settings saved successfully.");
    } catch (e) {
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="System Settings" description="Configure AI integrations and system-wide parameters." />
      
      {loading ? (
        <Card className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-500" />
        </Card>
      ) : settings ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* AI Parsing Settings */}
          <Card>
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                <BrainCircuit size={20} />
              </div>
              <h2 className="text-lg font-semibold text-white">AI Resume Parsing</h2>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div>
                  <div className="font-medium text-white">Enable Groq AI Extraction</div>
                  <div className="text-sm text-slate-400">Intelligently understand resumes using LLMs.</div>
                </div>
                <button
                  onClick={toggleAi}
                  disabled={saving}
                  className={`text-3xl transition-colors ${
                    settings.ai_parsing_enabled ? "text-emerald-500" : "text-slate-600"
                  }`}
                >
                  {settings.ai_parsing_enabled ? <ToggleRight /> : <ToggleLeft />}
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 uppercase tracking-widest">
                  Language Model
                </label>
                <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                  {settings.groq_model}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400 uppercase tracking-widest">
                  API Key Status
                </label>
                <div className={`flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                  settings.api_key_configured 
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
                  : "border-red-500/20 bg-red-500/10 text-red-400"
                }`}>
                  {settings.api_key_configured ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {settings.api_key_configured ? "Configured (from .env)" : "Missing GROQ_API_KEY"}
                </div>
                {!settings.api_key_configured && (
                  <p className="mt-2 text-xs text-slate-500">
                    The parser will automatically fall back to rule-based extraction until a valid key is provided.
                  </p>
                )}
              </div>
            </div>
            
            {message && (
              <div className="mt-4 rounded-md border border-slate-700 bg-slate-800/50 p-3 text-sm text-white">
                {message}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card>Failed to load settings.</Card>
      )}
    </>
  );
}
