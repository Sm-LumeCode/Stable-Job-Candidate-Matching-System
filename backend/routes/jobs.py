from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import Job
from models.user import User
from schemas import JobPayload, JobResponse
from auth import require_admin, require_admin_or_recruiter, get_current_user
from services.preprocessing import normalize_skills
from services.matching_trigger import trigger_background_matching

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/companies", response_model=list[str])
def get_companies(db: Session = Depends(get_db)):
    """Returns a list of all distinct company names from registered jobs."""
    results = db.query(Job.company_name).distinct().all()
    return [r[0] for r in results if r[0]]


@router.get("", response_model=list[JobResponse])
def list_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin sees all jobs; Recruiters see only their own jobs; Candidates see all jobs."""
    query = db.query(Job)
    if current_user.role == "recruiter":
        query = query.filter(Job.recruiter_id == current_user.id)
    return query.order_by(Job.created_at.desc()).all()


@router.post("", response_model=JobResponse, status_code=201)
def create_job(
    payload: JobPayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin_or_recruiter),
    db: Session = Depends(get_db),
):
    """Admin or Recruiter can create jobs. Job is linked to the creating user."""
    if db.query(Job).filter(Job.job_id == payload.job_id).first():
        raise HTTPException(409, "Job ID already exists")
    original_skills, normalized = normalize_skills(payload.required_skills, db)
    data = payload.model_dump()
    data["required_skills"] = original_skills
    data["normalized_required_skills"] = normalized
    data["recruiter_id"] = current_user.id
    job = Job(**data)
    db.add(job)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(trigger_background_matching)
    return job


@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    payload: JobPayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin can edit any job; Recruiter can only edit their own jobs."""
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if current_user.role == "recruiter" and job.recruiter_id != current_user.id:
        raise HTTPException(403, "You can only edit your own jobs")
    if current_user.role not in ("admin", "recruiter"):
        raise HTTPException(403, "Access denied")
    duplicate = db.query(Job).filter(Job.job_id == payload.job_id, Job.id != job_id).first()
    if duplicate:
        raise HTTPException(409, "Job ID already exists")
    original_skills, normalized = normalize_skills(payload.required_skills, db)
    data = payload.model_dump()
    data["required_skills"] = original_skills
    data["normalized_required_skills"] = normalized
    for key, value in data.items():
        setattr(job, key, value)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(trigger_background_matching)
    return job


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin can delete any job; Recruiter can only delete their own jobs."""
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if current_user.role == "recruiter" and job.recruiter_id != current_user.id:
        raise HTTPException(403, "You can only delete your own jobs")
    if current_user.role not in ("admin", "recruiter"):
        raise HTTPException(403, "Access denied")
    db.delete(job)
    db.commit()
    background_tasks.add_task(trigger_background_matching)
    return {"message": "Job deleted"}


@router.put("/{job_id}/close", response_model=JobResponse)
def close_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Closes recruitment for a job and runs GS allocation for all closed jobs."""
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if current_user.role == "recruiter" and job.recruiter_id != current_user.id:
        raise HTTPException(403, "You can only close your own jobs")
    if current_user.role not in ("admin", "recruiter"):
        raise HTTPException(403, "Access denied")
        
    if job.status == "CLOSED":
        raise HTTPException(400, "Job is already closed")
        
    job.status = "CLOSED"
    db.commit()
    db.refresh(job)
    
    from routes.matching import execute_final_matching_for_closed_jobs
    execute_final_matching_for_closed_jobs(db)
    
    return job

@router.get("/{job_id}/results")
def get_job_results(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the final allocated candidates for a closed job."""
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if current_user.role == "recruiter" and job.recruiter_id != current_user.id:
        raise HTTPException(403, "Access denied")
    if current_user.role not in ("admin", "recruiter"):
        raise HTTPException(403, "Access denied")
        
    if job.status != "CLOSED":
        raise HTTPException(400, "Job recruitment is still open")
        
    from models.candidate_application import CandidateApplication
    from models.candidate import Candidate
    
    apps = db.query(CandidateApplication).filter(
        CandidateApplication.job_id == job.job_id,
        CandidateApplication.final_allocation == "selected"
    ).all()
    
    candidate_ids = {a.candidate_id for a in apps}
    if not candidate_ids:
        return []
        
    candidates = db.query(Candidate).filter(Candidate.candidate_id.in_(candidate_ids)).all()
    
    # Format candidates similar to CandidateResponse
    res = []
    for c in candidates:
        app = next(a for a in apps if a.candidate_id == c.candidate_id)
        c_dict = {
            "id": c.id,
            "candidate_id": c.candidate_id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "skills": c.skills,
            "experience_years": c.experience_years,
            "education": c.education,
            "resume_filename": c.resume_filename,
            "preference_order": app.preference_order
        }
        res.append(c_dict)
        
    return res
