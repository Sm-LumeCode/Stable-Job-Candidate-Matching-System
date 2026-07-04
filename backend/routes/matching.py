from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Candidate, Job, ExactMatchResult
from services.boyer_moore_horspool import match_candidate_to_job

router = APIRouter(prefix="/matching", tags=["matching"])

@router.post("/exact")
def run_exact_matching(db: Session = Depends(get_db)):
    """Runs BMH exact matching for every candidate against every job."""
    candidates = db.query(Candidate).all()
    jobs = db.query(Job).all()
    
    # Clear old exact matches
    db.query(ExactMatchResult).delete()
    
    results = []
    
    for c in candidates:
        for j in jobs:
            c_skills = c.normalized_skills or ""
            j_skills = j.normalized_required_skills or ""
            
            match_data = match_candidate_to_job(c_skills, j_skills)
            
            result = ExactMatchResult(
                candidate_id=c.candidate_id,
                job_id=j.job_id,
                matched_skills=match_data["matched_skills"],
                missing_skills=match_data["missing_skills"],
                exact_match_count=match_data["exact_match_count"],
                total_required_skills=match_data["total_required_skills"],
                match_percentage=match_data["match_percentage"]
            )
            db.add(result)
            results.append(result)
            
    db.commit()
    return {"message": f"Successfully processed {len(results)} candidate-job pairs using BMH"}


@router.get("/candidate/{candidate_id}")
def get_candidate_matches(candidate_id: str, db: Session = Depends(get_db)):
    """Returns all exact match results for a candidate."""
    results = db.query(ExactMatchResult).filter(ExactMatchResult.candidate_id == candidate_id).order_by(ExactMatchResult.match_percentage.desc()).all()
    return results


@router.get("/job/{job_id}")
def get_job_rankings(job_id: str, db: Session = Depends(get_db)):
    """Returns all candidate rankings for a job."""
    results = db.query(ExactMatchResult).filter(ExactMatchResult.job_id == job_id).order_by(ExactMatchResult.match_percentage.desc()).all()
    return results
