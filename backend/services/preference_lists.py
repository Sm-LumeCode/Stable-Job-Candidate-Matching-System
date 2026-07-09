from schemas import CandidatePreference, JobPreference
from services.combined_score import compute_combined_score

MIN_SCORE_THRESHOLD = 0.1


def generate_candidate_preferences(
    candidate,
    jobs,
    weights,
    taxonomy_map=None,
    applied_job_ids: set | None = None,
    preference_order: dict | None = None,
) -> CandidatePreference:
    """
    Generate ordered job preferences for a candidate.

    Args:
        candidate: Candidate ORM object
        jobs: list of all Job ORM objects
        weights: scoring weights dict
        taxonomy_map: skill taxonomy mapping
        applied_job_ids: if provided, only include jobs whose job_id is in this set
        preference_order: dict of {job_id: rank} — if provided, sort by candidate's saved order
    """
    if taxonomy_map is None:
        taxonomy_map = {}

    import json
    try:
        preferred_companies = json.loads(candidate.preferred_companies)
    except:
        preferred_companies = []

    # 1. Filter to applied jobs
    filtered_jobs = [
        j for j in jobs
        if applied_job_ids is None or j.job_id in applied_job_ids
    ]
    
    scored_jobs = []
    for job in filtered_jobs:
        try:
            res = compute_combined_score(candidate, job, weights, taxonomy_map)
            score = res["total"]
            if score >= MIN_SCORE_THRESHOLD:
                company_rank = preferred_companies.index(job.company_name) if job.company_name in preferred_companies else 999
                # Store tuple (company_rank, -score, job_id) so lower rank is better, and higher score is better
                scored_jobs.append((company_rank, -score, job.job_id))
        except Exception as e:
            print(f"Error scoring candidate {candidate.candidate_id} and job {job.job_id}: {e}")
            continue

    # Sort primarily by company rank (0=top choice), secondarily by score
    scored_jobs.sort()

    prefs = [j[2] for j in scored_jobs]
    return CandidatePreference(candidate_id=candidate.candidate_id, preferences=prefs)


def generate_job_preferences(
    job,
    candidates,
    weights,
    taxonomy_map=None,
    applied_candidate_ids: set | None = None,
) -> JobPreference:
    """
    Generate ordered candidate preferences for a job.

    Args:
        job: Job ORM object
        candidates: list of all Candidate ORM objects
        weights: scoring weights dict
        taxonomy_map: skill taxonomy mapping
        applied_candidate_ids: if provided, only include candidates in this set
    """
    if taxonomy_map is None:
        taxonomy_map = {}

    filtered_candidates = [
        c for c in candidates
        if applied_candidate_ids is None or c.candidate_id in applied_candidate_ids
    ]

    scored_cands = []
    for cand in filtered_candidates:
        try:
            res = compute_combined_score(cand, job, weights, taxonomy_map)
            score = res["total"]
            if score >= MIN_SCORE_THRESHOLD:
                scored_cands.append((cand.candidate_id, score))
        except Exception as e:
            print(f"Error scoring job {job.job_id} and candidate {cand.candidate_id}: {e}")
            continue

    scored_cands.sort(key=lambda x: x[1], reverse=True)
    prefs = [c[0] for c in scored_cands]
    return JobPreference(job_id=job.job_id, capacity=job.capacity, preferences=prefs)
