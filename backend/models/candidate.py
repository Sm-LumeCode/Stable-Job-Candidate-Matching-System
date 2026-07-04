from datetime import datetime
from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    skills: Mapped[str] = mapped_column(Text, default="")  # original extracted skills
    ai_skills: Mapped[str] = mapped_column(Text, default="")  # groq extracted skills string
    ai_extraction_metadata: Mapped[str] = mapped_column(Text, default="[]") # raw metadata JSON
    normalized_skills: Mapped[str] = mapped_column(Text, default="")  # taxonomy-canonical skills
    experience_years: Mapped[float] = mapped_column(Float, default=0)
    desired_role: Mapped[str] = mapped_column(String(180), default="")
    desired_salary: Mapped[float | None] = mapped_column(Float, nullable=True)
    preferred_location: Mapped[str] = mapped_column(String(150), default="")
    education: Mapped[str] = mapped_column(Text, default="")
    resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    resume_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
