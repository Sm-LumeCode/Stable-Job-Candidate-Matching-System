from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Job
from models.user import User
from schemas import JobPayload, JobResponse
from auth import require_admin, require_admin_or_recruiter, get_current_user
from services.preprocessing import normalize_skills

router = APIRouter(prefix="/jobs", tags=["jobs"])


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
    return job


@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    payload: JobPayload,
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
    return job


@router.delete("/{job_id}")
def delete_job(
    job_id: int,
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
    return {"message": "Job deleted"}
