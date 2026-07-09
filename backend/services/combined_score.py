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
    if job_exp <= 0 or cand_exp >= job_exp:
        experience = 1.0
    else:
        experience = cand_exp / job_exp
        
    # 4. Education
    education_str = (candidate.education or "").lower()
    if not education_str:
        education = 0.0
    else:
        relevant_keywords = ["computer science", "ai", "artificial intelligence", "data science", "information science", "software engineering"]
        if any(kw in education_str for kw in relevant_keywords):
            education = 1.0
        else:
            education = 0.5
            
    # Fixed weights ignoring the db parameters
    w_em = 0.50
    w_dp = 0.35
    w_ex = 0.10
    w_ed = 0.05
    
    total = (
        exact_match * w_em +
        dp_similarity * w_dp +
        experience * w_ex +
        education * w_ed
    )
    
    return {
        "total": round(total, 4),
        "breakdown": {
            "exact_match": {"score": round(exact_match, 4), "weight": w_em, "contribution": round(exact_match * w_em, 4)},
            "dp_similarity": {"score": round(dp_similarity, 4), "weight": w_dp, "contribution": round(dp_similarity * w_dp, 4)},
            "experience": {"score": round(experience, 4), "weight": w_ex, "contribution": round(experience * w_ex, 4)},
            "education": {"score": round(education, 4), "weight": w_ed, "contribution": round(education * w_ed, 4)}
        }
    }
