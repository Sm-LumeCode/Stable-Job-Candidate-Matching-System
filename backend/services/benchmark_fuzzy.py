import time
import random
import string
from services.dp_fuzzy_match import lcs_length, edit_distance

def naive_lcs_length(a: str, b: str) -> int:
    """Naive recursive LCS (no memoization)."""
    if not a or not b:
        return 0
    if a[-1] == b[-1]:
        return 1 + naive_lcs_length(a[:-1], b[:-1])
    return max(naive_lcs_length(a[:-1], b), naive_lcs_length(a, b[:-1]))

def naive_edit_distance(a: str, b: str) -> float:
    """Naive recursive Edit Distance (no memoization, sub_cost=1.0)."""
    if not a:
        return float(len(b))
    if not b:
        return float(len(a))
    if a[-1] == b[-1]:
        return naive_edit_distance(a[:-1], b[:-1])
    
    replace = naive_edit_distance(a[:-1], b[:-1]) + 1.0
    delete = naive_edit_distance(a[:-1], b) + 1.0
    insert = naive_edit_distance(a, b[:-1]) + 1.0
    return min(replace, delete, insert)

def generate_random_string(length: int) -> str:
    return "".join(random.choices(string.ascii_lowercase, k=length))

def run_fuzzy_benchmark():
    # Lengths above 15 will take too long for O(3^N) naive recursion in python
    lengths = [5, 10, 12, 14, 15]
    results = []
    
    for length in lengths:
        s1 = generate_random_string(length)
        s2 = generate_random_string(length)
        
        # DP execution
        t0 = time.perf_counter()
        lcs_length(s1, s2)
        edit_distance(s1, s2)
        t1 = time.perf_counter()
        dp_time_ms = (t1 - t0) * 1000
        
        # Brute-force execution
        t0 = time.perf_counter()
        naive_lcs_length(s1, s2)
        naive_edit_distance(s1, s2)
        t1 = time.perf_counter()
        bf_time_ms = (t1 - t0) * 1000
        
        results.append({
            "length": length,
            "dp_time_ms": dp_time_ms,
            "bruteforce_time_ms": bf_time_ms
        })
        
    return results
