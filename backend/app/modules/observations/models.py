"""HealthObservation table (canonical model, PROJECT_MASTER section 6.3)."""

from datetime import datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, Float, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ObservationRow(Base):
    __tablename__ = "health_observations"

    observation_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    subject_id: Mapped[str] = mapped_column(String(40))
    mission_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(60), nullable=True)
    metric_code: Mapped[str] = mapped_column(String(40))
    # NULL means missing. Never replaced by zero.
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(String(20))
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    data_origin: Mapped[str] = mapped_column(String(20))
    source_reference: Mapped[dict] = mapped_column(JSON)
    quality_status: Mapped[str] = mapped_column(String(20))
    quality_confidence: Mapped[float] = mapped_column(Float)
    is_estimated: Mapped[bool] = mapped_column(Boolean)
    context: Mapped[dict] = mapped_column(JSON)
    # "metadata" is reserved by SQLAlchemy declarative classes.
    extra: Mapped[dict] = mapped_column("metadata", JSON)
    # SHA-256 of the canonical payload, used to tell a harmless retry from a conflicting reuse of an id.
    payload_sha256: Mapped[str] = mapped_column(String(64))
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (
        Index("ix_obs_subject_metric_time", "subject_id", "metric_code", "measured_at"),
        CheckConstraint("data_origin IN ('REAL_PUBLIC','DERIVED','SIMULATED','MANUAL')", name="ck_obs_data_origin"),
    )
