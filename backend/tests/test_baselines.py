import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.baselines import greedy_match, random_match
from schemas import CandidatePreference, JobPreference

def test_greedy_match():
    c_prefs = [
        CandidatePreference(candidate_id="C1", preferences=["J1", "J2"]),
        CandidatePreference(candidate_id="C2", preferences=["J1", "J2"])
    ]
    
    j_prefs = [
        JobPreference(job_id="J1", capacity=1, preferences=["C1", "C2"]),
        JobPreference(job_id="J2", capacity=1, preferences=["C2", "C1"])
    ]
    
    score_map = {
        ("C1", "J1"): 0.9,
        ("C2", "J1"): 0.8,
        ("C2", "J2"): 0.7,
        ("C1", "J2"): 0.6
    }
    
    matches = greedy_match(c_prefs, j_prefs, score_map)
    
    assert len(matches) == 2
    assert {"candidate_id": "C1", "job_id": "J1"} in matches
    assert {"candidate_id": "C2", "job_id": "J2"} in matches

def test_random_match():
    c_prefs = [
        CandidatePreference(candidate_id="C1", preferences=["J1"]),
        CandidatePreference(candidate_id="C2", preferences=["J1", "J2"])
    ]
    
    j_prefs = [
        JobPreference(job_id="J1", capacity=1, preferences=["C1", "C2"]),
        JobPreference(job_id="J2", capacity=1, preferences=["C2"])
    ]
    
    matches = random_match(c_prefs, j_prefs, seed=42)
    
    assert len(matches) <= 2
    job_counts = {}
    cand_matched = set()
    for m in matches:
        job_counts[m["job_id"]] = job_counts.get(m["job_id"], 0) + 1
        cand_matched.add(m["candidate_id"])
        
    assert job_counts.get("J1", 0) <= 1
    assert job_counts.get("J2", 0) <= 1
    assert len(cand_matched) == len(matches)
