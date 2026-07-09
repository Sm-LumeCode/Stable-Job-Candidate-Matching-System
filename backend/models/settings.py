from sqlalchemy import Boolean, Float, String
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class AppSettings(Base):
    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    ai_parsing_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    groq_model: Mapped[str] = mapped_column(String(100), default="llama-3.3-70b-versatile")
    recruitment_status: Mapped[str] = mapped_column(String(20), default="OPEN")
    application_threshold: Mapped[float] = mapped_column(Float, default=0.70)  # auto-apply cutoff
