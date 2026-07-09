from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models import Candidate, Job, SkillTaxonomy
from models.user import User
from services.upload_service import import_jobs, import_skills
from utils.csv_parser import parse_csv
from fastapi import UploadFile
from auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])
DATASETS = Path(__file__).resolve().parents[2] / "datasets"


@router.get("/status")
def database_status(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    total_jobs = db.query(func.count(Job.id)).scalar() or 0
    return {
        "database": "connected",
        "total_jobs": total_jobs,
        "total_companies": db.query(func.count(func.distinct(Job.company_name))).scalar() or 0,
        "total_capacity": db.query(func.coalesce(func.sum(Job.capacity), 0)).scalar() or 0,
        "total_skills": db.query(func.count(SkillTaxonomy.id)).scalar() or 0,
        "total_candidates": db.query(func.count(Candidate.id)).scalar() or 0,
        "setup_complete": total_jobs > 0 and (db.query(func.count(SkillTaxonomy.id)).scalar() or 0) > 0,
        "closed_jobs": db.query(func.count(Job.id)).filter(Job.status == "CLOSED").scalar() or 0,
    }


@router.post("/load-sample-data")
async def load_sample_data(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    jobs_path, skills_path = DATASETS / "jobs.csv", DATASETS / "skills_taxonomy.csv"
    if not jobs_path.exists() or not skills_path.exists():
        raise HTTPException(404, "Sample datasets are missing")
    jobs = await parse_csv(UploadFile(filename="jobs.csv", file=jobs_path.open("rb")))
    skills = await parse_csv(UploadFile(filename="skills_taxonomy.csv", file=skills_path.open("rb")))
    return {
        "jobs_imported": import_jobs(db, jobs),
        "skills_imported": import_skills(db, skills),
        "message": "Sample data loaded successfully",
    }
