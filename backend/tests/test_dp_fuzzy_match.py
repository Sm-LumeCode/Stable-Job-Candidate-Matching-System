"""
Unit tests for services/dp_fuzzy_match.py
==========================================
Run with:
    cd backend
    python -m pytest tests/test_dp_fuzzy_match.py -v

No DB or network access required – all functions are pure.
"""

import sys
import os

# Allow importing from backend/ root when running from any working dir
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from services.dp_fuzzy_match import (
    lcs_length,
    lcs_similarity,
    edit_distance,
    edit_distance_similarity,
    fuzzy_similarity,
    skill_set_similarity,
)

# ---------------------------------------------------------------------------
# Shared taxonomy map (mirrors what load_taxonomy() would return from the DB)
# Covers: reactjs/react.js → react, python3 → python, ml → machine learning
# ---------------------------------------------------------------------------
# Keys must be in _clean() / _normalize_token() form (lowercase, punctuation → space,
# whitespace collapsed) — exactly as load_taxonomy() stores them.
TAXONOMY: dict[str, str] = {
    # react family
    "reactjs":          "react",
    "react js":         "react",    # "react.js" after _clean() → "react js"
    "react":            "react",
    # python family
    "python3":          "python",
    "py":               "python",
    "python":           "python",
    # ML
    "ml":               "machine learning",
    "machine learning": "machine learning",
    # node family  ("node.js" → _clean() → "node js")
    "node":             "node js",
    "nodejs":           "node js",
    "node js":          "node js",
    # postgres family
    "postgres":         "postgresql",
    "postgresql":       "postgresql",
    # javascript
    "js":               "javascript",
    "javascript":       "javascript",
}


# ===========================================================================
# 1.  LCS helpers
# ===========================================================================

class TestLcsLength:
    def test_identical_strings(self):
        assert lcs_length("python", "python") == 6

    def test_empty_strings(self):
        assert lcs_length("", "") == 0

    def test_no_common_chars(self):
        assert lcs_length("abc", "xyz") == 0

    def test_subsequence(self):
        # "ace" is a subsequence of "abcde"
        assert lcs_length("abcde", "ace") == 3

    def test_asymmetric(self):
        assert lcs_length("react", "reactjs") == 5


class TestLcsSimilarity:
    def test_identical(self):
        assert lcs_similarity("python", "python") == pytest.approx(1.0)

    def test_both_empty(self):
        assert lcs_similarity("", "") == pytest.approx(1.0)

    def test_one_empty(self):
        assert lcs_similarity("python", "") == pytest.approx(0.0)

    def test_partial_overlap(self):
        score = lcs_similarity("react", "reactjs")
        # LCS = 5, total chars = 5+7 = 12  → 10/12 ≈ 0.833
        assert 0.8 < score < 0.9

    def test_no_overlap(self):
        score = lcs_similarity("sql", "java")
        assert score == pytest.approx(0.0)


# ===========================================================================
# 2.  Edit Distance helpers
# ===========================================================================

class TestEditDistance:
    def test_identical(self):
        assert edit_distance("python", "python") == pytest.approx(0.0)

    def test_single_insert(self):
        # "cat" → "cats" requires 1 insertion
        assert edit_distance("cat", "cats") == pytest.approx(1.0)

    def test_single_delete(self):
        assert edit_distance("cats", "cat") == pytest.approx(1.0)

    def test_single_substitute(self):
        # "car" → "cat" requires 1 substitution
        assert edit_distance("car", "cat", sub_cost=1.0) == pytest.approx(1.0)

    def test_reduced_sub_cost(self):
        # With sub_cost=0.3 a single substitution costs only 0.3
        assert edit_distance("car", "cat", sub_cost=0.3) == pytest.approx(0.3)

    def test_empty_strings(self):
        assert edit_distance("", "") == pytest.approx(0.0)

    def test_one_empty(self):
        assert edit_distance("", "abc") == pytest.approx(3.0)

    def test_classic_example(self):
        # "kitten" → "sitting" = 3 operations (standard)
        assert edit_distance("kitten", "sitting") == pytest.approx(3.0)


class TestEditDistanceSimilarity:
    def test_identical(self):
        assert edit_distance_similarity("react", "react") == pytest.approx(1.0)

    def test_both_empty(self):
        assert edit_distance_similarity("", "") == pytest.approx(1.0)

    def test_one_empty(self):
        assert edit_distance_similarity("python", "") == pytest.approx(0.0)

    def test_range(self):
        score = edit_distance_similarity("react", "react native")
        assert 0.0 <= score <= 1.0


# ===========================================================================
# 3.  Five fuzzy_similarity skill-pair tests
#     (satisfies the requirement: 5 pairs incl. 1 synonym pair)
# ===========================================================================

class TestFuzzySimilarity:

    # Pair 1 – SYNONYM PAIR via taxonomy: "ReactJS" → "react", "React" → "react"
    def test_synonym_reactjs_react(self):
        score = fuzzy_similarity("ReactJS", "React", TAXONOMY)
        # Same canonical → must be 1.0
        assert score == pytest.approx(1.0), (
            f"Expected 1.0 for synonym pair ReactJS/React, got {score}"
        )

    # Pair 2 – Identical skills (no normalization needed)
    def test_identical_python(self):
        score = fuzzy_similarity("Python", "Python", TAXONOMY)
        assert score == pytest.approx(1.0)

    # Pair 3 – High similarity: "node.js" vs "nodejs" (same canonical via taxonomy)
    def test_nodejs_variants(self):
        score = fuzzy_similarity("node.js", "nodejs", TAXONOMY)
        # "node.js" → _normalize_token → "node js"  → canonical "node js"
        # "nodejs"  → _normalize_token → "nodejs"   → canonical "node js"
        # Same canonical → synonym hit → 1.0
        assert score == pytest.approx(1.0)

    # Pair 4 – Moderate similarity: "PostgreSQL" vs "Postgres" (same taxonomy group)
    def test_postgres_postgresql(self):
        score = fuzzy_similarity("postgres", "postgresql", TAXONOMY)
        # Same canonical → 1.0
        assert score == pytest.approx(1.0)

    # Pair 5 – Low/no similarity: "Python" vs "Java" (completely different, no taxonomy overlap)
    def test_dissimilar_python_java(self):
        score = fuzzy_similarity("Python", "Java", TAXONOMY)
        # Some character overlap ("a") but overall low score
        assert score < 0.6, (
            f"Expected low score for Python/Java, got {score}"
        )

    # Bonus: partial textual similarity without taxonomy match
    def test_partial_text_react_reactnative(self):
        score = fuzzy_similarity("react", "react native", TAXONOMY)
        # "react" is a substring of "react native" → moderate-high similarity
        assert 0.5 < score < 1.0

    # Bonus: totally unrelated skills
    def test_unrelated_sql_docker(self):
        score = fuzzy_similarity("sql", "docker", TAXONOMY)
        assert score < 0.4


# ===========================================================================
# 4.  skill_set_similarity
# ===========================================================================

class TestSkillSetSimilarity:

    def test_perfect_match(self):
        cands = ["react", "python", "sql"]
        jobs  = ["react", "python", "sql"]
        assert skill_set_similarity(cands, jobs, TAXONOMY) == pytest.approx(1.0)

    def test_synonym_match(self):
        # Candidate has "ReactJS", job requires "React" → taxonomy resolves → 1.0
        cands = ["ReactJS", "Python"]
        jobs  = ["React", "Python"]
        assert skill_set_similarity(cands, jobs, TAXONOMY) == pytest.approx(1.0)

    def test_empty_job_skills(self):
        cands = ["react", "python"]
        assert skill_set_similarity(cands, [], TAXONOMY) == pytest.approx(0.0)

    def test_empty_candidate_skills(self):
        jobs = ["react", "python"]
        assert skill_set_similarity([], jobs, TAXONOMY) == pytest.approx(0.0)

    def test_partial_match(self):
        cands = ["react", "python"]
        jobs  = ["react", "python", "docker"]   # docker not covered
        score = skill_set_similarity(cands, jobs, TAXONOMY)
        # 2 perfect + 1 low → avg > 0 but < 1
        assert 0.0 < score < 1.0

    def test_no_overlap(self):
        cands = ["java", "spring"]
        jobs  = ["react", "python", "docker"]
        score = skill_set_similarity(cands, jobs, TAXONOMY)
        assert score < 0.4

    def test_recall_orientation(self):
        """More job skills uncovered → lower score."""
        cands = ["react"]
        jobs_few  = ["react"]
        jobs_many = ["react", "python", "sql", "docker", "kubernetes"]
        score_few  = skill_set_similarity(cands, jobs_few,  TAXONOMY)
        score_many = skill_set_similarity(cands, jobs_many, TAXONOMY)
        assert score_few > score_many


# ===========================================================================
# 5.  Edge cases
# ===========================================================================

class TestEdgeCases:

    def test_empty_taxonomy_no_crash(self):
        score = fuzzy_similarity("ReactJS", "React", taxonomy_map={})
        # No taxonomy → textual similarity only; should not raise
        assert 0.0 <= score <= 1.0

    def test_whitespace_only_tokens(self):
        score = fuzzy_similarity("   ", "   ", TAXONOMY)
        # Both normalise to "" → 1.0
        assert score == pytest.approx(1.0)

    def test_single_char_skills(self):
        score = fuzzy_similarity("r", "r", TAXONOMY)
        assert score == pytest.approx(1.0)

    def test_score_bounded(self):
        """All scores must stay in [0, 1]."""
        pairs = [
            ("ReactJS", "React"),
            ("Python", "Java"),
            ("machine learning", "ml"),
            ("node.js", "nodejs"),
            ("docker", "kubernetes"),
        ]
        for a, b in pairs:
            s = fuzzy_similarity(a, b, TAXONOMY)
            assert 0.0 <= s <= 1.0, f"Out-of-bounds score {s} for ({a}, {b})"
