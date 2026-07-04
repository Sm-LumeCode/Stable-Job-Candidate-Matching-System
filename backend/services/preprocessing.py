"""
Skill Preprocessing Pipeline
==============================
Modular, standalone service that normalizes raw skill strings into taxonomy-
canonical forms.  This module is intentionally dependency-light so it can be
imported directly by Boyer-Moore-Horspool (next phase) without circular imports.

Public API
----------
load_taxonomy(db)          → dict[str, str]   # lower-term → canonical
normalize_skill(raw, tax)  → str              # single skill → canonical
normalize_skills(raw, db)  → tuple[str, str]  # (original_csv, normalized_csv)
"""

import re
from sqlalchemy.orm import Session
from models.skill_taxonomy import SkillTaxonomy


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_PUNCT_RE = re.compile(r"[^\w\s]")  # remove everything that isn't word char or space


def _clean(token: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    token = token.lower()
    token = _PUNCT_RE.sub(" ", token)
    token = " ".join(token.split())  # collapse internal whitespace
    return token.strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def load_taxonomy(db: Session) -> dict[str, str]:
    """
    Read all SkillTaxonomy rows and build a lookup dict.

    Returns
    -------
    dict mapping cleaned skill_term → canonical_skill  (both lower-cased).
    """
    rows = db.query(SkillTaxonomy).all()
    taxonomy: dict[str, str] = {}
    for row in rows:
        key = _clean(row.skill_term)
        taxonomy[key] = row.canonical_skill.strip().lower()
    return taxonomy


def normalize_skill(raw: str, taxonomy: dict[str, str]) -> str:
    """
    Normalize a single raw skill token.

    Steps
    -----
    1. lowercase
    2. remove punctuation
    3. trim / collapse whitespace
    4. look up in taxonomy → return canonical form if found
    5. otherwise return the cleaned token

    Parameters
    ----------
    raw      : raw skill string (e.g. "Python Programming", "ML", "SQL Queries")
    taxonomy : dict produced by load_taxonomy()

    Returns
    -------
    Canonical skill string (e.g. "python", "machine learning", "sql")
    """
    cleaned = _clean(raw)
    if not cleaned:
        return ""
    return taxonomy.get(cleaned, cleaned)


def normalize_skills(raw_csv: str, db: Session) -> tuple[str, str]:
    """
    Normalize a comma-separated skills string.

    Steps
    -----
    1. Split on commas
    2. Clean each token
    3. Remove empty tokens
    4. Resolve each token through normalize_skill()
    5. Deduplicate (preserving first-seen order)
    6. Rejoin with ", "

    Returns
    -------
    (original_csv, normalized_csv)
    original_csv  : cleaned comma-join of the raw tokens (whitespace trimmed)
    normalized_csv: canonical comma-join after taxonomy lookup
    """
    taxonomy = load_taxonomy(db)

    raw_tokens = [t.strip() for t in raw_csv.split(",") if t.strip()]
    original_csv = ", ".join(raw_tokens)  # preserve original casing/form

    seen: set[str] = set()
    normalized: list[str] = []
    for token in raw_tokens:
        canonical = normalize_skill(token, taxonomy)
        if canonical and canonical not in seen:
            seen.add(canonical)
            normalized.append(canonical)

    normalized_csv = ", ".join(normalized)
    return original_csv, normalized_csv
