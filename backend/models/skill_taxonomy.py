from datetime import datetime
from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class SkillTaxonomy(Base):
    __tablename__ = "skill_taxonomy"

    id: Mapped[int] = mapped_column(primary_key=True)
    skill_term: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    canonical_skill: Mapped[str] = mapped_column(String(180), index=True)
    category: Mapped[str] = mapped_column(String(120), index=True, default="General")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
