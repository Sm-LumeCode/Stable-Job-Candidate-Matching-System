import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.preference_lists import generate_candidate_preferences, generate_job_preferences
from models.candidate import Candidate
from models.job import Job

class MockJob(Job):
    def __init__(self, job_id, capacity=1, score_total=0.5):
        self.job_id = job_id
        self.capacity = capacity
        self.score_total = score_total
        # Set all properties to avoid errors in calculation
        self.normalized_required_skills = ""
        self.min_experience_years = 0.0
        self.offered_salary = 0.0
        self.location = ""

class MockCandidate(Candidate):
    def __init__(self, candidate_id, score_total=0.5):
        self.candidate_id = candidate_id
        self.score_total = score_total
        # Set all properties to avoid errors in calculation
        self.normalized_skills = ""
        self.experience_years = 0.0
        self.desired_salary = 0.0
        self.preferred_location = ""

# Instead of relying on the actual combined_score to return precise values which might be hard to mock perfectly without pytest-mock,
# we can just use real candidates and jobs but construct them in a way that generates zero vs high scores.

def test_generate_candidate_preferences_filters_below_threshold():
    candidate = Candidate(candidate_id="C1", normalized_skills="python")
    job_good = Job(job_id="J1", normalized_required_skills="python") # Should score high (1.0 exact match)
    job_bad = Job(job_id="J2", normalized_required_skills="java", location="Mars", offered_salary=1) # Should score 0.0 (or very low) if cand has diff skills
    
    weights = {"exact_match": 1.0, "dp_similarity": 0.0, "experience": 0.0, "salary": 0.0, "location": 0.0}
    
    prefs = generate_candidate_preferences(candidate, [job_good, job_bad], weights, {})
    
    assert prefs.candidate_id == "C1"
    assert "J1" in prefs.preferences
    assert "J2" not in prefs.preferences # Filtered out because it scored 0

def test_generate_job_preferences_sorts_descending():
    job = Job(job_id="J1", capacity=1, normalized_required_skills="python")
    cand_best = Candidate(candidate_id="C1", normalized_skills="python", experience_years=5)
    cand_mid = Candidate(candidate_id="C2", normalized_skills="python", experience_years=2)
    job.min_experience_years = 5
    
    weights = {"exact_match": 0.5, "experience": 0.5, "dp_similarity": 0.0, "salary": 0.0, "location": 0.0}
    
    prefs = generate_job_preferences(job, [cand_mid, cand_best], weights, {})
    
    assert prefs.job_id == "J1"
    assert len(prefs.preferences) == 2
    # cand_best should be first because experience matches perfectly
    assert prefs.preferences[0] == "C1"
    assert prefs.preferences[1] == "C2"
