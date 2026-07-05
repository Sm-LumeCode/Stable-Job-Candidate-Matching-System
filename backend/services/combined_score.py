from typing import Dict, Any
from models.candidate import Candidate
from models.job import Job
from services.boyer_moore_horspool import match_candidate_to_job
from services.dp_fuzzy_match import skill_set_similarity


def compute_combined_score(candidate: Candidate, job: Job, weights: Dict[str, float], taxonomy_map: Dict[str, str] = None) -> Dict[str, Any]:
    if taxonomy_map is None:
        taxonomy_map = {}
        
    total_weight = sum(weights.values())
    if not (0.99 <= total_weight <= 1.01):
        raise ValueError(f"Weights must sum to 1.0, got {total_weight}")

    cand_skills_str = candidate.normalized_skills or ""
    job_skills_str = job.normalized_required_skills or ""
    
    cand_skills = [s.strip() for s in cand_skills_str.split(",") if s.strip()]
    req_skills = [s.strip() for s in job_skills_str.split(",") if s.strip()]
    
    bmh_cand_str = " , ".join(cand_skills)
    bmh_job_str = " , ".join(req_skills)
    
    bmh_res = match_candidate_to_job(bmh_cand_str, bmh_job_str)
    exact_match = (bmh_res.get("match_percentage", 0.0) / 100.0)
    
    # 2. DP Similarity

    dp_similarity = skill_set_similarity(cand_skills, req_skills, taxonomy_map)
    
    # 3. Experience
    cand_exp = candidate.experience_years or 0.0
    job_exp = job.min_experience_years or 0.0
    if job_exp <= 0:
        experience = 1.0 if cand_exp >= 0 else 0.0
    else:
        experience = max(0.0, 1.0 - min(abs(cand_exp - job_exp) / job_exp, 1.0))
        
    # 4. Salary
    cand_sal = candidate.desired_salary or 0.0
    job_sal = job.offered_salary or 0.0
    if job_sal <= 0:
        salary = 1.0
    elif cand_sal <= job_sal:
        salary = 1.0
    else:
        salary = max(0.0, 1.0 - (cand_sal - job_sal) / job_sal)
        
    # 5. Location
    cand_loc = (candidate.preferred_location or "").lower().strip()
    job_loc = (job.location or "").lower().strip()
    
    if cand_loc == job_loc and cand_loc != "":
        location = 1.0
    elif cand_loc == "" and job_loc == "":
        location = 1.0
    elif "remote" in cand_loc or "remote" in job_loc:
        location = 0.5
    else:
        location = 0.0
        
    w_em = weights.get("exact_match", 0.40)
    w_dp = weights.get("dp_similarity", 0.30)
    w_ex = weights.get("experience", 0.15)
    w_sa = weights.get("salary", 0.10)
    w_lo = weights.get("location", 0.05)
    
    total = (
        exact_match * w_em +
        dp_similarity * w_dp +
        experience * w_ex +
        salary * w_sa +
        location * w_lo
    )
    
    return {
        "total": round(total, 4),
        "breakdown": {
            "exact_match": {"score": round(exact_match, 4), "weight": w_em, "contribution": round(exact_match * w_em, 4)},
            "dp_similarity": {"score": round(dp_similarity, 4), "weight": w_dp, "contribution": round(dp_similarity * w_dp, 4)},
            "experience": {"score": round(experience, 4), "weight": w_ex, "contribution": round(experience * w_ex, 4)},
            "salary": {"score": round(salary, 4), "weight": w_sa, "contribution": round(salary * w_sa, 4)},
            "location": {"score": round(location, 4), "weight": w_lo, "contribution": round(location * w_lo, 4)}
        }
    }
