import sqlite3

db_path = r'd:\Stable-Job-Candidate-Matching-System\backend\stablehire.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("=== RECRUITER ACCOUNTS ===")
cur.execute("SELECT id, username, email, role FROM users WHERE role='recruiter' ORDER BY id")
rows = cur.fetchall()
for row in rows:
    print(f"  id={row[0]} user={row[1]} email={row[2]}")

print()
print("=== ALL JOBS ===")
cur.execute("SELECT id, job_id, title, company_name, capacity, recruiter_id FROM jobs ORDER BY company_name, id")
jobs = cur.fetchall()
for j in jobs:
    print(f"  [{j[3]}] {j[2]} | cap={j[4]} | job_id={j[1]} | rec_id={j[5]}")

print()
print(f"Total jobs: {len(jobs)}")
conn.close()
