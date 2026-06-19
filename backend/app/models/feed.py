import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class FeedEntry(Base):
    __tablename__ = "feed_entries"
    __table_args__ = (UniqueConstraint("entry_type", "period", name="uq_feed_entry"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # workout_of_day | challenge | exercise_spotlight | weekly_competition
    entry_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # "YYYY-MM-DD" for daily items, "YYYY-WNN" for weekly
    period: Mapped[str] = mapped_column(String(10), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
