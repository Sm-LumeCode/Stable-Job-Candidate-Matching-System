from datetime import datetime
from sqlalchemy import DateTime, Integer, String, Text, Float
from sqlalchemy.orm import Mapped, mapped_column
from database import Base

class StableMatchingResult(Base):
    __tablename__ = "stable_match_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[str] = mapped_column(String(20), index=True)
    assigned_job_id: Mapped[str | None] = mapped_column(String(20), index=True, nullable=True)
    
    proposal_count: Mapped[int] = mapped_column(Integer, default=0)
    proposal_history: Mapped[str] = mapped_column(Text, default="[]")
    preference_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    execution_time_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
