from datetime import datetime
from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(180), index=True)
    company_name: Mapped[str] = mapped_column(String(180), index=True)
    required_skills: Mapped[str] = mapped_column(Text, default="")  # original required skills
    normalized_required_skills: Mapped[str] = mapped_column(Text, default="")  # canonical skills
    min_experience_years: Mapped[float] = mapped_column(Float, default=0)
    offered_salary: Mapped[float | None] = mapped_column(Float, nullable=True)
    location: Mapped[str] = mapped_column(String(150), default="")
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    description: Mapped[str] = mapped_column(Text, default="")
    recruiter_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)  # owner recruiter user id
    status: Mapped[str] = mapped_column(String(20), default="OPEN")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

