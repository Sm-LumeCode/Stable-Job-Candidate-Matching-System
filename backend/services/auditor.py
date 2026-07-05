def find_blocking_pairs(matching, candidate_prefs, job_prefs):
    """
    Finds blocking pairs in a matching.
    matching: list of dicts [{"candidate_id": "C1", "job_id": "J1"}, ...]
    candidate_prefs: list of CandidatePreference objects
    job_prefs: list of JobPreference objects
    """
    job_capacities = {j.job_id: j.capacity for j in job_prefs}
    job_rankings = {j.job_id: {c_id: rank for rank, c_id in enumerate(j.preferences)} for j in job_prefs}
    cand_prefs_dict = {c.candidate_id: c.preferences for c in candidate_prefs}
    
    # Track current assignments
    cand_assignment = {m["candidate_id"]: m["job_id"] for m in matching}
    job_assignments = {j.job_id: [] for j in job_prefs}
    for m in matching:
        if m["job_id"] in job_assignments:
            job_assignments[m["job_id"]].append(m["candidate_id"])
        
    blocking_pairs = []
    
    for c_id, c_prefs_list in cand_prefs_dict.items():
        c_current_job = cand_assignment.get(c_id)
        
        for j_id in c_prefs_list:
            if j_id == c_current_job:
                # Reached their currently assigned job in preference list, they don't prefer anything below this
                break
                
            # Candidate prefers j_id over c_current_job (or is unassigned)
            # Check if j_id prefers candidate
            if j_id not in job_rankings or c_id not in job_rankings[j_id]:
                continue # Job doesn't want this candidate at all
                
            j_assigned = job_assignments[j_id]
            
            if len(j_assigned) < job_capacities[j_id]:
                # Job has room
                blocking_pairs.append({"candidate_id": c_id, "job_id": j_id})
            else:
                # Job is full, does it prefer c_id over its worst assigned candidate?
                worst_assigned_c = max(j_assigned, key=lambda x: job_rankings[j_id][x])
                if job_rankings[j_id][c_id] < job_rankings[j_id][worst_assigned_c]:
                    blocking_pairs.append({"candidate_id": c_id, "job_id": j_id})
                    
    return blocking_pairs

def compute_regret(matching, candidate_prefs, job_prefs):
    """
    Computes regret for candidates and jobs based on assignment rank.
    matching: list of dicts [{"candidate_id": "C1", "job_id": "J1"}, ...]
    """
    job_rankings = {j.job_id: {c_id: rank for rank, c_id in enumerate(j.preferences)} for j in job_prefs}
    cand_prefs_dict = {c.candidate_id: c.preferences for c in candidate_prefs}
    
    total_cand_regret = 0
    total_job_regret = 0
    per_candidate = {}
    
    if not matching:
        return {
            "avg_candidate_regret": 0.0,
            "avg_job_regret": 0.0,
            "per_candidate": {}
        }
    
    for m in matching:
        c_id = m["candidate_id"]
        j_id = m["job_id"]
        
        c_regret = cand_prefs_dict[c_id].index(j_id) if j_id in cand_prefs_dict[c_id] else len(cand_prefs_dict.get(c_id, []))
        j_regret = job_rankings[j_id][c_id] if j_id in job_rankings and c_id in job_rankings[j_id] else len(job_rankings.get(j_id, {}))
        
        total_cand_regret += c_regret
        total_job_regret += j_regret
        per_candidate[c_id] = c_regret
        
    num_matches = len(matching)
    
    return {
        "avg_candidate_regret": total_cand_regret / num_matches,
        "avg_job_regret": total_job_regret / num_matches,
        "per_candidate": per_candidate
    }
