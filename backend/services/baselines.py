import random

def greedy_match(candidate_prefs, job_prefs, score_map):
    """
    Greedily assigns candidates to jobs based on highest combined score.
    candidate_prefs: list[CandidatePreference]
    job_prefs: list[JobPreference]
    score_map: dict of (cand_id, job_id) -> float
    """
    # Build job capacities
    job_capacities = {j.job_id: j.capacity for j in job_prefs}
    
    # Sort all valid pairs by score descending
    pairs = []
    for (cand_id, job_id), score in score_map.items():
        pairs.append((cand_id, job_id, score))
        
    pairs.sort(key=lambda x: x[2], reverse=True)
    
    matches = []
    matched_candidates = set()
    
    for cand_id, job_id, score in pairs:
        if cand_id in matched_candidates:
            continue
        if job_capacities.get(job_id, 0) > 0:
            matches.append({"candidate_id": cand_id, "job_id": job_id})
            matched_candidates.add(cand_id)
            job_capacities[job_id] -= 1
            
    return matches

def random_match(candidate_prefs, job_prefs, seed=42):
    """
    Randomly assigns candidates to jobs they prefer.
    candidate_prefs: list[CandidatePreference]
    job_prefs: list[JobPreference]
    """
    random.seed(seed)
    
    job_capacities = {j.job_id: j.capacity for j in job_prefs}
    
    cands = [c for c in candidate_prefs]
    random.shuffle(cands)
    
    matches = []
    for cand in cands:
        available_jobs = [j_id for j_id in cand.preferences if job_capacities.get(j_id, 0) > 0]
        if available_jobs:
            chosen = random.choice(available_jobs)
            matches.append({"candidate_id": cand.candidate_id, "job_id": chosen})
            job_capacities[chosen] -= 1
            
    return matches
