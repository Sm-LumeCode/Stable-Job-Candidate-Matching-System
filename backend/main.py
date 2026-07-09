import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from database import initialize_database, SessionLocal
from routes import admin, benchmark, candidates, jobs, matching, resumes, skills, uploads, auth, settings, stable_matching, applications, notifications
from routes.auth import router as auth_router
from auth import seed_admin

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

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

# Ensure uploads directory exists and mount it
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(os.path.join(uploads_dir, "resumes"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )

for router in (auth_router, admin.router, uploads.router, resumes.router, candidates.router, jobs.router, skills.router, matching.router, benchmark.router, settings.router, stable_matching.router, applications.router, notifications.router):
    app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"name": "StableHire API", "status": "ready"}


@app.get("/health")
def health():
    return {"status": "healthy"}
