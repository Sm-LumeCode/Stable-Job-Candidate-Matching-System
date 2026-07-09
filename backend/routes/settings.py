import os
from dotenv import load_dotenv
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.settings import AppSettings
from schemas import SettingsResponse
from auth import require_admin, require_any_role

router = APIRouter(prefix="/settings", tags=["settings"])

load_dotenv()

def get_app_settings(db: Session) -> AppSettings:
    settings = db.query(AppSettings).first()
    if not settings:
        settings = AppSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db), admin=Depends(require_admin)):
    settings = get_app_settings(db)
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    return {
        "ai_parsing_enabled": settings.ai_parsing_enabled,
        "groq_model": settings.groq_model,
        "api_key_configured": bool(api_key),
        "recruitment_status": settings.recruitment_status,
        "application_threshold": settings.application_threshold,
    }

@router.put("")
def update_settings(payload: dict, db: Session = Depends(get_db), admin=Depends(require_admin)):
    settings = get_app_settings(db)
    if "ai_parsing_enabled" in payload:
        settings.ai_parsing_enabled = payload["ai_parsing_enabled"]
    if "application_threshold" in payload:
        val = float(payload["application_threshold"])
        settings.application_threshold = max(0.0, min(1.0, val))
    db.commit()
    return {"status": "success"}

@router.get("/status")
def get_recruitment_status(db: Session = Depends(get_db), current_user=Depends(require_any_role)):
    settings = get_app_settings(db)
    return {"status": settings.recruitment_status}


@router.post("/close")
def close_recruitment(db: Session = Depends(get_db), admin=Depends(require_admin)):
    settings = get_app_settings(db)
    if settings.recruitment_status == "CLOSED":
        return {"status": "already_closed"}
    settings.recruitment_status = "CLOSED"
    db.commit()
    # Execute one final Gale-Shapley matching
    from routes.matching import generate_and_execute_matching, GeneratePreferencesPayload
    generate_and_execute_matching(GeneratePreferencesPayload(), db)
    return {"status": "success"}
