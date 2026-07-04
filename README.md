# StableHire

Enterprise-ready skeleton for a job-candidate stable matching platform.

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API and Swagger UI are available at `http://localhost:8000` and
`http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI is available at `http://localhost:5173`. Set `VITE_API_URL` to override
the default API URL (`http://localhost:8000`).

## CSV columns

- Candidates: `name,email,skills,experience_years,location`
- Jobs: `title,company,required_skills,location,description`
- Skills: `name,category,aliases`

Skills and aliases may be separated with semicolons.

