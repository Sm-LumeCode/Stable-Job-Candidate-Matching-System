from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import initialize_database
from routes import admin, benchmark, candidates, jobs, matching, resumes, skills, uploads


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="StableHire API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (admin.router, uploads.router, resumes.router, candidates.router, jobs.router, skills.router, matching.router, benchmark.router):
    app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"name": "StableHire API", "status": "ready"}


@app.get("/health")
def health():
    return {"status": "healthy"}
