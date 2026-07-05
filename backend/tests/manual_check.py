import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from services.dp_fuzzy_match import fuzzy_similarity

taxonomy = {
    "reactjs":  "react",
    "react js": "react",
    "react":    "react",
    "python":   "python",
    "photoshop":"photoshop",
}

score1 = fuzzy_similarity("ReactJS", "React", taxonomy)
score2 = fuzzy_similarity("Python", "Photoshop", taxonomy)

r1 = "PASS" if score1 > 0.7 else "FAIL"
r2 = "PASS" if score2 < 0.3 else "FAIL"

print(f'fuzzy_similarity("ReactJS",   "React")     = {score1:.4f}  [{r1}] (expect >0.7)')
print(f'fuzzy_similarity("Python",    "Photoshop") = {score2:.4f}  [{r2}] (expect <0.3)')
