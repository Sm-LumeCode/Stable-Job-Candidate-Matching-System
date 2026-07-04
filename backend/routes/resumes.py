import os
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Candidate
from models.user import User
from models.settings import AppSettings
from services.resume_parser import extract_text, parse_resume
from services.ai_parser import extract_resume_ai
from services.merge_engine import merge_skills
from services.preprocessing import normalize_skills
from auth import get_current_user

router = APIRouter(prefix="/resumes", tags=["resumes"])
MAX_SIZE = 8 * 1024 * 1024

def _find_my_candidate(user: User, db: Session) -> Candidate | None:
    """Find the candidate record belonging to the current user (matched by email)."""
    if user.email:
        return db.query(Candidate).filter(Candidate.email == user.email).first()
    # Fallback: match by username as name (case-insensitive)
    return db.query(Candidate).filter(Candidate.name.ilike(user.username)).first()


@router.get("/my")
def get_my_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return this candidate's saved profile. Returns 404 if none saved yet."""
    candidate = _find_my_candidate(current_user, db)
    if not candidate:
        raise HTTPException(404, "No resume saved yet")
    return candidate


@router.post("/parse")
async def parse_uploaded_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Parse a resume file. Orchestrates Rule-Based and Groq LLM pipelines."""
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
        
    # 1. Rule-Based Parser
    extracted = parse_resume(text, db)
    
    # 2. AI Parser (if enabled and key present)
    settings = db.query(AppSettings).first()
    ai_enabled = settings.ai_parsing_enabled if settings else True
    groq_model = settings.groq_model if settings else "llama-3.3-70b-versatile"
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    
    ai_skills_data = []
    
    if ai_enabled and api_key:
        ai_result = extract_resume_ai(text, api_key, groq_model)
        if ai_result:
            if ai_result.get("name") and not extracted.get("name"):
                extracted["name"] = ai_result["name"]
            if ai_result.get("email") and not extracted.get("email"):
                extracted["email"] = ai_result["email"]
            if ai_result.get("phone") and not extracted.get("phone"):
                extracted["phone"] = ai_result["phone"]
            if ai_result.get("experience_years"):
                extracted["experience_years"] = max(extracted.get("experience_years", 0), ai_result["experience_years"])
            if ai_result.get("education") and len(str(ai_result["education"])) > len(str(extracted.get("education", ""))):
                extracted["education"] = ai_result["education"]
                
            # Collect structured skills from main list
            ai_skills_data = ai_result.get("skills", [])
            
            # Auto-wrap string categories into the structured format
            for k in ["programming_languages", "frameworks", "libraries", "databases", "cloud_tools", "ai_ml_tools", "operating_systems", "devops_tools", "soft_skills"]:
                for item in ai_result.get(k, []):
                    if isinstance(item, str):
                        ai_skills_data.append({"name": item, "confidence": 0.85, "source": k.replace("_", " ").title(), "reason": "Extracted from categorical list"})
                    elif isinstance(item, dict):
                        ai_skills_data.append(item)
                        
    # 3. Merge Engine
    rule_skills_list = [s.strip() for s in extracted.get("skills", "").split(",") if s.strip()]
    rule_str, ai_str, merged_str, merged_metadata_json = merge_skills(rule_skills_list, ai_skills_data)
    
    extracted["skills"] = rule_str
    extracted["ai_skills"] = ai_str
    extracted["ai_extraction_metadata"] = merged_metadata_json
    extracted["merged_skills_temp"] = merged_str
    
    duplicate = None
    if extracted.get("email"):
        existing = db.query(Candidate).filter(Candidate.email == extracted["email"]).first()
        if existing:
            duplicate = {"id": existing.id, "candidate_id": existing.candidate_id, "name": existing.name}
            
    return {"filename": filename, "text": text, "extracted": extracted, "duplicate": duplicate}


@router.put("/my")
async def update_my_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-parse a new resume file and update the candidate's existing profile in place."""
    candidate = _find_my_candidate(current_user, db)
    if not candidate:
        raise HTTPException(404, "No existing resume to update. Please save your first resume first.")

    filename = file.filename or ""
    if not filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(415, "Unsupported file type. Upload a PDF or DOCX resume.")
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
        raise HTTPException(422, "No usable text found in the resume.")

    extracted = parse_resume(text, db)

    settings = db.query(AppSettings).first()
    ai_enabled = settings.ai_parsing_enabled if settings else True
    groq_model = settings.groq_model if settings else "llama-3.3-70b-versatile"
    api_key = os.environ.get("GROQ_API_KEY", "").strip()

    ai_skills_data = []
    if ai_enabled and api_key:
        ai_result = extract_resume_ai(text, api_key, groq_model)
        if ai_result:
            if ai_result.get("name") and not extracted.get("name"):
                extracted["name"] = ai_result["name"]
            ai_skills_data = ai_result.get("skills", [])
            for k in ["programming_languages", "frameworks", "libraries", "databases", "cloud_tools", "ai_ml_tools", "operating_systems", "devops_tools"]:
                for item in ai_result.get(k, []):
                    if isinstance(item, str):
                        ai_skills_data.append({"name": item, "confidence": 0.85, "source": k.replace("_", " ").title(), "reason": "Extracted from categorical list"})
                    elif isinstance(item, dict):
                        ai_skills_data.append(item)

    rule_skills_list = [s.strip() for s in extracted.get("skills", "").split(",") if s.strip()]
    rule_str, ai_str, merged_str, merged_metadata_json = merge_skills(rule_skills_list, ai_skills_data)
    _, normalized = normalize_skills(merged_str, db)

    # Update the existing candidate record in place
    candidate.skills = rule_str
    candidate.ai_skills = ai_str
    candidate.ai_extraction_metadata = merged_metadata_json
    candidate.normalized_skills = normalized
    candidate.resume_filename = filename
    candidate.resume_text = text
    if extracted.get("experience_years"):
        candidate.experience_years = extracted["experience_years"]
    if extracted.get("education"):
        candidate.education = extracted["education"]
    if extracted.get("desired_role"):
        candidate.desired_role = extracted["desired_role"]
    db.commit()
    db.refresh(candidate)

    return {"filename": filename, "text": text, "extracted": {
        **extracted,
        "skills": rule_str, "ai_skills": ai_str,
        "ai_extraction_metadata": merged_metadata_json,
        "merged_skills_temp": merged_str,
    }, "candidate": {"id": candidate.id, "candidate_id": candidate.candidate_id}}

