import time

def build_bad_character_table(pattern: str) -> dict[str, int]:
    """
    Builds the Bad Character Table for Boyer-Moore-Horspool.
    For each character in the pattern (except the last), it calculates the shift
    distance from the right end.
    """
    m = len(pattern)
    bct = {}
    
    if m == 0:
        return bct
        
    for i in range(m - 1):
        bct[pattern[i]] = m - 1 - i
        
    return bct

def bmh_search(text: str, pattern: str) -> tuple[int, int]:
    """
    Performs Boyer-Moore-Horspool search.
    DOES NOT USE 'in' or 'str.find()'.
    Returns: (match_index, character_comparisons)
    """
    n = len(text)
    m = len(pattern)
    comparisons = 0
    
    if m == 0:
        return 0, comparisons
    if n < m:
        return -1, comparisons
        
    bct = build_bad_character_table(pattern)
    
    i = m - 1 # Pattern end index in text
    
    while i < n:
        k = 0
        
        # Compare from right to left
        while k < m:
            comparisons += 1
            if pattern[m - 1 - k] != text[i - k]:
                break
            k += 1
            
        if k == m:
            # Match found
            return i - m + 1, comparisons
            
        # Shift
        char_at_i = text[i]
        shift = bct.get(char_at_i, m) # default shift is length of pattern
        i += shift
        
    return -1, comparisons

def naive_search(text: str, pattern: str) -> tuple[int, int]:
    """
    Performs Naive string matching.
    DOES NOT USE 'in' or 'str.find()'.
    Returns: (match_index, character_comparisons)
    """
    n = len(text)
    m = len(pattern)
    comparisons = 0
    
    if m == 0:
        return 0, comparisons
    if n < m:
        return -1, comparisons
        
    for i in range(n - m + 1):
        match = True
        for j in range(m):
            comparisons += 1
            if text[i + j] != pattern[j]:
                match = False
                break
        if match:
            return i, comparisons
            
    return -1, comparisons

def match_candidate_to_job(candidate_skills_str: str, job_skills_str: str) -> dict:
    """
    Splits skills and compares them using BMH exact match.
    Expected format: comma-separated normalized strings.
    """
    # Create manual split function since we should avoid built-in substrings as much as possible,
    # but `str.split()` on commas is fine for separating individual skills. 
    # The requirement is specifically against `str.find()` or `in` for matching the skills themselves.
    def split_skills(s: str) -> list[str]:
        return [x.strip() for x in s.split(',') if x.strip()]
        
    cand_skills = split_skills(candidate_skills_str)
    req_skills = split_skills(job_skills_str)
    
    matched = []
    missing = []
    total = len(req_skills)
    
    for req in req_skills:
        found = False
        # Perform BMH search of 'req' pattern inside the candidate's skills string
        # We append commas around the strings to ensure EXACT word matches, 
        # i.e. "sql" doesn't match inside "nosql".
        
        # Format candidate string: ", skill1, skill2, "
        search_text = f", {candidate_skills_str} ,"
        search_pattern = f", {req} ,"
        
        idx, _ = bmh_search(search_text, search_pattern)
        
        if idx != -1:
            found = True
            
        if found:
            matched.append(req)
        else:
            missing.append(req)
            
    exact_match_count = len(matched)
    match_percentage = round((exact_match_count / total * 100), 2) if total > 0 else 0.0
    
    return {
        "matched_skills": ", ".join(matched),
        "missing_skills": ", ".join(missing),
        "exact_match_count": exact_match_count,
        "total_required_skills": total,
        "match_percentage": match_percentage
    }
