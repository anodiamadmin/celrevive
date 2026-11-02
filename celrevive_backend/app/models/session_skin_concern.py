import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String, Text, TIMESTAMP, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SessionSkinConcern(Base):
    __tablename__ = "session_skin_concern"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customer_session.session_id", ondelete="CASCADE"),
        primary_key=True,
    )
    concern_id: Mapped[str] = mapped_column(
        String(10),
        ForeignKey("skin_concern.concern_id", ondelete="RESTRICT"),
        primary_key=True,
    )
    image_skin_concern_exists: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("FALSE")
    )
    questionnaire_skin_concern_exists: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("FALSE")
    )
    skin_concern_exists: Mapped[bool] = mapped_column(Boolean, nullable=False)
    if_skin_concern_true_why: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=""
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

    __table_args__ = (
        CheckConstraint(
            "skin_concern_exists = "
            "(image_skin_concern_exists OR questionnaire_skin_concern_exists)",
            name="ck_session_skin_concern_combined_result",
        ),
    )
