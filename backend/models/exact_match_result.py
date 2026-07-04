from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from database import Base

class ExactMatchResult(Base):
    __tablename__ = "exact_match_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[str] = mapped_column(String(20), index=True)
    job_id: Mapped[str] = mapped_column(String(20), index=True)
    
    matched_skills: Mapped[str] = mapped_column(Text, default="")
    missing_skills: Mapped[str] = mapped_column(Text, default="")
    
    exact_match_count: Mapped[int] = mapped_column(Integer, default=0)
    total_required_skills: Mapped[int] = mapped_column(Integer, default=0)
    match_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
