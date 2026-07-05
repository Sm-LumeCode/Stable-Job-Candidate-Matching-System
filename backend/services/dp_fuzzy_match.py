"""
DP Fuzzy Skill Matching
========================
Pure-function module implementing two DP similarity algorithms for skill
strings, with a taxonomy-aware hybrid mode that reduces substitution cost
when two tokens share the same canonical skill group.

Taxonomy Map Format
-------------------
Expected dict produced by preprocessing.load_taxonomy():
    { cleaned_skill_term: canonical_skill }   (both lower-cased strings)

e.g. {"reactjs": "react", "react.js": "react", "python3": "python", ...}

Public API
----------
fuzzy_similarity(skill_a, skill_b, taxonomy_map)  -> float  [0.0 – 1.0]
skill_set_similarity(candidate_skills, job_skills, taxonomy_map) -> float
lcs_similarity(a, b)       -> float   (standalone, no taxonomy)
edit_distance_similarity(a, b, sub_cost) -> float  (standalone)
"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_PUNCT_RE = re.compile(r"[^\w\s]")


def _normalize_token(token: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    token = token.lower()
    token = _PUNCT_RE.sub(" ", token)
    return " ".join(token.split()).strip()


def _canonical(token: str, taxonomy_map: dict[str, str]) -> str:
    """
    Return the canonical form of *token* using the taxonomy map.
    Falls back to the cleaned token itself if not found.
    """
    key = _normalize_token(token)
    return taxonomy_map.get(key, key)


# ---------------------------------------------------------------------------
# Algorithm 1 – LCS-based similarity  (O(m*n) DP)
# ---------------------------------------------------------------------------

def lcs_length(a: str, b: str) -> int:
    """
    Classic Longest Common Subsequence length via bottom-up DP table.

    Space optimised to two rows (O(min(m,n)) space).
    """
    if len(a) < len(b):
        a, b = b, a          # ensure a is the longer string

    m, n = len(a), len(b)
    # prev[j] = LCS length for a[:i-1], b[:j]
    prev = [0] * (n + 1)

    for i in range(1, m + 1):
        curr = [0] * (n + 1)
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev = curr

    return prev[n]


def lcs_similarity(a: str, b: str) -> float:
    """
    Normalized LCS similarity in [0.0, 1.0].

    score = 2 * lcs_length(a, b) / (len(a) + len(b))

    Returns 1.0 if both strings are empty, 0.0 if only one is empty.
    """
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    lcs = lcs_length(a, b)
    return (2 * lcs) / (len(a) + len(b))


# ---------------------------------------------------------------------------
# Algorithm 2 – Edit Distance similarity  (O(m*n) DP, configurable sub cost)
# ---------------------------------------------------------------------------

def edit_distance(a: str, b: str, sub_cost: float = 1.0) -> float:
    """
    Wagner–Fischer edit distance with configurable substitution cost.

    Insertions and deletions always cost 1.0.
    Substitution cost is *sub_cost* (default 1.0; pass 0.3 for same-taxonomy
    pairs to reward near-synonym matches).

    Returns the total edit distance as a float.
    """
    m, n = len(a), len(b)

    # dp[i][j] = edit distance between a[:i] and b[:j]
    # Space-optimised: keep only prev and curr rows.
    prev = [float(j) for j in range(n + 1)]

    for i in range(1, m + 1):
        curr = [0.0] * (n + 1)
        curr[0] = float(i)          # delete i chars from a
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                curr[j] = prev[j - 1]                   # match – no cost
            else:
                replace = prev[j - 1] + sub_cost        # substitute
                delete  = prev[j]     + 1.0             # delete from a
                insert  = curr[j - 1] + 1.0             # insert into a
                curr[j] = min(replace, delete, insert)
        prev = curr

    return prev[n]


def edit_distance_similarity(a: str, b: str, sub_cost: float = 1.0) -> float:
    """
    Normalized edit-distance similarity in [0.0, 1.0].

    score = 1 - edit_distance(a, b, sub_cost) / max(len(a), len(b))

    Returns 1.0 for two empty strings, 0.0 if one is empty.
    """
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    max_len = max(len(a), len(b))
    dist = edit_distance(a, b, sub_cost=sub_cost)
    # Clamp to [0, 1] — with reduced sub_cost the raw distance can in theory
    # exceed max_len in degenerate cases if the string lengths differ greatly,
    # but clamping is still safe.
    return max(0.0, 1.0 - dist / max_len)


# ---------------------------------------------------------------------------
# Hybrid similarity  (taxonomy-aware)
# ---------------------------------------------------------------------------

_SAME_TAXONOMY_SUB_COST = 0.3   # reduced substitution cost for same-group pairs


def fuzzy_similarity(
    skill_a: str,
    skill_b: str,
    taxonomy_map: dict[str, str],
) -> float:
    """
    Hybrid fuzzy similarity between two skill tokens.

    Steps
    -----
    1. Normalize both tokens (lowercase, strip punctuation).
    2. Resolve each to its canonical form via *taxonomy_map*.
    3. If the canonical forms are **identical** → return 1.0 immediately
       (handles "ReactJS" / "React" synonym pairs perfectly).
    4. Otherwise compute both:
         a. LCS similarity on the *normalized* token strings.
         b. Edit-distance similarity on the *normalized* token strings,
            using a **reduced substitution cost (0.3)** when both tokens
            share the same taxonomy group, standard cost (1.0) otherwise.
    5. Return the average of (a) and (b) as the final score.

    Parameters
    ----------
    skill_a      : raw skill string (e.g. "ReactJS", "python3")
    skill_b      : raw skill string (e.g. "React",   "Python")
    taxonomy_map : dict {cleaned_term: canonical_skill} from load_taxonomy()

    Returns
    -------
    float in [0.0, 1.0]
    """
    norm_a = _normalize_token(skill_a)
    norm_b = _normalize_token(skill_b)

    if not norm_a and not norm_b:
        return 1.0
    if not norm_a or not norm_b:
        return 0.0

    canon_a = _canonical(skill_a, taxonomy_map)
    canon_b = _canonical(skill_b, taxonomy_map)

    # Exact taxonomy match → synonyms → perfect score
    if canon_a == canon_b:
        return 1.0

    # Determine substitution cost based on taxonomy group membership
    sub_cost = _SAME_TAXONOMY_SUB_COST if canon_a == canon_b else 1.0
    # Note: if canon_a != canon_b the cost stays 1.0; but we keep the
    # branch explicit for clarity and future tuning.

    lcs_score = lcs_similarity(norm_a, norm_b)
    ed_score  = edit_distance_similarity(norm_a, norm_b, sub_cost=sub_cost)

    return (lcs_score + ed_score) / 2.0


# ---------------------------------------------------------------------------
# Skill-set level similarity
# ---------------------------------------------------------------------------

def skill_set_similarity(
    candidate_skills: list[str],
    job_skills: list[str],
    taxonomy_map: dict[str, str],
) -> float:
    """
    Aggregate fuzzy similarity between a candidate's skill list and a job's
    required skill list.

    Algorithm
    ---------
    For each *job skill* find the **best** (maximum) fuzzy_similarity score
    across all candidate skills.  Return the mean of those per-job-skill best
    scores.

    Rationale: this is recall-oriented — we measure how well the candidate
    covers each required skill, which is the typical hiring concern.

    Parameters
    ----------
    candidate_skills : list of raw skill strings from the candidate
    job_skills       : list of required raw skill strings from the job posting
    taxonomy_map     : dict {cleaned_term: canonical_skill}

    Returns
    -------
    float in [0.0, 1.0].  Returns 0.0 if job_skills is empty.
    Returns 0.0 per job skill if candidate_skills is empty.
    """
    if not job_skills:
        return 0.0

    total = 0.0
    for job_skill in job_skills:
        if not candidate_skills:
            best = 0.0
        else:
            best = max(
                fuzzy_similarity(cand_skill, job_skill, taxonomy_map)
                for cand_skill in candidate_skills
            )
        total += best

    return total / len(job_skills)
