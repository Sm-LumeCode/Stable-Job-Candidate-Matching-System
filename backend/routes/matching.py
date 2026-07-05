from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Candidate, Job, ExactMatchResult
from services.boyer_moore_horspool import match_candidate_to_job

router = APIRouter(prefix="/matching", tags=["matching"])

@router.post("/exact")
def run_exact_matching(db: Session = Depends(get_db)):
    """Runs BMH exact matching for every candidate against every job."""
    candidates = db.query(Candidate).all()
    jobs = db.query(Job).all()
    
    # Clear old exact matches
    db.query(ExactMatchResult).delete()
    
    results = []
    
    for c in candidates:
        for j in jobs:
            c_skills = c.normalized_skills or ""
            j_skills = j.normalized_required_skills or ""
            
            match_data = match_candidate_to_job(c_skills, j_skills)
            
            result = ExactMatchResult(
                candidate_id=c.candidate_id,
                job_id=j.job_id,
                matched_skills=match_data["matched_skills"],
                missing_skills=match_data["missing_skills"],
                exact_match_count=match_data["exact_match_count"],
                total_required_skills=match_data["total_required_skills"],
                match_percentage=match_data["match_percentage"]
            )
            db.add(result)
            results.append(result)
            
    db.commit()
    return {"message": f"Successfully processed {len(results)} candidate-job pairs using BMH"}


@router.get("/candidate/{candidate_id}")
def get_candidate_matches(candidate_id: str, db: Session = Depends(get_db)):
    """Returns all exact match results for a candidate."""
    results = db.query(ExactMatchResult).filter(ExactMatchResult.candidate_id == candidate_id).order_by(ExactMatchResult.match_percentage.desc()).all()
    return results


@router.get("/job/{job_id}")
def get_job_rankings(job_id: str, db: Session = Depends(get_db)):
    """Returns all candidate rankings for a job."""
    results = db.query(ExactMatchResult).filter(ExactMatchResult.job_id == job_id).order_by(ExactMatchResult.match_percentage.desc()).all()
    return results

from pydantic import BaseModel
from typing import Dict, Optional
from models import ScoreWeights, SkillTaxonomy
from schemas import StableMatchingPayload
from services.preference_lists import generate_candidate_preferences, generate_job_preferences
from routes.stable_matching import execute_stable_matching

class GeneratePreferencesPayload(BaseModel):
    weights: Optional[Dict[str, float]] = None

@router.post("/preferences/generate")
def generate_and_execute_matching(payload: GeneratePreferencesPayload, db: Session = Depends(get_db)):
    """Generates preference lists and calls stable matching."""
    # 1. Get weights
    weights = payload.weights
    if not weights:
        sw = db.query(ScoreWeights).order_by(ScoreWeights.id.desc()).first()
        if sw:
            weights = {
                "exact_match": sw.exact_match,
                "dp_similarity": sw.dp_similarity,
                "experience": sw.experience,
                "salary": sw.salary,
                "location": sw.location
            }
        else:
            weights = {"exact_match": 0.40, "dp_similarity": 0.30, "experience": 0.15, "salary": 0.10, "location": 0.05}
            
    # 2. Get taxonomy
    taxonomies = db.query(SkillTaxonomy).all()
    taxonomy_map = {t.skill_term: t.canonical_skill for t in taxonomies}
    
    # 3. Get candidates and jobs
    candidates = db.query(Candidate).all()
    jobs = db.query(Job).all()
    
    # 4. Generate preference lists
    c_prefs = [generate_candidate_preferences(c, jobs, weights, taxonomy_map) for c in candidates]
    j_prefs = [generate_job_preferences(j, candidates, weights, taxonomy_map) for j in jobs]
    
    # 5. Create payload for stable matching
    sm_payload = StableMatchingPayload(candidates=c_prefs, jobs=j_prefs)
    
    # 6. Execute stable matching
    result = execute_stable_matching(sm_payload, db)
    return result

from services.baselines import greedy_match, random_match
from services.combined_score import compute_combined_score

@router.get("/baselines")
def get_baselines(db: Session = Depends(get_db)):
    """Runs greedy and random baseline matchings for comparison."""
    sw = db.query(ScoreWeights).order_by(ScoreWeights.id.desc()).first()
    if sw:
        weights = {
            "exact_match": sw.exact_match,
            "dp_similarity": sw.dp_similarity,
            "experience": sw.experience,
            "salary": sw.salary,
            "location": sw.location
        }
    else:
        weights = {"exact_match": 0.40, "dp_similarity": 0.30, "experience": 0.15, "salary": 0.10, "location": 0.05}
        
    taxonomies = db.query(SkillTaxonomy).all()
    taxonomy_map = {t.skill_term: t.canonical_skill for t in taxonomies}
    
    candidates = db.query(Candidate).all()
    jobs = db.query(Job).all()
    
    score_map = {}
    for c in candidates:
        for j in jobs:
            try:
                res = compute_combined_score(c, j, weights, taxonomy_map)
                score_map[(c.candidate_id, j.job_id)] = res["total"]
            except Exception:
                pass
                
    c_prefs = [generate_candidate_preferences(c, jobs, weights, taxonomy_map) for c in candidates]
    j_prefs = [generate_job_preferences(j, candidates, weights, taxonomy_map) for j in jobs]
    
    greedy_res = greedy_match(c_prefs, j_prefs, score_map)
    random_res = random_match(c_prefs, j_prefs, seed=42)
    
    return {
        "greedy": greedy_res,
        "random": random_res
    }
from services.auditor import find_blocking_pairs, compute_regret

@router.get("/audit")
def audit_matching(method: str = "stable", db: Session = Depends(get_db)):
    """Audits the matching result for stability and regret."""
    sw = db.query(ScoreWeights).order_by(ScoreWeights.id.desc()).first()
    if sw:
        weights = {
            "exact_match": sw.exact_match,
            "dp_similarity": sw.dp_similarity,
            "experience": sw.experience,
            "salary": sw.salary,
            "location": sw.location
        }
    else:
        weights = {"exact_match": 0.40, "dp_similarity": 0.30, "experience": 0.15, "salary": 0.10, "location": 0.05}
        
    taxonomies = db.query(SkillTaxonomy).all()
    taxonomy_map = {t.skill_term: t.canonical_skill for t in taxonomies}
    
    candidates = db.query(Candidate).all()
    jobs = db.query(Job).all()
    
    c_prefs = [generate_candidate_preferences(c, jobs, weights, taxonomy_map) for c in candidates]
    j_prefs = [generate_job_preferences(j, candidates, weights, taxonomy_map) for j in jobs]
    
    if method == "stable":
        sm_payload = StableMatchingPayload(candidates=c_prefs, jobs=j_prefs)
        result = execute_stable_matching(sm_payload, db)
        matches = result.get("matches", [])
    else:
        score_map = {}
        for c in candidates:
            for j in jobs:
                try:
                    res = compute_combined_score(c, j, weights, taxonomy_map)
                    score_map[(c.candidate_id, j.job_id)] = res["total"]
                except Exception:
                    pass
        if method == "greedy":
            matches = greedy_match(c_prefs, j_prefs, score_map)
        elif method == "random":
            matches = random_match(c_prefs, j_prefs, seed=42)
        else:
            return {"error": "Invalid method. Choose stable, greedy, or random."}
            
    blocking_pairs = find_blocking_pairs(matches, c_prefs, j_prefs)
    regret_metrics = compute_regret(matches, c_prefs, j_prefs)
    
    return {
        "method": method,
        "blocking_pairs": blocking_pairs,
        "blocking_pairs_count": len(blocking_pairs),
        "regret_metrics": regret_metrics
    }

from services.benchmark_fuzzy import run_fuzzy_benchmark

@router.get("/benchmark/fuzzy")
def benchmark_fuzzy():
    """Runs a runtime benchmark comparing DP vs Naive recursive fuzzy matching."""
    return run_fuzzy_benchmark()

from services.evaluation import run_evaluations

@router.get("/evaluation")
def evaluation_dashboard(db: Session = Depends(get_db)):
    """Runs evaluations comparing methods and weight sensitivities."""
    return run_evaluations(db)

from fastapi import HTTPException
from models import Candidate, Job, ScoreWeights, SkillTaxonomy
from services.combined_score import compute_combined_score

@router.get("/explain/{candidate_id}/{job_id}")
def explain_match(candidate_id: str, job_id: str, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    j = db.query(Job).filter(Job.job_id == job_id).first()
    if not c or not j:
        raise HTTPException(status_code=404, detail="Candidate or Job not found")
        
    sw = db.query(ScoreWeights).order_by(ScoreWeights.id.desc()).first()
    if sw:
        weights = {
            "exact_match": sw.exact_match,
            "dp_similarity": sw.dp_similarity,
            "experience": sw.experience,
            "salary": sw.salary,
            "location": sw.location
        }
    else:
        weights = {"exact_match": 0.40, "dp_similarity": 0.30, "experience": 0.15, "salary": 0.10, "location": 0.05}
        
    taxonomies = db.query(SkillTaxonomy).all()
    taxonomy_map = {t.skill_term: t.canonical_skill for t in taxonomies}
    
    result = compute_combined_score(c, j, weights, taxonomy_map)
    return result["breakdown"]


@router.get("/job-candidates/{job_id}")
def get_ranked_candidates_for_job(job_id: str, db: Session = Depends(get_db)):
    """
    Returns candidates ranked by combined score for a given job_id.
    Used by the recruiter Matched Candidates view.
    """
    j = db.query(Job).filter(Job.job_id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")

    sw = db.query(ScoreWeights).order_by(ScoreWeights.id.desc()).first()
    if sw:
        weights = {
            "exact_match": sw.exact_match,
            "dp_similarity": sw.dp_similarity,
            "experience": sw.experience,
            "salary": sw.salary,
            "location": sw.location,
        }
    else:
        weights = {"exact_match": 0.40, "dp_similarity": 0.30, "experience": 0.15, "salary": 0.10, "location": 0.05}

    taxonomies = db.query(SkillTaxonomy).all()
    taxonomy_map = {t.skill_term: t.canonical_skill for t in taxonomies}

    candidates = db.query(Candidate).all()

    ranked = []
    for c in candidates:
        try:
            res = compute_combined_score(c, j, weights, taxonomy_map)
            ranked.append({
                "candidate_id": c.candidate_id,
                "name": c.name,
                "email": c.email,
                "experience_years": c.experience_years,
                "desired_role": c.desired_role,
                "normalized_skills": c.normalized_skills,
                "total_score": res["total"],
            })
        except Exception:
            pass

    ranked.sort(key=lambda x: x["total_score"], reverse=True)
    return {"job_id": job_id, "job_title": j.title, "company": j.company_name, "candidates": ranked}
