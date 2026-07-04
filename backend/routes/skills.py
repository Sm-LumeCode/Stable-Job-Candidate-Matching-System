from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import SkillTaxonomy
from models.user import User
from schemas import SkillPayload, SkillResponse
from auth import require_admin, require_any_role

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("", response_model=list[SkillResponse])
def list_skills(
    _: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    """Any authenticated user can read the taxonomy."""
    return db.query(SkillTaxonomy).order_by(SkillTaxonomy.skill_term).all()


@router.put("/{skill_id}", response_model=SkillResponse)
def update_skill(
    skill_id: int,
    payload: SkillPayload,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Only admin can edit taxonomy terms."""
    skill = db.get(SkillTaxonomy, skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    duplicate = db.query(SkillTaxonomy).filter(
        SkillTaxonomy.skill_term == payload.skill_term,
        SkillTaxonomy.id != skill_id,
    ).first()
    if duplicate:
        raise HTTPException(409, "Skill term already exists")
    for key, value in payload.model_dump().items():
        setattr(skill, key, value)
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/{skill_id}")
def delete_skill(
    skill_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Only admin can delete taxonomy terms."""
    skill = db.get(SkillTaxonomy, skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    db.delete(skill)
    db.commit()
    return {"message": "Skill deleted"}
