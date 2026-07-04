from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import initialize_database, SessionLocal
from routes import admin, benchmark, candidates, jobs, matching, resumes, skills, uploads, auth, settings
from routes.auth import router as auth_router
from auth import seed_admin

# Load .env FIRST before anything reads os.environ
load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(title="StableHire API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (auth_router, admin.router, uploads.router, resumes.router, candidates.router, jobs.router, skills.router, matching.router, benchmark.router, settings.router):
    app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"name": "StableHire API", "status": "ready"}


@app.get("/health")
def health():
    return {"status": "healthy"}
