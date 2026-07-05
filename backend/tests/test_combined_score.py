import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.combined_score import compute_combined_score
from models.candidate import Candidate
from models.job import Job

def test_compute_combined_score_valid_weights():
    candidate = Candidate(
        normalized_skills="python, react, sql",
        experience_years=5.0,
        desired_salary=90000,
        preferred_location="New York"
    )
    job = Job(
        normalized_required_skills="python, react",
        min_experience_years=4.0,
        offered_salary=100000,
        location="New York"
    )
    weights = {
        "exact_match": 0.40,
        "dp_similarity": 0.30,
        "experience": 0.15,
        "salary": 0.10,
        "location": 0.05
    }
    
    result = compute_combined_score(candidate, job, weights)
    
    assert "total" in result
    assert "breakdown" in result
    # exact match: 1.0 (both job skills found in candidate)
    # dp similarity: 1.0 (all job skills found)
    # exp: 1 - min(abs(5-4)/4, 1) = 0.75
    # salary: 90000 <= 100000 -> 1.0
    # location: "new york" == "new york" -> 1.0
    
    bd = result["breakdown"]
    assert bd["exact_match"]["score"] == 1.0
    assert bd["dp_similarity"]["score"] == 1.0
    assert bd["experience"]["score"] == 0.75
    assert bd["salary"]["score"] == 1.0
    assert bd["location"]["score"] == 1.0
    
    expected_total = (1.0 * 0.4) + (1.0 * 0.3) + (0.75 * 0.15) + (1.0 * 0.1) + (1.0 * 0.05)
    assert result["total"] == pytest.approx(expected_total, 0.001)

def test_compute_combined_score_invalid_weights():
    candidate = Candidate()
    job = Job()
    weights = {
        "exact_match": 0.50,
        "dp_similarity": 0.50,
        "experience": 0.50,
        "salary": 0.0,
        "location": 0.0
    }
    with pytest.raises(ValueError):
        compute_combined_score(candidate, job, weights)

def test_compute_combined_score_remote_location():
    candidate = Candidate(preferred_location="remote")
    job = Job(location="San Francisco, CA (Remote OK)")
    weights = {
        "exact_match": 0.40, "dp_similarity": 0.30, 
        "experience": 0.15, "salary": 0.10, "location": 0.05
    }
    result = compute_combined_score(candidate, job, weights)
    assert result["breakdown"]["location"]["score"] == 0.5

def test_compute_combined_score_salary_penalty():
    candidate = Candidate(desired_salary=120000)
    job = Job(offered_salary=100000)
    weights = {
        "exact_match": 0.40, "dp_similarity": 0.30, 
        "experience": 0.15, "salary": 0.10, "location": 0.05
    }
    result = compute_combined_score(candidate, job, weights)
    # penalty: 1 - (120k - 100k)/100k = 1 - 0.2 = 0.8
    assert result["breakdown"]["salary"]["score"] == 0.8
