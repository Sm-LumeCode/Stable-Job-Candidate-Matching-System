import os
from dotenv import load_dotenv
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.settings import AppSettings
from schemas import SettingsResponse
from auth import require_admin

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
        "api_key_configured": bool(api_key)
    }

@router.put("")
def update_settings(payload: dict, db: Session = Depends(get_db), admin=Depends(require_admin)):
    settings = get_app_settings(db)
    if "ai_parsing_enabled" in payload:
        settings.ai_parsing_enabled = payload["ai_parsing_enabled"]
    db.commit()
    return {"status": "success"}
