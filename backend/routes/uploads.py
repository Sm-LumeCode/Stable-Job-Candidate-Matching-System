from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session
from database import get_db
from services.upload_service import JOB_COLUMNS, SKILL_COLUMNS, import_jobs, import_skills
from utils.csv_parser import parse_csv

router = APIRouter(prefix="/upload", tags=["uploads"])


@router.post("/jobs")
async def upload_jobs(file: UploadFile = File(...), db: Session = Depends(get_db)):
    count = import_jobs(db, await parse_csv(file))
    return {"message": "Jobs uploaded successfully", "imported": count}


@router.post("/skills")
async def upload_skills(file: UploadFile = File(...), db: Session = Depends(get_db)):
    count = import_skills(db, await parse_csv(file))
    return {"message": "Skills uploaded successfully", "imported": count}


@router.post("/preview/{dataset}")
async def preview_upload(dataset: str, file: UploadFile = File(...)):
    rows = await parse_csv(file)
    required = JOB_COLUMNS if dataset == "jobs" else SKILL_COLUMNS if dataset == "skills" else None
    if required is None:
        from fastapi import HTTPException
        raise HTTPException(404, "Unknown dataset")
    columns = set(rows[0].keys()) if rows else set()
    missing = sorted(required - columns)
    return {"rows": rows[:200], "total": len(rows), "missing_columns": missing, "valid": bool(rows) and not missing}
