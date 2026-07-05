import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.auditor import find_blocking_pairs, compute_regret
from schemas import CandidatePreference, JobPreference

def test_find_blocking_pairs_empty():
    matching = [{"candidate_id": "C1", "job_id": "J1"}]
    c_prefs = [CandidatePreference(candidate_id="C1", preferences=["J1"])]
    j_prefs = [JobPreference(job_id="J1", capacity=1, preferences=["C1"])]
    
    bp = find_blocking_pairs(matching, c_prefs, j_prefs)
    assert len(bp) == 0

def test_find_blocking_pairs_unstable():
    matching = [
        {"candidate_id": "C1", "job_id": "J2"},
        {"candidate_id": "C2", "job_id": "J1"}
    ]
    
    c_prefs = [
        CandidatePreference(candidate_id="C1", preferences=["J1", "J2"]),
        CandidatePreference(candidate_id="C2", preferences=["J2", "J1"])
    ]
    
    j_prefs = [
        JobPreference(job_id="J1", capacity=1, preferences=["C1", "C2"]),
        JobPreference(job_id="J2", capacity=1, preferences=["C2", "C1"])
    ]
    
    bp = find_blocking_pairs(matching, c_prefs, j_prefs)
    assert len(bp) == 2
    
def test_compute_regret():
    matching = [
        {"candidate_id": "C1", "job_id": "J2"},
        {"candidate_id": "C2", "job_id": "J1"} 
    ]
    
    c_prefs = [
        CandidatePreference(candidate_id="C1", preferences=["J1", "J2"]),
        CandidatePreference(candidate_id="C2", preferences=["J1", "J2"])
    ]
    
    j_prefs = [
        JobPreference(job_id="J1", capacity=1, preferences=["C1", "C2"]),
        JobPreference(job_id="J2", capacity=1, preferences=["C2", "C1"])
    ]
    
    regret = compute_regret(matching, c_prefs, j_prefs)
    assert regret["per_candidate"]["C1"] == 1
    assert regret["per_candidate"]["C2"] == 0
    assert regret["avg_candidate_regret"] == 0.5
    assert regret["avg_job_regret"] == 1.0
