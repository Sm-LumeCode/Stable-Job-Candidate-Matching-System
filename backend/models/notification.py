from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_identifier: Mapped[str] = mapped_column(String(255), index=True) # candidate_id or recruiter email/username
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    type: Mapped[str] = mapped_column(String(50), default="info") # success, info, error
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
