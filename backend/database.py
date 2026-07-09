from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./stablehire.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def initialize_database():
    """Create the current schema, replacing only the obsolete prototype schema."""
    from sqlalchemy import text
    inspector = inspect(engine)
    
    # Define required columns for legacy detection
    signatures = {
        "candidates": {"candidate_id", "desired_role", "preferred_location", "normalized_skills"},
        "jobs": {"job_id", "company_name", "capacity", "normalized_required_skills", "recruiter_id"},
        "skill_taxonomy": {"skill_term", "canonical_skill"},
        "users": {"username", "hashed_password", "role", "email"},
    }
    
    legacy = any(
        table in inspector.get_table_names()
        and not required.issubset({column["name"] for column in inspector.get_columns(table)})
        for table, required in signatures.items()
    )
    if legacy:
        Base.metadata.drop_all(bind=engine)
    
    # Create all tables (including new ones like app_settings)
    Base.metadata.create_all(bind=engine)

    # Perform lightweight migrations (add new columns without dropping data)
    inspector = inspect(engine)
    if "candidates" in inspector.get_table_names():
        columns = {c["name"] for c in inspector.get_columns("candidates")}
        with engine.begin() as conn:
            if "ai_skills" not in columns:
                conn.execute(text("ALTER TABLE candidates ADD COLUMN ai_skills TEXT DEFAULT ''"))
            if "ai_extraction_metadata" not in columns:
                conn.execute(text("ALTER TABLE candidates ADD COLUMN ai_extraction_metadata TEXT DEFAULT '[]'"))

    # Migrate app_settings table
    if "app_settings" in inspector.get_table_names():
        settings_cols = {c["name"] for c in inspector.get_columns("app_settings")}
        with engine.begin() as conn:
            if "recruitment_status" not in settings_cols:
                conn.execute(text("ALTER TABLE app_settings ADD COLUMN recruitment_status TEXT DEFAULT 'OPEN'"))
            if "groq_model" not in settings_cols:
                conn.execute(text("ALTER TABLE app_settings ADD COLUMN groq_model TEXT DEFAULT 'llama-3.3-70b-versatile'"))
            if "application_threshold" not in settings_cols:
                conn.execute(text("ALTER TABLE app_settings ADD COLUMN application_threshold REAL DEFAULT 0.70"))

    # Migrate jobs table
    if "jobs" in inspector.get_table_names():
        job_cols = {c["name"] for c in inspector.get_columns("jobs")}
        with engine.begin() as conn:
            if "status" not in job_cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN status TEXT DEFAULT 'OPEN'"))

    # Migrate candidate_applications table
    if "candidate_applications" in inspector.get_table_names():
        app_cols = {c["name"] for c in inspector.get_columns("candidate_applications")}
        with engine.begin() as conn:
            if "final_allocation" not in app_cols:
                conn.execute(text("ALTER TABLE candidate_applications ADD COLUMN final_allocation TEXT"))

    # Migrate users table (email was added after initial schema)
    if "users" in inspector.get_table_names():
        user_cols = {c["name"] for c in inspector.get_columns("users")}
        with engine.begin() as conn:
            if "email" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''"))

    # Seed default score weights if none exist
    with SessionLocal() as session:
        from models.score_weights import ScoreWeights
        if session.query(ScoreWeights).count() == 0:
            default_weights = ScoreWeights(
                exact_match=0.40,
                dp_similarity=0.30,
                experience=0.15,
                salary=0.10,
                location=0.05
            )
            session.add(default_weights)
            session.commit()

