import { useState, useEffect, useCallback } from "react";
import {
  Save, Loader2, AlertCircle, Building2, Trophy, ArrowRight, X
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/ui";
import { getData, request } from "../lib/api";
import type { ApplicationsResponse } from "../types";

export default function CandidatePreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getData<ApplicationsResponse & { preferred_companies: string[] }>("/applications/my");
      
      const uniqueCompanies = Array.from(new Set(res.jobs.map(j => j.company_name))).filter(Boolean).sort();
      setAvailableCompanies(uniqueCompanies);
      setPreferences(res.preferred_companies || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleCompany = (company: string) => {
    setSuccess(false);
    if (preferences.includes(company)) {
      setPreferences(preferences.filter(c => c !== company));
    } else {
      if (preferences.length < 3) {
        setPreferences([...preferences, company]);
      } else {
        setError("You can only select up to 3 companies. Remove one first.");
      }
    }
  };

  const removeCompany = (index: number) => {
    setSuccess(false);
    const newPrefs = [...preferences];
    newPrefs.splice(index, 1);
    setPreferences(newPrefs);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setSuccess(false);
    const newPrefs = [...preferences];
    const temp = newPrefs[index - 1];
    newPrefs[index - 1] = newPrefs[index];
    newPrefs[index] = temp;
    setPreferences(newPrefs);
  };

  const moveDown = (index: number) => {
    if (index === preferences.length - 1) return;
    setSuccess(false);
    const newPrefs = [...preferences];
    const temp = newPrefs[index + 1];
    newPrefs[index + 1] = newPrefs[index];
    newPrefs[index] = temp;
    setPreferences(newPrefs);
  };

  const save = async () => {
    if (preferences.length !== 3) {
      setError("Please select exactly 3 preferred companies.");
      return;
    }
    
    setSaving(true);
    setError("");
    setSuccess(false);
    
    try {
      await request("/applications/preferences", {
        method: "PUT",
        body: JSON.stringify({ company_names: preferences }),
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="My Preferences" description="Loading companies..." />
        <Card className="flex flex-col items-center py-20 text-center">
          <Loader2 size={36} className="animate-spin text-blue-400 mb-4" />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="My Preferences" 
        description="Choose your Top 3 preferred companies for the Gale–Shapley matching algorithm." 
        actions={
          <button
            onClick={save}
            disabled={saving || preferences.length !== 3}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Preferences
          </button>
        }
      />

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">
          <Trophy size={18} /> Preferences saved successfully! You can now view and apply to jobs.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Available Companies Selection */}
        <Card>
          <div className="mb-5 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building2 className="text-blue-400" size={20} />
              All Available Companies
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Select companies to add them to your top preferences.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {availableCompanies.length === 0 ? (
              <p className="text-sm text-slate-500">No companies have posted jobs yet.</p>
            ) : (
              availableCompanies.map(company => {
                const isSelected = preferences.includes(company);
                return (
                  <button
                    key={company}
                    onClick={() => toggleCompany(company)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      isSelected
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                        : "border-slate-700 bg-slate-900/50 text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
                    }`}
                  >
                    {company}
                    {isSelected && <ArrowRight size={14} />}
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Selected Top 3 */}
        <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
          <div className="mb-5 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="text-emerald-400" size={20} />
              Your Top 3 Preferences
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Arrange these in strict order from most to least preferred.
            </p>
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map((index) => {
              const company = preferences[index];
              const displayRank = index === 0 ? "1st Choice" : index === 1 ? "2nd Choice" : "3rd Choice";
              const rankColor = index === 0 ? "text-amber-400 bg-amber-400/10" : index === 1 ? "text-slate-300 bg-slate-300/10" : "text-amber-700 bg-amber-700/10";
              
              if (!company) {
                return (
                  <div key={index} className="flex h-16 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 text-sm text-slate-500">
                    Select a company for your {displayRank}...
                  </div>
                );
              }

              return (
                <div key={company} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 items-center justify-center rounded-lg px-3 font-bold ${rankColor}`}>
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{company}</div>
                      <div className="text-xs text-slate-400">{displayRank}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1 mr-2">
                      <button 
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                      </button>
                      <button 
                        onClick={() => moveDown(index)}
                        disabled={index === preferences.length - 1}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </button>
                    </div>
                    <button
                      onClick={() => removeCompany(index)}
                      className="rounded-lg p-2 text-red-400 hover:bg-red-400/10 transition"
                      title="Remove"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 flex justify-center">
            <p className="text-xs text-slate-500 text-center max-w-sm">
              The matching algorithm heavily weights your #1 choice. Be sure to order these accurately.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
