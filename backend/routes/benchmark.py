import time
import random
import string
from fastapi import APIRouter
from services.boyer_moore_horspool import bmh_search, naive_search

router = APIRouter(prefix="/benchmark", tags=["benchmark"])

def generate_test_data(text_len, pattern_len):
    chars = string.ascii_lowercase + " "
    text = "".join(random.choices(chars, k=text_len))
    # Make sure pattern sometimes exists, sometimes doesn't
    if random.random() > 0.5:
        idx = random.randint(0, text_len - pattern_len)
        pattern = text[idx:idx + pattern_len]
    else:
        pattern = "".join(random.choices(chars, k=pattern_len))
    return text, pattern

@router.get("/bmh")
def run_bmh_benchmark():
    ITERATIONS = 1000
    TEXT_LEN = 1000
    PATTERN_LEN = 10
    
    naive_times = []
    bmh_times = []
    
    naive_comps_total = 0
    bmh_comps_total = 0
    
    for _ in range(ITERATIONS):
        text, pattern = generate_test_data(TEXT_LEN, PATTERN_LEN)
        
        # Naive
        start = time.perf_counter()
        _, n_comps = naive_search(text, pattern)
        end = time.perf_counter()
        naive_times.append((end - start) * 1000) # ms
        naive_comps_total += n_comps
        
        # BMH
        start = time.perf_counter()
        _, b_comps = bmh_search(text, pattern)
        end = time.perf_counter()
        bmh_times.append((end - start) * 1000) # ms
        bmh_comps_total += b_comps
        
    naive_avg = sum(naive_times) / ITERATIONS
    bmh_avg = sum(bmh_times) / ITERATIONS
    
    speedup = naive_avg / bmh_avg if bmh_avg > 0 else 0
    
    return {
        "naive_runtime_ms": sum(naive_times),
        "bmh_runtime_ms": sum(bmh_times),
        "naive_comps": naive_comps_total,
        "bmh_comps": bmh_comps_total,
        "naive_avg_ms": naive_avg,
        "bmh_avg_ms": bmh_avg,
        "naive_worst_ms": max(naive_times),
        "bmh_worst_ms": max(bmh_times),
        "naive_best_ms": min(naive_times),
        "bmh_best_ms": min(bmh_times),
        "speedup": round(speedup, 2),
        "iterations": ITERATIONS,
        "text_length": TEXT_LEN,
        "pattern_length": PATTERN_LEN
    }
