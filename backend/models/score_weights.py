from datetime import datetime
from sqlalchemy import Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class ScoreWeights(Base):
    __tablename__ = "score_weights"

    id: Mapped[int] = mapped_column(primary_key=True)
    exact_match: Mapped[float] = mapped_column(Float, default=0.40)
    dp_similarity: Mapped[float] = mapped_column(Float, default=0.30)
    experience: Mapped[float] = mapped_column(Float, default=0.15)
    salary: Mapped[float] = mapped_column(Float, default=0.10)
    location: Mapped[float] = mapped_column(Float, default=0.05)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
