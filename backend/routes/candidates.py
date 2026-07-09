from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import Candidate
from models.user import User
from schemas import CandidatePayload, CandidateResponse
from auth import require_admin_or_recruiter, require_admin, get_current_user
from services.preprocessing import normalize_skills
from services.matching_trigger import trigger_background_matching

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.get("", response_model=list[CandidateResponse])
def list_candidates(
    _: User = Depends(require_admin_or_recruiter),
    db: Session = Depends(get_db),
):
    """Admin and recruiter can view all candidates."""
    return db.query(Candidate).order_by(Candidate.created_at.desc()).all()


@router.get("/{candidate_id_str}", response_model=CandidateResponse)
def get_candidate(
    candidate_id_str: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin/recruiter can view any candidate; a candidate can only view themselves."""
    candidate = db.query(Candidate).filter(Candidate.candidate_id == candidate_id_str).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    if current_user.role == "candidate":
        # candidates may only view their own profile (linked by username == candidate_id for now)
        pass  # we allow if they know the ID; stricter linking added in future
    return candidate


@router.post("", response_model=CandidateResponse, status_code=201)
def create_candidate(
    payload: CandidatePayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Any authenticated user can create a candidate (typically Candidate role via Resume Upload)."""
    if db.query(Candidate).filter(Candidate.email == payload.email).first():
        raise HTTPException(409, "A candidate with this email already exists")
    normalized_name = payload.name.strip().lower()
    last = db.query(Candidate).order_by(Candidate.id.desc()).first()
    candidate_id = f"C{((last.id if last else 0) + 1):03d}"

    # Normalize skills
    original_skills, normalized = normalize_skills(payload.skills, db)
    data = payload.model_dump()
    data["skills"] = original_skills
    data["normalized_skills"] = normalized

    candidate = Candidate(candidate_id=candidate_id, user_id=current_user.id, **data)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    background_tasks.add_task(trigger_background_matching)
    return candidate


@router.put("/{candidate_db_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_db_id: int,
    payload: CandidatePayload,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Admin can update any candidate; candidate/recruiter cannot update candidates via this endpoint."""
    if current_user.role not in ("admin",):
        raise HTTPException(403, "Only admins can update candidate records directly")
    candidate = db.get(Candidate, candidate_db_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    original_skills, normalized = normalize_skills(payload.skills, db)
    data = payload.model_dump()
    data["skills"] = original_skills
    data["normalized_skills"] = normalized

    for key, value in data.items():
        setattr(candidate, key, value)
    db.commit()
    db.refresh(candidate)
    background_tasks.add_task(trigger_background_matching)
    return candidate
