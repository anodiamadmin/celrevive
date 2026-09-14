import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, String, Text, Boolean, TIMESTAMP, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
from app.models.questionnaire_response import QuestionnaireResponse
from app.models.skin_concern import SkinConcern


class SessionSkinConcernDetection(Base):
    __tablename__ = "session_skin_concern_detection"

    detection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customer_session.session_id", ondelete="CASCADE"), nullable=False
    )
    concern_id: Mapped[str] = mapped_column(
        String(10), ForeignKey("skin_concern.concern_id", ondelete="RESTRICT"), nullable=False
    )
    detection_source: Mapped[str] = mapped_column(String(20), nullable=False)
    image_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skin_image.image_id", ondelete="CASCADE"), nullable=True
    )
    questionnaire_response_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("questionnaire_response.questionnaire_response_id", ondelete="CASCADE"),
        nullable=True,
    )
    skin_concern_exists: Mapped[bool] = mapped_column(Boolean, nullable=False)
    if_skin_concern_true_why: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    raw_detection_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP")
    )

    __table_args__ = (
        CheckConstraint("detection_source IN ('IMAGE', 'QUESTIONNAIRE')", name="ck_detection_source"),
        CheckConstraint(
            "(detection_source = 'IMAGE' AND image_id IS NOT NULL AND questionnaire_response_id IS NULL) "
            "OR (detection_source = 'QUESTIONNAIRE' AND questionnaire_response_id IS NOT NULL AND image_id IS NULL)",
            name="ck_detection_source_reference",
        ),
    )