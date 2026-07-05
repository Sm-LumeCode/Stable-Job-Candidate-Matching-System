from sqlalchemy.orm import Session
from models import Candidate, Job, ScoreWeights, SkillTaxonomy
from services.combined_score import compute_combined_score
from services.preference_lists import generate_candidate_preferences, generate_job_preferences
from services.baselines import greedy_match, random_match
from services.auditor import find_blocking_pairs, compute_regret
from schemas import StableMatchingPayload
from routes.stable_matching import execute_stable_matching

def run_evaluations(db: Session):
    # 1. Fetch data
    sw = db.query(ScoreWeights).order_by(ScoreWeights.id.desc()).first()
    if sw:
        default_weights = {
            "exact_match": sw.exact_match,
            "dp_similarity": sw.dp_similarity,
            "experience": sw.experience,
            "salary": sw.salary,
            "location": sw.location
        }
    else:
        default_weights = {"exact_match": 0.40, "dp_similarity": 0.30, "experience": 0.15, "salary": 0.10, "location": 0.05}
        
    taxonomies = db.query(SkillTaxonomy).all()
    taxonomy_map = {t.skill_term: t.canonical_skill for t in taxonomies}
    
    candidates = db.query(Candidate).all()
    jobs = db.query(Job).all()
    
    if not candidates or not jobs:
        return {"method_comparison": [], "weight_sensitivity": []}
    
    # Pre-compute for default weights
    score_map = {}
    for c in candidates:
        for j in jobs:
            try:
                res = compute_combined_score(c, j, default_weights, taxonomy_map)
                score_map[(c.candidate_id, j.job_id)] = res["total"]
            except Exception:
                pass
                
    c_prefs = [generate_candidate_preferences(c, jobs, default_weights, taxonomy_map) for c in candidates]
    j_prefs = [generate_job_preferences(j, candidates, default_weights, taxonomy_map) for j in jobs]
    
    # A helper to evaluate a given matching list
    def evaluate_matching(method_name, matching):
        bps = find_blocking_pairs(matching, c_prefs, j_prefs)
        regret = compute_regret(matching, c_prefs, j_prefs)
        match_rate = len(matching) / len(candidates) if candidates else 0
        return {
            "method": method_name,
            "avg_regret": regret["avg_candidate_regret"],
            "avg_job_regret": regret["avg_job_regret"],
            "num_blocking_pairs": len(bps),
            "match_rate": match_rate
        }

    # Stable matching
    sm_payload = StableMatchingPayload(candidates=c_prefs, jobs=j_prefs)
    stable_result = execute_stable_matching(sm_payload, db)
    stable_matches = stable_result.get("matches", [])
    
    # Greedy and Random
    greedy_matches = greedy_match(c_prefs, j_prefs, score_map)
    random_matches = random_match(c_prefs, j_prefs, seed=42)
    
    method_comparison = [
        evaluate_matching("Stable (Gale-Shapley)", stable_matches),
        evaluate_matching("Greedy", greedy_matches),
        evaluate_matching("Random", random_matches)
    ]
    
    # 2. Weight Sensitivity
    preset_configs = [
        {
            "name": "Skill-Heavy",
            "weights": {"exact_match": 0.50, "dp_similarity": 0.40, "experience": 0.05, "salary": 0.05, "location": 0.00}
        },
        {
            "name": "Experience-Heavy",
            "weights": {"exact_match": 0.20, "dp_similarity": 0.10, "experience": 0.60, "salary": 0.10, "location": 0.00}
        },
        {
            "name": "Balanced",
            "weights": {"exact_match": 0.20, "dp_similarity": 0.20, "experience": 0.20, "salary": 0.20, "location": 0.20}
        }
    ]
    
    default_assignment = {m["candidate_id"]: m["job_id"] for m in stable_matches}
    weight_sensitivity = []
    
    for config in preset_configs:
        w = config["weights"]
        temp_c_prefs = [generate_candidate_preferences(c, jobs, w, taxonomy_map) for c in candidates]
        temp_j_prefs = [generate_job_preferences(j, candidates, w, taxonomy_map) for j in jobs]
        
        temp_payload = StableMatchingPayload(candidates=temp_c_prefs, jobs=temp_j_prefs)
        temp_stable_result = execute_stable_matching(temp_payload, db)
        temp_matches = temp_stable_result.get("matches", [])
        
        temp_assignment = {m["candidate_id"]: m["job_id"] for m in temp_matches}
        
        delta_count = 0
        all_cands = set(default_assignment.keys()).union(set(temp_assignment.keys()))
        for cid in all_cands:
            if default_assignment.get(cid) != temp_assignment.get(cid):
                delta_count += 1
                
        weight_sensitivity.append({
            "weights_variant": config["name"],
            "resulting_top_matches_delta": delta_count,
            "total_matches": len(temp_matches)
        })
        
    return {
        "method_comparison": method_comparison,
        "weight_sensitivity": weight_sensitivity
    }
