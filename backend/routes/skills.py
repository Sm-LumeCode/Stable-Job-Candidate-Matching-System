from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import SkillTaxonomy
from schemas import SkillPayload, SkillResponse

router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("", response_model=list[SkillResponse])
def list_skills(db: Session = Depends(get_db)):
    return db.query(SkillTaxonomy).order_by(SkillTaxonomy.skill_term).all()


@router.put("/{skill_id}", response_model=SkillResponse)
def update_skill(skill_id: int, payload: SkillPayload, db: Session = Depends(get_db)):
    skill = db.get(SkillTaxonomy, skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    duplicate = db.query(SkillTaxonomy).filter(SkillTaxonomy.skill_term == payload.skill_term, SkillTaxonomy.id != skill_id).first()
    if duplicate:
        raise HTTPException(409, "Skill term already exists")
    for key, value in payload.model_dump().items():
        setattr(skill, key, value)
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/{skill_id}")
def delete_skill(skill_id: int, db: Session = Depends(get_db)):
    skill = db.get(SkillTaxonomy, skill_id)
    if not skill:
        raise HTTPException(404, "Skill not found")
    db.delete(skill)
    db.commit()
    return {"message": "Skill deleted"}
