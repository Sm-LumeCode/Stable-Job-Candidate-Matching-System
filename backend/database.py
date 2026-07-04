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
        "users": {"username", "hashed_password", "role"},
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


