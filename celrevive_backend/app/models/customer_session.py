import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, String, TIMESTAMP, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CustomerSession(Base):
    __tablename__ = "customer_session"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    shopify_customer_id: Mapped[str | None] = mapped_column(String(100))
    shopify_customer_email: Mapped[str | None] = mapped_column(String(320))
    shopify_cart_id: Mapped[str | None] = mapped_column(String(255))
    shopify_checkout_id: Mapped[str | None] = mapped_column(String(255))
    consent_given: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("FALSE"))
    session_status: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default=text("'STARTED'")
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    notes: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (
        CheckConstraint(
            "session_status IN ('STARTED', 'IMAGE_RECEIVED', 'QUESTIONNAIRE_COMPLETED', "
            "'CONCERNS_COMBINED', 'RECOMMENDATION_GENERATED', 'RETURNED_TO_WIDGET', "
            "'ABANDONED', 'ERROR')",
            name="ck_customer_session_status",
        ),
    )