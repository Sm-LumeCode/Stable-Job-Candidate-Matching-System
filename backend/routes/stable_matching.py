import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.stable_match_result import StableMatchingResult
from schemas import StableMatchingPayload
from services.gale_shapley import validate_preferences, run_gale_shapley, check_stability

router = APIRouter(prefix="/matching/stable", tags=["stable-matching"])

@router.post("")
def execute_stable_matching(payload: StableMatchingPayload, db: Session = Depends(get_db)):
    """Executes the Gale-Shapley Stable Matching engine on provided preference lists."""
    
    # 1. Validate
    is_valid, msg = validate_preferences(payload)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)
        
    # 2. Execute
    result = run_gale_shapley(payload)
    
    # 3. Check Stability
    is_stable, blocking_pairs = check_stability(payload, result["matches"])
    result["stats"]["blocking_pairs"] = len(blocking_pairs)
    result["is_stable"] = is_stable
    
    # 4. Calculate Average/Max Proposals
    # We can infer proposals per candidate by looking at the history
    candidate_proposals = {c.candidate_id: 0 for c in payload.candidates}
    for event in result["history"]:
        # Only accept, reject, replace imply a proposal happened, wait, every event *is* a result of a proposal
        candidate_proposals[event["candidate"]] += 1
        
    counts = list(candidate_proposals.values())
    avg_proposals = sum(counts) / len(counts) if counts else 0
    max_proposals = max(counts) if counts else 0
    
    result["stats"]["avg_proposals"] = round(avg_proposals, 2)
    result["stats"]["max_proposals"] = max_proposals
    
    # 5. Persist to DB
    # Clear old results
    db.query(StableMatchingResult).delete()
    
    # Save matched
    for match in result["matches"]:
        c_id = match["candidate_id"]
        # get history for this candidate
        c_history = [e for e in result["history"] if e["candidate"] == c_id]
        
        db_res = StableMatchingResult(
            candidate_id=c_id,
            assigned_job_id=match["job_id"],
            proposal_count=candidate_proposals[c_id],
            proposal_history=json.dumps(c_history),
            preference_rank=match["candidate_rank"],
            execution_time_ms=result["stats"]["execution_time_ms"]
        )
        db.add(db_res)
        
    # Save unmatched
    for c_id in result["unmatched_candidates"]:
        c_history = [e for e in result["history"] if e["candidate"] == c_id]
        db_res = StableMatchingResult(
            candidate_id=c_id,
            assigned_job_id=None,
            proposal_count=candidate_proposals[c_id],
            proposal_history=json.dumps(c_history),
            preference_rank=None,
            execution_time_ms=result["stats"]["execution_time_ms"]
        )
        db.add(db_res)
        
    db.commit()
    
    return result

@router.get("/results")
def get_stable_matching_results(db: Session = Depends(get_db)):
    """Returns the latest persisted stable matching results."""
    results = db.query(StableMatchingResult).all()
    # Decode JSON history
    out = []
    for r in results:
        data = {
            "candidate_id": r.candidate_id,
            "assigned_job_id": r.assigned_job_id,
            "proposal_count": r.proposal_count,
            "preference_rank": r.preference_rank,
            "execution_time_ms": r.execution_time_ms,
            "history": json.loads(r.proposal_history) if r.proposal_history else []
        }
        out.append(data)
    return out
