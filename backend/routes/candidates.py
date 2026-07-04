from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Candidate
from schemas import CandidatePayload, CandidateResponse

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("", response_model=list[CandidateResponse])
def list_candidates(db: Session = Depends(get_db)):
    return db.query(Candidate).order_by(Candidate.created_at.desc()).all()


@router.post("", response_model=CandidateResponse, status_code=201)
def create_candidate(payload: CandidatePayload, db: Session = Depends(get_db)):
    if payload.email and db.query(Candidate).filter(Candidate.email == payload.email).first():
        raise HTTPException(409, "A candidate with this email already exists")
    normalized_name = payload.name.strip().lower()
    duplicate = db.query(Candidate).filter(
        Candidate.name.ilike(normalized_name),
        Candidate.phone == payload.phone,
    ).first() if payload.phone else None
    if duplicate:
        raise HTTPException(409, "This candidate appears to already exist")
    last = db.query(Candidate).order_by(Candidate.id.desc()).first()
    candidate_id = f"C{((last.id if last else 0) + 1):03d}"
    candidate = Candidate(candidate_id=candidate_id, **payload.model_dump())
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate
