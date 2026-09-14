from datetime import datetime

from sqlalchemy import Boolean, String, TIMESTAMP, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SkinConcern(Base):
    __tablename__ = "skin_concern"

    concern_id: Mapped[str] = mapped_column(String(10), primary_key=True)
    concern_name: Mapped[str] = mapped_column(String(255), nullable=False)
    detectable_by_selfie: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("FALSE")
    )
    detectable_by_questionnaire: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("FALSE")
    )
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
