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
    inspector = inspect(engine)
    signatures = {
        "candidates": {"candidate_id", "desired_role", "preferred_location"},
        "jobs": {"job_id", "company_name", "capacity"},
        "skill_taxonomy": {"skill_term", "canonical_skill"},
    }
    legacy = any(
        table in inspector.get_table_names()
        and not required.issubset({column["name"] for column in inspector.get_columns(table)})
        for table, required in signatures.items()
    )
    if legacy:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
