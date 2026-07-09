export interface SkillMetadata {
  name: string;
  confidence: number;
  source: string;
  reason: string;
}

export interface Candidate {
  id: number;
  candidate_id: string;
  name: string;
  email?: string;
  phone?: string;
  skills: string;               // original extracted skills
  ai_skills: string;            // groq extracted skills string
  ai_extraction_metadata: string; // JSON string of SkillMetadata[]
  normalized_skills: string;    // taxonomy-canonical skills
  experience_years: number;
  desired_role: string;
  desired_salary?: number;
  preferred_location: string;
  education: string;
  resume_filename?: string;
  resume_text: string;
}

export interface AppSettings {
  ai_parsing_enabled: boolean;
  groq_model: string;
  api_key_configured: boolean;
  recruitment_status: string;
  application_threshold?: number;
}

export interface Job {
  id: number;
  job_id: string;
  title: string;
  company_name: string;
  required_skills: string;              // original required skills
  normalized_required_skills: string;   // taxonomy-canonical skills
  min_experience_years: number;
  offered_salary?: number;
  location: string;
  capacity: number;
  description: string;
  status?: string;
  recruiter_id?: number;
}

export interface Skill {
  id: number;
  skill_term: string;
  canonical_skill: string;
  category: string;
}

export interface DatabaseStatus {
  database: string;
  total_jobs: number;
  total_companies: number;
  total_capacity: number;
  total_skills: number;
  total_candidates: number;
  setup_complete: boolean;
  closed_jobs: number;
}

export type ApplicationStatus = "auto_applied" | "manually_applied" | "cancelled" | "not_applied";

export interface JobWithApplication {
  job_id: string;
  job_title: string;
  company_name: string;
  location: string;
  required_skills: string;
  min_experience_years: number;
  offered_salary?: number;
  compatibility_score: number;
  status: ApplicationStatus;
  preference_order: number | null;
}

export interface ApplicationsResponse {
  candidate_id: string;
  threshold: number;
  jobs: JobWithApplication[];
}
