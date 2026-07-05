from schemas import CandidatePreference, JobPreference
from services.combined_score import compute_combined_score

MIN_SCORE_THRESHOLD = 0.1

def generate_candidate_preferences(candidate, jobs, weights, taxonomy_map=None) -> CandidatePreference:
    scored_jobs = []
    for job in jobs:
        try:
            res = compute_combined_score(candidate, job, weights, taxonomy_map)
            score = res["total"]
            if score >= MIN_SCORE_THRESHOLD:
                scored_jobs.append((job.job_id, score))
        except Exception as e:
            print(f"Error scoring candidate {candidate.candidate_id} and job {job.job_id}: {e}")
            continue
            
    # Sort by score descending
    scored_jobs.sort(key=lambda x: x[1], reverse=True)
    prefs = [j[0] for j in scored_jobs]
    return CandidatePreference(candidate_id=candidate.candidate_id, preferences=prefs)

def generate_job_preferences(job, candidates, weights, taxonomy_map=None) -> JobPreference:
    scored_cands = []
    for cand in candidates:
        try:
            res = compute_combined_score(cand, job, weights, taxonomy_map)
            score = res["total"]
            if score >= MIN_SCORE_THRESHOLD:
                scored_cands.append((cand.candidate_id, score))
        except Exception as e:
            print(f"Error scoring job {job.job_id} and candidate {cand.candidate_id}: {e}")
            continue
            
    # Sort by score descending
    scored_cands.sort(key=lambda x: x[1], reverse=True)
    prefs = [c[0] for c in scored_cands]
    return JobPreference(job_id=job.job_id, capacity=job.capacity, preferences=prefs)
