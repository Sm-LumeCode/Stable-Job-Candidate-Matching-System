# StableHire – Algorithm Reference Guide

> This document explains **every algorithm** used in the StableHire job-candidate matching system: where it lives, which lines of code implement it, what it does, and a worked example using a single concrete candidate and job role.

---

## 📋 Example Candidate & Job Role

Throughout this document we use the same running example:

### 🧑‍💻 Candidate: "Priya Sharma"
| Field | Value |
|---|---|
| **Candidate ID** | `CAND-001` |
| **Raw Skills (from resume)** | `Python, Machine Learning, SQL, TensorFlow, Docker` |
| **Normalized Skills** | `python, machine learning, sql, tensorflow, docker` |
| **Experience** | 3 years |
| **Expected Salary** | 12 LPA |
| **Preferred Location** | Bangalore |

### 💼 Job Role: "Data Scientist" at Google
| Field | Value |
|---|---|
| **Job ID** | `JOB-001` |
| **Required Skills** | `Python, Machine Learning, SQL, PyTorch` |
| **Normalized Required Skills** | `python, machine learning, sql, pytorch` |
| **Min Experience** | 2 years |
| **Offered Salary** | 15 LPA |
| **Location** | Bangalore |
| **Capacity** | 3 |

---

## 1. Resume Text Extraction

**File:** `backend/services/resume_parser.py` — Lines 101–116  
**Function:** `extract_text(content, filename)`

### What it does
Reads the raw bytes of an uploaded PDF or DOCX and converts them to plain text.

| Format | Library | Method |
|---|---|---|
| PDF | `pypdf.PdfReader` | Iterates pages with `extraction_mode="layout"` |
| DOCX | `python-docx` | Joins non-empty paragraph texts |

### Code
```python
def extract_text(content: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(BytesIO(content))
        pages = []
        for page in reader.pages:
            text = page.extract_text(extraction_mode="layout")
            pages.append(text or "")
        return "\n".join(pages).strip()
    if suffix == ".docx":
        document = Document(BytesIO(content))
        return "\n".join(p.text for p in document.paragraphs if p.text.strip()).strip()
```

### Example
- **Input:** Priya's PDF resume bytes  
- **Output:** `"Priya Sharma\npriya@email.com\nSkills: Python, Machine Learning, SQL...\n3 years of experience..."`

---

## 2. Rule-Based Resume Parser

**File:** `backend/services/resume_parser.py` — Lines 140–197  
**Function:** `parse_resume(text, db)`

### What it does
Uses **regular expressions** to extract structured fields from raw resume text. Two tiers:

1. **Taxonomy-based skill detection** (Lines 152–160): Queries the `SkillTaxonomy` DB table and uses word-boundary regex to find each term in the lowercased resume text.
2. **Built-in keyword fallback** (Lines 162–166): Scans a hardcoded `TECH_KEYWORDS` list of 100+ terms as backup when taxonomy is empty.

### Key Regex Patterns
```python
email    = r"[\w.+-]+@[\w-]+\.[\w.-]+"
phone    = r"(?:\+\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}"
exp_yrs  = r"(?i)(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)"
salary   = r"(?i)(?:expected|desired|salary)[^\d$]{0,20}\$?\s*([\d,]{5,})"
```

### Skill Detection Code (Lines 151–168)
```python
# 1. Taxonomy-based
for item in taxonomy:
    if re.search(rf"(?<!\w){re.escape(item.skill_term.lower())}(?!\w)", lowered):
        found.append(item.canonical_skill)

# 2. Built-in fallback
for kw in _scan_keywords(text):
    if kw.lower() not in seen_canonical:
        found.append(kw)
```

### Example Output for Priya Sharma
```python
{
  "name":              "Priya Sharma",
  "email":             "priya@email.com",
  "skills":            "Python, Machine Learning, SQL, TensorFlow, Docker",
  "experience_years":  3.0,
  "desired_role":      "Data Scientist",
  "preferred_location":"Bangalore",
  "education":         "B.Tech Computer Science"
}
```

---

## 3. AI Resume Parser (Groq LLM)

**File:** `backend/services/ai_parser.py` — Full file  
**Function:** `extract_resume_ai(text, api_key, model)`

### What it does
Sends resume text to the **Groq LLaMA-3 LLM** and receives a structured JSON response with skill names, confidence scores, and reasoning. Only runs when `GROQ_API_KEY` is present and AI parsing is enabled in app settings.

### Example AI Output
```json
{
  "name": "Priya Sharma",
  "skills": [
    {"name": "Python",           "confidence": 0.98, "source": "Direct mention", "reason": "Explicitly listed in skills section"},
    {"name": "Machine Learning", "confidence": 0.95, "source": "Direct mention", "reason": "Listed under skills"},
    {"name": "TensorFlow",       "confidence": 0.90, "source": "Direct mention", "reason": "Found in skills section"},
    {"name": "Docker",           "confidence": 0.88, "source": "Direct mention", "reason": "Found in skills section"}
  ]
}
```

---

## 4. Skill Merge Engine

**File:** `backend/services/merge_engine.py` — Lines 1–54  
**Function:** `merge_skills(rule_based, ai_skills_data)`

### What it does
Combines rule-based and AI-extracted skills into a single deduplicated, confidence-ranked list.

**Merge Rules:**
1. AI skills are added first with their confidence scores.
2. Rule-based skills are then merged:
   - Already found by AI, but confidence < 0.85 → **boost to 0.85**, mark `"Rule-Based + AI"`
   - Not found by AI → **add with confidence 0.85**, mark `"Rule-Based"`
3. Final list is **sorted by confidence descending**.

### Code (Lines 14–48)
```python
# Step 1: Add AI skills
for skill in ai_skills_data:
    merged_map[key] = {"name": name, "confidence": confidence, ...}

# Step 2: Merge Rule-Based skills
for rb_key, rb_name in rb_map.items():
    if rb_key in merged_map:
        if merged_map[rb_key]["confidence"] < 0.85:
            merged_map[rb_key]["confidence"] = 0.85   # boost
            merged_map[rb_key]["source"] = "Rule-Based + AI"
    else:
        merged_map[rb_key] = {"name": rb_name, "confidence": 0.85, "source": "Rule-Based"}

# Step 3: Sort descending
merged_list = sorted(merged_map.values(), key=lambda x: x["confidence"], reverse=True)
```

### Example (Priya Sharma's Merged Skills)
| Skill | Source | Final Confidence |
|---|---|---|
| Python | AI | 0.98 |
| Machine Learning | AI | 0.95 |
| TensorFlow | AI | 0.90 |
| SQL | Rule-Based + AI | 0.85 (boosted) |
| Docker | Rule-Based | 0.85 |

---

## 5. Skill Taxonomy Normalization

**File:** `backend/services/preprocessing.py` — Lines 39–115  
**Functions:** `load_taxonomy()`, `normalize_skill()`, `normalize_skills()`

### What it does
Maps raw skill strings to **canonical (standardized) forms** using the `SkillTaxonomy` database table. Ensures "ReactJS", "React.js" and "React" all become `"react"`, preventing duplicates and enabling accurate matching.

**Steps:**
1. Lowercase the token
2. Remove punctuation (keep word chars and spaces)
3. Collapse whitespace
4. Lookup in taxonomy dict → return canonical form, or cleaned token as fallback

### Code (Lines 55–79)
```python
def _clean(token: str) -> str:
    token = token.lower()
    token = _PUNCT_RE.sub(" ", token)      # remove punctuation
    return " ".join(token.split()).strip()  # collapse whitespace

def normalize_skill(raw: str, taxonomy: dict) -> str:
    cleaned = _clean(raw)
    return taxonomy.get(cleaned, cleaned)  # canonical or fallback
```

### Example (Priya Sharma's Skills)
| Raw Skill | After `_clean()` | Taxonomy Lookup | Canonical Output |
|---|---|---|---|
| `"Python"` | `"python"` | Found | `"python"` |
| `"Machine Learning"` | `"machine learning"` | Found | `"machine learning"` |
| `"TensorFlow"` | `"tensorflow"` | Found | `"tensorflow"` |
| `"Docker"` | `"docker"` | Found | `"docker"` |

---

## 6. Boyer-Moore-Horspool (BMH) Exact Skill Matching

**File:** `backend/services/boyer_moore_horspool.py` — Lines 1–134  
**Functions:** `build_bad_character_table()`, `bmh_search()`, `match_candidate_to_job()`

### What it does
Performs **exact string matching** to find what percentage of a job's required skills the candidate has. The BMH algorithm is more efficient than naive search — it preprocesses the pattern into a Bad Character Table (BCT) and skips characters on mismatch.

### Algorithm Steps
1. **Build BCT**: For each char in the pattern (except last): `bct[char] = len(pattern) - 1 - position`
2. **Align** pattern at `i = len(pattern) - 1` in text
3. **Compare** pattern right-to-left
4. **On mismatch**: shift by `bct.get(text[i], len(pattern))`
5. **On full match**: return position

**Word-boundary trick:** Candidate skills wrapped as `", skill1, skill2 ,"` and pattern searched as `", python ,"` — ensures `"sql"` does NOT match inside `"nosql"`.

### Code (Lines 3–58)
```python
def build_bad_character_table(pattern):
    bct = {}
    for i in range(len(pattern) - 1):
        bct[pattern[i]] = len(pattern) - 1 - i
    return bct

def bmh_search(text, pattern):
    bct = build_bad_character_table(pattern)
    i = len(pattern) - 1
    while i < len(text):
        k = 0
        while k < len(pattern):
            if pattern[len(pattern)-1-k] != text[i-k]:
                break
            k += 1
        if k == len(pattern):
            return i - len(pattern) + 1, comparisons  # MATCH
        i += bct.get(text[i], len(pattern))            # SHIFT
    return -1, comparisons  # NOT FOUND
```

### Example (Priya vs Google Data Scientist)
Candidate skills string: `", python, machine learning, sql, tensorflow, docker ,"`

| Required Skill | Search Pattern | BMH Result |
|---|---|---|
| `python` | `", python ,"` | Found at idx 0 |
| `machine learning` | `", machine learning ,"` | Found |
| `sql` | `", sql ,"` | Found |
| `pytorch` | `", pytorch ,"` | **NOT FOUND** |

**Result:** `exact_match_count = 3`, `total = 4`, **`match_percentage = 75.0%`**

---

## 7. DP Fuzzy Skill Matching

**File:** `backend/services/dp_fuzzy_match.py` — Lines 1–263

This module implements **two dynamic programming algorithms** combined into a taxonomy-aware hybrid similarity measure.

---

### 7a. LCS (Longest Common Subsequence) Similarity — Lines 54–92

Measures how many characters two strings share in common order, normalized to [0, 1].

**Formula:**  `lcs_sim(a, b) = 2 × LCS_length(a, b) / (|a| + |b|)`

Uses a space-optimized O(m×n) DP table — only 2 rows kept in memory at a time.

```python
def lcs_length(a, b):
    prev = [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        curr = [0] * (len(b) + 1)
        for j in range(1, len(b) + 1):
            if a[i-1] == b[j-1]:
                curr[j] = prev[j-1] + 1       # match
            else:
                curr[j] = max(prev[j], curr[j-1])  # skip
        prev = curr
    return prev[len(b)]
```

**Example:**  
`a = "python"`, `b = "python"` → LCS = 6, sim = `2×6/(6+6) = 1.0`  
`a = "pytorch"`, `b = "python"` → LCS = `"pyto"` (4), sim = `2×4/(7+6) ≈ 0.615`

---

### 7b. Edit Distance Similarity — Lines 99–148

Wagner–Fischer algorithm — minimum insert/delete/substitute operations to transform one string into another.

**Configurable sub_cost:**  
- `1.0` for unrelated skills (default)  
- `0.3` for skills in the **same taxonomy group** (rewards near-synonyms)

**Formula:** `edit_sim(a, b) = 1 - edit_distance(a, b) / max(|a|, |b|)`

---

### 7c. Hybrid Fuzzy Similarity — Lines 158–212

Combines LCS and Edit Distance into a taxonomy-aware score:

```python
def fuzzy_similarity(skill_a, skill_b, taxonomy_map):
    canon_a = _canonical(skill_a, taxonomy_map)
    canon_b = _canonical(skill_b, taxonomy_map)

    if canon_a == canon_b:
        return 1.0  # Perfect score — taxonomy synonyms

    sub_cost  = 0.3 if canon_a == canon_b else 1.0
    lcs_score = lcs_similarity(norm_a, norm_b)
    ed_score  = edit_distance_similarity(norm_a, norm_b, sub_cost)
    return (lcs_score + ed_score) / 2.0
```

---

### 7d. Skill-Set Similarity — Lines 219–262

For each job skill, find the **best** fuzzy match from all candidate skills. Return the mean — measuring how well the candidate **covers every requirement**.

```python
def skill_set_similarity(candidate_skills, job_skills, taxonomy_map):
    for job_skill in job_skills:
        best = max(fuzzy_similarity(c, job_skill, taxonomy_map)
                   for c in candidate_skills)
        total += best
    return total / len(job_skills)
```

### Example (Priya vs Google Data Scientist)
| Job Skill | Best Candidate Match | fuzzy_similarity |
|---|---|---|
| `python` | `python` | **1.00** (exact taxonomy match) |
| `machine learning` | `machine learning` | **1.00** (exact) |
| `sql` | `sql` | **1.00** (exact) |
| `pytorch` | `tensorflow` | ~**0.52** (similar chars, different canonical) |

**DP Skill-Set Similarity = (1.00 + 1.00 + 1.00 + 0.52) / 4 = 0.88**

---

## 8. Combined Compatibility Score

**File:** `backend/services/combined_score.py` — Lines 8–86  
**Function:** `compute_combined_score(candidate, job, weights, taxonomy_map)`

### What it does
Combines **5 signals** into a single weighted compatibility score.

| Signal | Default Weight | Formula |
|---|---|---|
| Exact Match (BMH) | **40%** | `match_percentage / 100` |
| DP Similarity | **30%** | `skill_set_similarity(...)` |
| Experience | **15%** | `max(0, 1 - |cand_exp - job_exp| / job_exp)` |
| Salary | **10%** | `1.0` if cand ≤ offered, else penalty |
| Location | **5%** | `1.0` exact / `0.5` remote / `0.0` mismatch |

### Code (Lines 63–75)
```python
total = (
    exact_match * w_em  +   # 0.40
    dp_similarity * w_dp +  # 0.30
    experience * w_ex   +   # 0.15
    salary * w_sa       +   # 0.10
    location * w_lo         # 0.05
)
```

### Full Example (Priya vs Google Data Scientist)
| Signal | Candidate Value | Job Value | Score | Weight | Contribution |
|---|---|---|---|---|---|
| Exact Match (BMH) | 3 of 4 skills | — | **0.75** | 0.40 | 0.300 |
| DP Similarity | — | — | **0.88** | 0.30 | 0.264 |
| Experience | 3 yrs | min 2 yrs | **1.00** | 0.15 | 0.150 |
| Salary | 12 LPA | 15 LPA | **1.00** (12 ≤ 15) | 0.10 | 0.100 |
| Location | Bangalore | Bangalore | **1.00** | 0.05 | 0.050 |
| **TOTAL** | | | | | **0.864 (86.4%)** |

---

## 9. Preference List Generation

**File:** `backend/services/preference_lists.py` — Lines 7–96  
**Functions:** `generate_candidate_preferences()`, `generate_job_preferences()`

### What it does
Converts raw compatibility scores into **ordered preference lists** — the input required by Gale-Shapley.

- **For candidates:** Score each applied job → filter threshold (≥0.10) → sort desc → return ordered job IDs
- **For jobs:** Score each applied candidate → filter → sort desc → return ordered candidate IDs

### Code (Lines 36–55)
```python
for job in filtered_jobs:
    res = compute_combined_score(candidate, job, weights, taxonomy_map)
    score = res["total"]
    if score >= MIN_SCORE_THRESHOLD:   # 0.10 cutoff
        scored_jobs.append((job.job_id, score))

scored_jobs.sort(key=lambda x: x[1], reverse=True)
prefs = [j[0] for j in scored_jobs]
return CandidatePreference(candidate_id=candidate.candidate_id, preferences=prefs)
```

### Example (Priya's Preference List)
Three jobs exist and Priya has applied to all:

| Job | Score |
|---|---|
| Google – Data Scientist (JOB-001) | **0.864** |
| SAP – ML Engineer (JOB-002) | **0.720** |
| Amazon – Backend Dev (JOB-003) | **0.310** |

**Priya's Preference List:** `["JOB-001", "JOB-002", "JOB-003"]`

---

## 10. Gale-Shapley Stable Matching

**File:** `backend/services/gale_shapley.py` — Lines 28–138  
**Function:** `run_gale_shapley(payload)`

### What it does
Implements the **Hospital/Residents variant of the Gale-Shapley algorithm** — a Nobel Prize-winning algorithm that guarantees a **stable matching** (no blocking pairs).

**Properties:**
- Candidates propose, jobs accept/reject → result is **candidate-optimal**
- Jobs have **capacities** (e.g., Google can hire 3 people at once)
- **Blocking pair** `(c, j)`: candidate `c` prefers job `j` over their match AND `j` prefers `c` over one of its assignees → GS **guarantees zero blocking pairs**

### Algorithm Steps
```
1. All candidates start FREE (in a queue)
2. WHILE there are free candidates with unexhausted preferences:
   a. Take free candidate c
   b. c proposes to their next preferred job j
   c. If j is NOT on c's list → REJECT, c stays free
   d. If j has capacity → ACCEPT, c is matched to j
   e. If j is FULL:
        - Find j's worst currently assigned candidate (worst_c)
        - If j prefers c over worst_c:
            → REPLACE: j drops worst_c (now free again), accepts c
        - Else:
            → REJECT: c stays free
3. Candidates who exhaust all proposals → UNMATCHED
```

### Code (Lines 59–103)
```python
while free_candidates:
    c = free_candidates.popleft()
    if cand_next_proposal[c] >= len(cand_prefs[c]):
        continue  # exhausted all prefs → unmatched

    j = cand_prefs[c][cand_next_proposal[c]]
    cand_next_proposal[c] += 1

    if c not in job_rankings[j]:
        free_candidates.appendleft(c)   # not on job's list → rejected
        continue

    if len(job_assignments[j]) < job_capacities[j]:
        job_assignments[j].append(c)    # ACCEPT (capacity available)
    else:
        worst_c = max(job_assignments[j], key=lambda x: job_rankings[j][x])
        if job_rankings[j][c] < job_rankings[j][worst_c]:
            job_assignments[j].remove(worst_c)
            job_assignments[j].append(c)
            free_candidates.append(worst_c)  # worst_c displaced → free
        else:
            free_candidates.appendleft(c)    # c rejected → stays free
```

### Worked Example (3 Candidates, 3 Companies)

**Candidates and their preference lists (ranked by combined score):**

| Candidate | Score @ Google | Score @ SAP | Score @ Amazon | Preference List |
|---|---|---|---|---|
| Priya (CAND-001) | 0.864 | 0.720 | 0.310 | [Google, SAP, Amazon] |
| Rahul (CAND-002) | 0.810 | 0.650 | 0.750 | [Google, Amazon, SAP] |
| Nisha (CAND-003) | 0.600 | 0.880 | 0.420 | [SAP, Google, Amazon] |

**Job preference lists (ranked by combined score):**

| Job | Capacity | Ranked Candidates |
|---|---|---|
| Google – Data Scientist | 3 | [Priya, Rahul, Nisha] |
| SAP – ML Engineer | 1 | [Nisha, Priya, Rahul] |
| Amazon – Backend Dev | 2 | [Rahul, Nisha, Priya] |

**Step-by-step execution:**

| Round | Candidate | Proposes To | Result |
|---|---|---|---|
| 1 | Priya | Google | ACCEPT (Google has space: 0/3) |
| 2 | Rahul | Google | ACCEPT (Google has space: 1/3) |
| 3 | Nisha | SAP | ACCEPT (SAP has space: 0/1) |

**All candidates matched after Round 3.**

**Final Matching:**
| Job | Matched Candidates |
|---|---|
| Google – Data Scientist | Priya, Rahul |
| SAP – ML Engineer | Nisha |
| Amazon – Backend Dev | (no applicants) |

**Stability check:** No blocking pairs exist. Priya got her 1st choice. Rahul got his 1st choice. Nisha got her 1st choice. ✅ Stable.

---

## 11. Stability Checker

**File:** `backend/services/gale_shapley.py` — Lines 140–189  
**Function:** `check_stability(payload, matches)`

### What it does
Verifies the Gale-Shapley output by scanning **every candidate against every job** for blocking pairs.

**A blocking pair `(c, j)` exists when:**
1. Candidate `c` prefers job `j` over their current assignment (or is unmatched)
2. Job `j` prefers `c` over one of its current assignees (or has free capacity)

```python
for c in payload.candidates:
    for j_id in c.preferences:
        if j_id == c_current_job:
            break  # reached current match → stop scanning

        if len(j_assigned) < capacity[j_id]:
            blocking_pairs.append(...)           # free capacity = violation!
        elif job_rankings[j_id][c] < job_rankings[j_id][worst_c]:
            blocking_pairs.append(...)           # j prefers c = violation!
```

Returns `(is_stable: bool, blocking_pairs: list)`.

---

## 12. Matching Pipeline Orchestrator

**File:** `backend/routes/matching.py`  
**Endpoint:** `POST /api/matching/run`

### Full end-to-end flow
```
Request received
    │
    ▼
Load all Candidates + Jobs from DB
    │
    ▼
Load SkillTaxonomy → build taxonomy_map dict
    │
    ▼
For each Candidate:
    └─ generate_candidate_preferences()
         └─ compute_combined_score() [BMH + DP + Experience + Salary + Location]
    │
    ▼
For each Job:
    └─ generate_job_preferences()
         └─ compute_combined_score()
    │
    ▼
run_gale_shapley(payload)
    └─ Hospital/Residents algorithm
    │
    ▼
check_stability(payload, matches)
    │
    ▼
Save ApplicationRecord rows to DB
    │
    ▼
Return matches + stats + history
```

---

## 13. Algorithm Complexity Summary

| Algorithm | Time Complexity | Space | File |
|---|---|---|---|
| Regex Resume Parser | O(N × P) | O(N) | `resume_parser.py` |
| Taxonomy Normalization | O(S × T) | O(T) | `preprocessing.py` |
| BMH Exact Match | O(N/M) avg, O(N×M) worst | O(M) | `boyer_moore_horspool.py` |
| LCS Similarity | O(m×n) per pair | O(min(m,n)) | `dp_fuzzy_match.py` |
| Edit Distance | O(m×n) per pair | O(n) | `dp_fuzzy_match.py` |
| Skill-Set Similarity | O(C_skills × J_skills × m×n) | O(1) | `dp_fuzzy_match.py` |
| Combined Score | O(S²) per pair | O(1) | `combined_score.py` |
| Preference Generation | O(C × J × score_cost) | O(C+J) | `preference_lists.py` |
| Gale-Shapley | O(C × J) | O(C+J) | `gale_shapley.py` |
| Stability Check | O(C × J) | O(C+J) | `gale_shapley.py` |

> **Legend:** N=text length, P=patterns, S=skills, T=taxonomy size, C=candidates, J=jobs, M=pattern length, m/n=string lengths

---

## 14. File-to-Algorithm Quick Reference

| File | Algorithm(s) Inside |
|---|---|
| `backend/services/resume_parser.py` | Text extraction (PDF/DOCX), Regex parsing, Taxonomy + keyword skill scan |
| `backend/services/ai_parser.py` | Groq LLM AI skill extraction |
| `backend/services/merge_engine.py` | Rule+AI skill merge & confidence ranking |
| `backend/services/preprocessing.py` | Taxonomy loading, skill normalization |
| `backend/services/boyer_moore_horspool.py` | Bad Character Table, BMH exact matching, Naive search (baseline) |
| `backend/services/dp_fuzzy_match.py` | LCS similarity, Edit Distance similarity, Hybrid fuzzy, Skill-set similarity |
| `backend/services/combined_score.py` | Weighted multi-signal compatibility score (5 signals) |
| `backend/services/preference_lists.py` | Candidate preference list generation, Job preference list generation |
| `backend/services/gale_shapley.py` | Gale-Shapley stable matching (Hospital/Residents), Stability checker |
| `backend/routes/matching.py` | End-to-end pipeline orchestration |
