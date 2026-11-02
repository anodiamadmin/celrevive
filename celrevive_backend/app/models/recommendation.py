import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    TIMESTAMP,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BaseCatalog(Base):
    __tablename__ = "base"

    base_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    base_name: Mapped[str] = mapped_column(String(255), nullable=False)
    price_tier: Mapped[str | None] = mapped_column(String(50))
    age_min: Mapped[int | None] = mapped_column(SmallInteger)
    age_max: Mapped[int | None] = mapped_column(SmallInteger)
    skin_type: Mapped[str | None] = mapped_column(String(100))
    moisture: Mapped[str | None] = mapped_column(String(100))
    ph_min: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    ph_max: Mapped[Decimal | None] = mapped_column(Numeric(4, 2))
    description: Mapped[str | None] = mapped_column(Text)


class ActiveCatalog(Base):
    __tablename__ = "active"

    active_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    active_name: Mapped[str] = mapped_column(String(255), nullable=False)
    supplier_id: Mapped[int | None] = mapped_column(BigInteger)
    category_id: Mapped[int | None] = mapped_column(BigInteger)
    cost_per_gram: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    usage_level_min: Mapped[Decimal | None] = mapped_column(Numeric(8, 4))
    usage_level_max: Mapped[Decimal | None] = mapped_column(Numeric(8, 4))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class BaseActiveCompatibility(Base):
    __tablename__ = "base_active_compatibility"

    base_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("base.base_id", ondelete="CASCADE"), primary_key=True
    )
    active_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("active.active_id", ondelete="CASCADE"), primary_key=True
    )
    is_compatible: Mapped[bool] = mapped_column(Boolean, nullable=False)
    note: Mapped[str | None] = mapped_column(Text)


class RecommendationRun(Base):
    __tablename__ = "recommendation_run"

    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customer_session.session_id", ondelete="CASCADE"),
        nullable=False,
    )
    model_provider: Mapped[str | None] = mapped_column(String(100))
    model_name: Mapped[str | None] = mapped_column(String(255))
    prompt_version: Mapped[str | None] = mapped_column(String(100))
    rag_version: Mapped[str | None] = mapped_column(String(100))
    input_skin_concerns_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    rag_context_json: Mapped[dict | None] = mapped_column(JSONB)
    recommendation_status: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default=text("'STARTED'")
    )
    overall_explanation: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RecommendationBase(Base):
    __tablename__ = "recommendation_base"

    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendation_run.recommendation_id", ondelete="CASCADE"),
        primary_key=True,
    )
    base_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("base.base_id", ondelete="RESTRICT"), primary_key=True
    )
    recommendation_rank: Mapped[int | None] = mapped_column(Integer)
    base_selected: Mapped[bool] = mapped_column(nullable=False, server_default=text("TRUE"))
    if_base_selected_why: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=""
    )
    recommendation_score: Mapped[Decimal | None] = mapped_column(Numeric(8, 4))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )


class RecommendationActive(Base):
    __tablename__ = "recommendation_active"

    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendation_run.recommendation_id", ondelete="CASCADE"),
        primary_key=True,
    )
    base_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("base.base_id", ondelete="RESTRICT"), primary_key=True
    )
    active_id: Mapped[int] = mapped_column(
        ForeignKey("active.active_id", ondelete="RESTRICT"), primary_key=True
    )
    recommendation_rank: Mapped[int | None] = mapped_column(Integer)
    active_selected: Mapped[bool] = mapped_column(nullable=False, server_default=text("TRUE"))
    if_active_selected_why: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=""
    )
    recommendation_score: Mapped[Decimal | None] = mapped_column(Numeric(8, 4))
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["base_id", "active_id"],
            [
                "base_active_compatibility.base_id",
                "base_active_compatibility.active_id",
            ],
            ondelete="RESTRICT",
        ),
    )


class RecommendationOutput(Base):
    __tablename__ = "recommendation_output"

    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("recommendation_run.recommendation_id", ondelete="CASCADE"),
        primary_key=True,
    )
    output_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    formatted_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
