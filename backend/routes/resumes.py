from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from database import get_db
from models import Candidate
from services.resume_parser import extract_text, parse_resume

router = APIRouter(prefix="/resumes", tags=["resumes"])
MAX_SIZE = 8 * 1024 * 1024


@router.post("/parse")
async def parse_uploaded_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    filename = file.filename or ""
    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(415, "Unsupported file. Upload a PDF or DOCX resume.")
    content = await file.read()
    if not content:
        raise HTTPException(400, "The uploaded resume is empty")
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "Resume must be smaller than 8 MB")
    try:
        text = extract_text(content, filename)
    except Exception as exc:
        raise HTTPException(422, f"Could not read this resume: {exc}") from exc
    if len(text.strip()) < 30:
        raise HTTPException(422, "No usable text was found. The PDF may be scanned or image-only.")
    extracted = parse_resume(text, db)
    duplicate = None
    if extracted["email"]:
        existing = db.query(Candidate).filter(Candidate.email == extracted["email"]).first()
        if existing:
            duplicate = {"id": existing.id, "candidate_id": existing.candidate_id, "name": existing.name}
    return {"filename": filename, "text": text, "extracted": extracted, "duplicate": duplicate}
