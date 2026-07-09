"""
Applications Route
==================
Handles the full candidate application workflow:
 - compute compatibility scores against all jobs and auto-apply by threshold
 - list my applications
 - manually apply / cancel
 - save preference order
 - recruiter: list applicants for a job
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Candidate, Job, ScoreWeights, SkillTaxonomy
from models.candidate_application import CandidateApplication
from models.settings import AppSettings
from models.user import User
from auth import get_current_user, require_admin_or_recruiter
from services.combined_score import compute_combined_score

router = APIRouter(prefix="/applications", tags=["applications"])


# ─── helpers ──────────────────────────────────────────────────────────────────

def _get_weights(db: Session) -> dict:
    sw = db.query(ScoreWeights).order_by(ScoreWeights.id.desc()).first()
    if sw:
        return {
            "exact_match": sw.exact_match,
            "dp_similarity": sw.dp_similarity,
            "experience": sw.experience,
            "salary": sw.salary,
            "location": sw.location,
        }
    return {"exact_match": 0.40, "dp_similarity": 0.30, "experience": 0.15, "salary": 0.10, "location": 0.05}


def _get_taxonomy(db: Session) -> dict:
    return {t.skill_term: t.canonical_skill for t in db.query(SkillTaxonomy).all()}


def _find_candidate(user: User, db: Session) -> Candidate:
    # 1. Match by user_id first (most reliable)
    c = db.query(Candidate).filter(Candidate.user_id == user.id).first()
    if c:
        return c

    # 2. Fallback to email
    if user.email:
        c = db.query(Candidate).filter(Candidate.email == user.email).first()
        
    # 3. Fallback to username matching name
    if not c:
        c = db.query(Candidate).filter(Candidate.name.ilike(user.username)).first()
        
    # If found by fallback, link them for next time
    if c and not c.user_id:
        c.user_id = user.id
        db.commit()
        
    if not c:
        raise HTTPException(404, "No candidate profile found. Please upload your resume first.")
    return c


# ─── POST /applications/compute ───────────────────────────────────────────────

@router.post("/compute")
def compute_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compute compatibility score for this candidate against every job.
    - Jobs with score >= threshold → auto_applied (or kept as-is if already applied/cancelled)
    - Jobs with score < threshold → not created unless already manually_applied
    Returns the full list of job scores with application status.
    """
    candidate = _find_candidate(current_user, db)
    weights = _get_weights(db)
    taxonomy = _get_taxonomy(db)

    settings = db.query(AppSettings).first()
    threshold = settings.application_threshold if settings else 0.70

    jobs = db.query(Job).all()

    # Existing applications keyed by job_id
    existing: dict[str, CandidateApplication] = {
        a.job_id: a
        for a in db.query(CandidateApplication)
        .filter(CandidateApplication.candidate_id == candidate.candidate_id)
        .all()
    }

    results = []

    for job in jobs:
        try:
            res = compute_combined_score(candidate, job, weights, taxonomy)
            score = res["total"]
        except Exception:
            score = 0.0

        app = existing.get(job.job_id)

        if app is None:
            # Create new application record only if auto-apply threshold is met
            if score >= threshold:
                app = CandidateApplication(
                    candidate_id=candidate.candidate_id,
                    job_id=job.job_id,
                    status="auto_applied",
                    compatibility_score=score,
                )
                db.add(app)
            else:
                # No application yet, below threshold — just report score
                results.append({
                    "job_id": job.job_id,
                    "job_title": job.title,
                    "company_name": job.company_name,
                    "location": job.location,
                    "required_skills": job.required_skills,
                    "min_experience_years": job.min_experience_years,
                    "offered_salary": job.offered_salary,
                    "compatibility_score": round(score, 4),
                    "status": "not_applied",
                    "preference_order": None,
                })
                continue
        else:
            # Update score but preserve existing status
            app.compatibility_score = score

        results.append({
            "job_id": job.job_id,
            "job_title": job.title,
            "company_name": job.company_name,
            "location": job.location,
            "required_skills": job.required_skills,
            "min_experience_years": job.min_experience_years,
            "offered_salary": job.offered_salary,
            "compatibility_score": round(score, 4),
            "status": app.status,
            "preference_order": app.preference_order,
        })

    db.commit()
    results.sort(key=lambda x: x["compatibility_score"], reverse=True)
    return {"candidate_id": candidate.candidate_id, "threshold": threshold, "jobs": results}


# ─── GET /applications/my ─────────────────────────────────────────────────────

@router.get("/my")
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all jobs with this candidate's application status and scores."""
    candidate = _find_candidate(current_user, db)
    weights = _get_weights(db)
    taxonomy = _get_taxonomy(db)

    jobs = db.query(Job).all()
    job_map = {j.job_id: j for j in jobs}

    apps: dict[str, CandidateApplication] = {
        a.job_id: a
        for a in db.query(CandidateApplication)
        .filter(CandidateApplication.candidate_id == candidate.candidate_id)
        .all()
    }

    settings = db.query(AppSettings).first()
    threshold = settings.application_threshold if settings else 0.70

    results = []
    for job in jobs:
        app = apps.get(job.job_id)
        if app:
            score = app.compatibility_score
            status = app.status
            pref = app.preference_order
        else:
            try:
                res = compute_combined_score(candidate, job, weights, taxonomy)
                score = res["total"]
            except Exception:
                score = 0.0
            status = "not_applied"
            pref = None

        results.append({
            "job_id": job.job_id,
            "job_title": job.title,
            "company_name": job.company_name,
            "location": job.location,
            "required_skills": job.required_skills,
            "min_experience_years": job.min_experience_years,
            "offered_salary": job.offered_salary,
            "compatibility_score": round(score, 4),
            "status": status,
            "preference_order": pref,
        })

    results.sort(key=lambda x: x["compatibility_score"], reverse=True)
    import json
    try:
        preferred_companies = json.loads(candidate.preferred_companies)
    except:
        preferred_companies = []
    return {
        "candidate_id": candidate.candidate_id, 
        "threshold": threshold, 
        "jobs": results,
        "preferred_companies": preferred_companies
    }


# ─── POST /applications/apply/{job_id} ────────────────────────────────────────

@router.post("/apply/{job_id}")
def apply_to_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually apply a candidate to a job."""
    candidate = _find_candidate(current_user, db)
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    app = (
        db.query(CandidateApplication)
        .filter(
            CandidateApplication.candidate_id == candidate.candidate_id,
            CandidateApplication.job_id == job_id,
        )
        .first()
    )

    weights = _get_weights(db)
    taxonomy = _get_taxonomy(db)
    try:
        res = compute_combined_score(candidate, job, weights, taxonomy)
        score = res["total"]
    except Exception:
        score = 0.0

    if app:
        app.status = "manually_applied"
        app.compatibility_score = score
    else:
        app = CandidateApplication(
            candidate_id=candidate.candidate_id,
            job_id=job_id,
            status="manually_applied",
            compatibility_score=score,
        )
        db.add(app)

    db.commit()
    return {"message": "Applied successfully", "job_id": job_id, "status": "manually_applied"}


# ─── DELETE /applications/cancel/{job_id} ─────────────────────────────────────

@router.delete("/cancel/{job_id}")
def cancel_application(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel (withdraw) a candidate's application for a job."""
    candidate = _find_candidate(current_user, db)

    app = (
        db.query(CandidateApplication)
        .filter(
            CandidateApplication.candidate_id == candidate.candidate_id,
            CandidateApplication.job_id == job_id,
        )
        .first()
    )
    if not app:
        raise HTTPException(404, "No application found for this job")

    app.status = "cancelled"
    app.preference_order = None
    db.commit()
    return {"message": "Application cancelled", "job_id": job_id}


# ─── PUT /applications/preferences ────────────────────────────────────────────

class PreferenceOrderPayload(BaseModel):
    company_names: List[str]  # exactly 3 distinct companies


@router.put("/preferences")
def save_preferences(
    payload: PreferenceOrderPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save top 3 preferred companies for the candidate."""
    import json
    candidate = _find_candidate(current_user, db)

    if len(payload.company_names) != 3:
        raise HTTPException(400, "Exactly 3 unique companies must be selected")
    if len(set(payload.company_names)) != 3:
        raise HTTPException(400, "Company names must be unique")

    candidate.preferred_companies = json.dumps(payload.company_names)
    db.commit()
    return {"message": "Company preferences saved", "preferred_companies": payload.company_names}


# ─── GET /applications/for-job/{job_id} ───────────────────────────────────────

@router.get("/for-job/{job_id}")
def get_applicants_for_job(
    job_id: str,
    current_user: User = Depends(require_admin_or_recruiter),
    db: Session = Depends(get_db),
):
    """
    Recruiter/Admin: get all candidates who have actively applied for this job
    (status = auto_applied or manually_applied).
    """
    job = db.query(Job).filter(Job.job_id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    active_apps = (
        db.query(CandidateApplication)
        .filter(
            CandidateApplication.job_id == job_id,
            CandidateApplication.status.in_(["auto_applied", "manually_applied"]),
        )
        .order_by(CandidateApplication.compatibility_score.desc())
        .all()
    )

    results = []
    for app in active_apps:
        c = db.query(Candidate).filter(Candidate.candidate_id == app.candidate_id).first()
        if not c:
            continue
        results.append({
            "candidate_id": c.candidate_id,
            "name": c.name,
            "email": c.email,
            "experience_years": c.experience_years,
            "desired_role": c.desired_role,
            "normalized_skills": c.normalized_skills,
            "compatibility_score": app.compatibility_score,
            "application_status": app.status,
        })

    return {
        "job_id": job_id,
        "job_title": job.title,
        "company": job.company_name,
        "applicant_count": len(results),
        "applicants": results,
    }
