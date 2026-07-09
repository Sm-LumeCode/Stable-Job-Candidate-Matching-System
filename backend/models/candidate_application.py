from datetime import datetime
from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class CandidateApplication(Base):
    __tablename__ = "candidate_applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[str] = mapped_column(String(20), index=True)
    job_id: Mapped[str] = mapped_column(String(20), index=True)

    # auto_applied | manually_applied | cancelled
    status: Mapped[str] = mapped_column(String(20), default="auto_applied")

    # Combined compatibility score (0.0 – 1.0)
    compatibility_score: Mapped[float] = mapped_column(Float, default=0.0)

    # Candidate-assigned preference rank (1 = most preferred). NULL until set.
    preference_order: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Final allocation status after GS matching: "selected" or "rejected"
    final_allocation: Mapped[str | None] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
