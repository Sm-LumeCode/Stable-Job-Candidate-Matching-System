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
    """Generates preference lists using only applied jobs and calls stable matching."""
    from models.candidate_application import CandidateApplication

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

    # 4. Build applied-job and applied-candidate lookup maps from CandidateApplication
    all_active_apps = db.query(CandidateApplication).filter(
        CandidateApplication.status.in_(["auto_applied", "manually_applied"])
    ).all()

    # candidate_id -> set of applied job_ids
    candidate_applied_jobs: dict[str, set[str]] = {}
    # candidate_id -> {job_id: preference_order} (for saved order)
    candidate_pref_order: dict[str, dict[str, int]] = {}
    # job_id -> set of applied candidate_ids
    job_applied_candidates: dict[str, set[str]] = {}

    for app in all_active_apps:
        candidate_applied_jobs.setdefault(app.candidate_id, set()).add(app.job_id)
        if app.preference_order is not None:
            candidate_pref_order.setdefault(app.candidate_id, {})[app.job_id] = app.preference_order
        job_applied_candidates.setdefault(app.job_id, set()).add(app.candidate_id)

    # 5. Generate preference lists — filtered by applied jobs/candidates
    c_prefs = []
    import json
    for c in candidates:
        # Only care about candidates who actually applied for jobs
        if not candidate_applied_jobs.get(c.candidate_id):
            continue
            
        c_prefs.append(
            generate_candidate_preferences(
                c, jobs, weights, taxonomy_map,
                applied_job_ids=candidate_applied_jobs.get(c.candidate_id),
                preference_order=candidate_pref_order.get(c.candidate_id),
            )
        )
    
    j_prefs = [
        generate_job_preferences(
            j, candidates, weights, taxonomy_map,
            applied_candidate_ids=job_applied_candidates.get(j.job_id),
        )
        for j in jobs
    ]

    # 6. Create payload for stable matching
    sm_payload = StableMatchingPayload(candidates=c_prefs, jobs=j_prefs)

    # 7. Execute stable matching
    result = execute_stable_matching(sm_payload, db)
    return result

def execute_final_matching_for_closed_jobs(db: Session):
    """Executes Gale-Shapley only for closed jobs and updates their candidates' final allocations."""
    from models.candidate_application import CandidateApplication
    from models.notification import Notification
    from models.job import Job
    
    # 1. Get closed jobs
    closed_jobs = db.query(Job).filter(Job.status == "CLOSED").all()
    if not closed_jobs:
        return
        
    closed_job_ids = {j.job_id for j in closed_jobs}
    
    # 2. Get applications for these closed jobs
    apps = db.query(CandidateApplication).filter(CandidateApplication.job_id.in_(closed_job_ids)).all()
    candidate_ids = {app.candidate_id for app in apps}
    
    candidates = db.query(Candidate).filter(Candidate.candidate_id.in_(candidate_ids)).all()
    
    # 3. Weights & Taxonomy
    sw = db.query(ScoreWeights).order_by(ScoreWeights.id.desc()).first()
    weights = {"exact_match": sw.exact_match, "dp_similarity": sw.dp_similarity, "experience": sw.experience, "salary": sw.salary, "location": sw.location} if sw else {"exact_match": 0.40, "dp_similarity": 0.30, "experience": 0.15, "salary": 0.10, "location": 0.05}
    taxonomies = db.query(SkillTaxonomy).all()
    taxonomy_map = {t.skill_term: t.canonical_skill for t in taxonomies}
    
    # 4. Generate prefs for these jobs and candidates
    candidate_applied_jobs = {}
    candidate_pref_order = {}
    job_applied_candidates = {}
    for app in apps:
        candidate_applied_jobs.setdefault(app.candidate_id, set()).add(app.job_id)
        if app.preference_order is not None:
            candidate_pref_order.setdefault(app.candidate_id, {})[app.job_id] = app.preference_order
        job_applied_candidates.setdefault(app.job_id, set()).add(app.candidate_id)
        
    c_prefs = []
    import json
    for c in candidates:
        c_prefs.append(
            generate_candidate_preferences(
                c, closed_jobs, weights, taxonomy_map,
                applied_job_ids=candidate_applied_jobs.get(c.candidate_id, set()),
                preference_order=candidate_pref_order.get(c.candidate_id, {}),
            )
        )
    
    j_prefs = [
        generate_job_preferences(
            j, candidates, weights, taxonomy_map,
            applied_candidate_ids=job_applied_candidates.get(j.job_id, set()),
        )
        for j in closed_jobs
    ]
    
    sm_payload = StableMatchingPayload(candidates=c_prefs, jobs=j_prefs)
    
    # 5. Run GS natively
    from services.gale_shapley import run_gale_shapley
    result = run_gale_shapley(sm_payload)
    
    matches = result["matches"]
    unmatched_candidates = result["unmatched_candidates"]
    
    # 6. Update candidate applications and generate notifications
    assigned_jobs_by_candidate = {m["candidate_id"]: m["job_id"] for m in matches}
    
    for app in apps:
        assigned_job_id = assigned_jobs_by_candidate.get(app.candidate_id)
        was_selected_for_this_job = (assigned_job_id == app.job_id)
        
        # If candidate is assigned to a different closed job, they are considered rejected for this one
        app.final_allocation = "selected" if was_selected_for_this_job else "rejected"
        
        # Generate candidate notification
        job_obj = next((j for j in closed_jobs if j.job_id == app.job_id), None)
        title = job_obj.title if job_obj else app.job_id
        company = job_obj.company_name if job_obj else ""
        
        # Delete old notifications for this application so they don't pile up on re-runs
        db.query(Notification).filter(
            Notification.user_identifier == app.candidate_id,
            Notification.message.like(f"%{title}%")
        ).delete(synchronize_session=False)
        
        if was_selected_for_this_job:
            msg = f"Congratulations! You have been selected for {title} at {company}."
            notif_type = "success"
            
            # Immediately remove from other job roles in all other companies
            if company:
                other_apps = db.query(CandidateApplication).join(Job, CandidateApplication.job_id == Job.job_id).filter(
                    CandidateApplication.candidate_id == app.candidate_id,
                    Job.company_name != company,
                    CandidateApplication.id != app.id
                ).all()
                for o_app in other_apps:
                    o_app.status = "cancelled"
                    o_app.final_allocation = "rejected_due_to_other_offer"
        else:
            msg = f"Recruitment has concluded for {title}. You were not allocated to this job."
            notif_type = "info"
            
        db.add(Notification(user_identifier=app.candidate_id, message=msg, type=notif_type))

    # Generate recruiter notifications
    for job in closed_jobs:
        if job.recruiter_id:
            # We don't have the recruiter username easily here, but we can look it up
            from models.user import User
            recruiter = db.get(User, job.recruiter_id)
            if recruiter:
                ident = recruiter.email or recruiter.username
                db.query(Notification).filter(
                    Notification.user_identifier == ident,
                    Notification.message.like(f"Recruitment closed successfully for {job.title}%")
                ).delete(synchronize_session=False)
                
                db.add(Notification(
                    user_identifier=ident,
                    message=f"Recruitment closed successfully for {job.title}. Final candidate allocation generated.",
                    type="success"
                ))
                
    db.commit()



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
    Returns candidates who applied for a job, ranked by combined score.
    Only candidates with status auto_applied or manually_applied are shown.
    """
    from models.candidate_application import CandidateApplication

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

    # Only applied candidates
    active_apps = (
        db.query(CandidateApplication)
        .filter(
            CandidateApplication.job_id == job_id,
            CandidateApplication.status.in_(["auto_applied", "manually_applied"]),
        )
        .all()
    )
    applied_ids = {a.candidate_id for a in active_apps}
    score_by_app = {a.candidate_id: a.compatibility_score for a in active_apps}

    candidates = db.query(Candidate).filter(Candidate.candidate_id.in_(applied_ids)).all()

    ranked = []
    for c in candidates:
        try:
            res = compute_combined_score(c, j, weights, taxonomy_map)
            total = res["total"]
        except Exception:
            total = score_by_app.get(c.candidate_id, 0.0)
        ranked.append({
            "candidate_id": c.candidate_id,
            "name": c.name,
            "email": c.email,
            "experience_years": c.experience_years,
            "desired_role": c.desired_role,
            "normalized_skills": c.normalized_skills,
            "total_score": total,
        })

    ranked.sort(key=lambda x: x["total_score"], reverse=True)
    return {"job_id": job_id, "job_title": j.title, "company": j.company_name, "candidates": ranked}
