import time
from collections import defaultdict, deque
from schemas import StableMatchingPayload

def validate_preferences(payload: StableMatchingPayload) -> tuple[bool, str]:
    """Validates the input preference lists."""
    candidate_ids = {c.candidate_id for c in payload.candidates}
    job_ids = {j.job_id for j in payload.jobs}
    
    # Check candidates
    for c in payload.candidates:
        if len(set(c.preferences)) != len(c.preferences):
            return False, f"Duplicate preference found for candidate {c.candidate_id}"
        for pref in c.preferences:
            if pref not in job_ids:
                return False, f"Candidate {c.candidate_id} prefers unknown job {pref}"
                
    # Check jobs
    for j in payload.jobs:
        if len(set(j.preferences)) != len(j.preferences):
            return False, f"Duplicate preference found for job {j.job_id}"
        for pref in j.preferences:
            if pref not in candidate_ids:
                return False, f"Job {j.job_id} prefers unknown candidate {pref}"
                
    return True, "Valid"

def run_gale_shapley(payload: StableMatchingPayload) -> dict:
    """
    Executes Hospital/Residents variant of Gale-Shapley.
    Jobs have capacities. Candidates propose.
    """
    start_time = time.perf_counter()
    
    # Fast lookups
    job_capacities = {j.job_id: j.capacity for j in payload.jobs}
    
    # job_rankings[job_id][candidate_id] = rank (lower is better, 0 is best)
    job_rankings = {}
    for j in payload.jobs:
        job_rankings[j.job_id] = {c_id: rank for rank, c_id in enumerate(j.preferences)}
        
    cand_prefs = {c.candidate_id: c.preferences for c in payload.candidates}
    
    # State tracking
    free_candidates: deque[str] = deque(c.candidate_id for c in payload.candidates)
    cand_next_proposal = {c: 0 for c in free_candidates} # Index of next job to propose to
    
    # job_assignments[job_id] = [candidate_id1, candidate_id2, ...]
    job_assignments = {j.job_id: [] for j in payload.jobs}
    
    # History for animation
    history = []
    
    proposals_count = 0
    rejections_count = 0
    replacements_count = 0
    
    while free_candidates:
        c = free_candidates.popleft()
        
        # Candidate has proposed to everyone they want to?
        if cand_next_proposal[c] >= len(cand_prefs[c]):
            # Remains unmatched
            continue
            
        j = cand_prefs[c][cand_next_proposal[c]]
        cand_next_proposal[c] += 1
        proposals_count += 1
        
        # Does the job even want this candidate?
        if c not in job_rankings[j]:
            rejections_count += 1
            history.append({"type": "reject", "candidate": c, "job": j, "reason": "Not on job preference list"})
            free_candidates.appendleft(c)
            continue
            
        current_assigned = job_assignments[j]
        
        if len(current_assigned) < job_capacities[j]:
            # Job has room
            current_assigned.append(c)
            history.append({"type": "accept", "candidate": c, "job": j, "reason": "Capacity available"})
        else:
            # Job is full. Find the worst candidate currently assigned.
            worst_c = max(current_assigned, key=lambda x: job_rankings[j][x])
            worst_c_rank = job_rankings[j][worst_c]
            new_c_rank = job_rankings[j][c]
            
            if new_c_rank < worst_c_rank:
                # Job prefers new candidate over the worst assigned candidate
                current_assigned.remove(worst_c)
                current_assigned.append(c)
                free_candidates.append(worst_c) # Worst candidate becomes free again
                
                replacements_count += 1
                history.append({"type": "replace", "candidate": c, "job": j, "replaced": worst_c, "reason": "Preferred over assigned"})
            else:
                # Job prefers current assignments
                rejections_count += 1
                history.append({"type": "reject", "candidate": c, "job": j, "reason": "Job is full and prefers existing assignments"})
                free_candidates.appendleft(c)
                
    end_time = time.perf_counter()
    exec_time_ms = (end_time - start_time) * 1000
    
    # Format matches
    matches = []
    matched_candidates: set[str] = set()
    for j, assigned in job_assignments.items():
        for c in assigned:
            c_rank = cand_prefs[c].index(j) + 1
            j_rank = job_rankings[j][c] + 1
            matches.append({
                "candidate_id": c,
                "job_id": j,
                "candidate_rank": c_rank, # The rank of this job in candidate's list
                "job_rank": j_rank        # The rank of this candidate in job's list
            })
            matched_candidates.add(c)

    unmatched_candidates = [c.candidate_id for c in payload.candidates if c.candidate_id not in matched_candidates]
                
    return {
        "matches": matches,
        "unmatched_candidates": unmatched_candidates,
        "history": history,
        "stats": {
            "proposals": proposals_count,
            "rejections": rejections_count,
            "replacements": replacements_count,
            "execution_time_ms": exec_time_ms,
            "theoretical_complexity": f"O({len(payload.candidates)} * {len(payload.jobs)})",
            "total_candidates": len(payload.candidates),
            "total_jobs": len(payload.jobs),
            "total_capacity": sum(job_capacities.values())
        }
    }

def check_stability(payload: StableMatchingPayload, matches: list[dict]) -> tuple[bool, list]:
    """
    Checks if the matching is stable (no blocking pairs).
    A blocking pair (c, j) exists if:
    1. c prefers j over their assigned job (or is unassigned but prefers j).
    2. j prefers c over their worst assigned candidate (or j has free capacity).
    """
    job_capacities = {j.job_id: j.capacity for j in payload.jobs}
    
    job_rankings = {}
    for j in payload.jobs:
        job_rankings[j.job_id] = {c_id: rank for rank, c_id in enumerate(j.preferences)}
        
    cand_prefs = {c.candidate_id: c.preferences for c in payload.candidates}
    
    # current assignments
    cand_assigned_job = {m["candidate_id"]: m["job_id"] for m in matches}
    job_assigned_cands = defaultdict(list)
    for m in matches:
        job_assigned_cands[m["job_id"]].append(m["candidate_id"])
        
    blocking_pairs = []
    
    for c in payload.candidates:
        c_id = c.candidate_id
        c_current_job = cand_assigned_job.get(c_id)
        
        for j_id in c.preferences:
            if j_id == c_current_job:
                # Reached current assignment, anything lower is less preferred
                break
                
            # c prefers j_id over c_current_job
            # Does j_id prefer c over its assignments?
            if c_id not in job_rankings[j_id]:
                continue
                
            j_assigned = job_assigned_cands[j_id]
            
            if len(j_assigned) < job_capacities[j_id]:
                # Job has capacity! Blocking pair!
                blocking_pairs.append({"candidate": c_id, "job": j_id, "reason": "Job has free capacity"})
            else:
                # Job is full, check worst assigned
                worst_c = max(j_assigned, key=lambda x: job_rankings[j_id][x])
                if job_rankings[j_id][c_id] < job_rankings[j_id][worst_c]:
                    # Job prefers c over its worst assigned
                    blocking_pairs.append({"candidate": c_id, "job": j_id, "reason": f"Job prefers {c_id} over {worst_c}"})
                    
    return len(blocking_pairs) == 0, blocking_pairs
