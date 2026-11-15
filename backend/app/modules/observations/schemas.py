"""Canonical HealthObservation contract (PROJECT_MASTER 6.3), mirrored from frontend/web/src/types/domain.ts."""

import math
from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

DataOrigin = Literal["REAL_PUBLIC", "DERIVED", "SIMULATED", "MANUAL"]
QualityStatus = Literal["VALID", "QUESTIONABLE", "INVALID", "MISSING"]
MissionPhase = Literal["PRE_FLIGHT", "IN_FLIGHT", "POST_FLIGHT"]
ActivityContext = Literal["SLEEP", "REST", "WORK", "EXERCISE", "EVA"]

# Metric catalog of PROJECT_MASTER 6.4 plus the codes the web engine already emits (domain.ts MetricCode).
MetricCode = Literal[
    "HEART_RATE",
    "HRV_RMSSD",
    "ECG_SIGNAL",
    "SPO2",
    "RESPIRATORY_RATE",
    "SYSTOLIC_BP",
    "DIASTOLIC_BP",
    "SKIN_TEMPERATURE",
    "ACTIVITY_LEVEL",
    "SLEEP_DURATION",
    "SLEEP_EFFICIENCY",
    "EXERCISE_DURATION",
    "EXERCISE_LOAD",
    "REACTION_TIME",
    "HYDRATION",
    "CO2",
    "CABIN_TEMPERATURE",
    "RELATIVE_HUMIDITY",
    "RADIATION_DOSE_RATE",
    "RADIATION_DOSE",
    "CORTISOL",
    "WBC",
    "MOOD",
    "PERCEIVED_FATIGUE",
    "STRESS",
]

ID_PATTERN = r"^[A-Za-z0-9][A-Za-z0-9_.:\-]{0,79}$"


def _as_utc(v: datetime) -> datetime:
    if v.tzinfo is None:
        raise ValueError("timestamp must carry a timezone (UTC expected, e.g. 2026-11-13T14:30:00Z)")
    return v.astimezone(UTC)


class SourceReference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    repository: str | None = None
    dataset_accession: str | None = None
    file_name: str | None = None
    record_reference: str | None = None


class Quality(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: QualityStatus
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    is_estimated: bool = False


class ObservationContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mission_phase: MissionPhase | None = None
    activity: ActivityContext | None = None


class HealthObservation(BaseModel):
    """One measurement. Provenance (data_origin plus its required references) is mandatory."""

    model_config = ConfigDict(extra="forbid")

    observation_id: str = Field(pattern=ID_PATTERN, description="Idempotency key: resending the same id is a no op.")
    subject_id: str = Field(pattern=ID_PATTERN, description="Pseudonymized subject, or CABIN for environment readings.")
    mission_id: str | None = Field(default=None, pattern=ID_PATTERN)
    device_id: str | None = Field(default=None, pattern=ID_PATTERN)
    metric_code: MetricCode
    value: float | None = Field(description="null means missing; it is never replaced by zero.")
    unit: str = Field(min_length=1, max_length=20)
    measured_at: datetime
    received_at: datetime | None = None
    data_origin: DataOrigin
    source_reference: SourceReference = Field(default_factory=SourceReference)
    quality: Quality
    context: ObservationContext = Field(default_factory=ObservationContext)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("measured_at", "received_at")
    @classmethod
    def _utc(cls, v: datetime | None) -> datetime | None:
        return None if v is None else _as_utc(v)

    @field_validator("value")
    @classmethod
    def _finite(cls, v: float | None) -> float | None:
        if v is not None and not math.isfinite(v):
            raise ValueError("value must be a finite number or null")
        return v

    @model_validator(mode="after")
    def _rules(self) -> "HealthObservation":
        if self.value is None and self.quality.status not in ("MISSING", "INVALID"):
            raise ValueError("a null value must be flagged with quality.status MISSING or INVALID")
        ref = self.source_reference
        if self.data_origin == "REAL_PUBLIC" and not (ref.repository and ref.dataset_accession):
            raise ValueError("REAL_PUBLIC observations need source_reference.repository and source_reference.dataset_accession")
        if self.data_origin == "SIMULATED" and not self.device_id:
            raise ValueError("SIMULATED observations need the device_id of the simulator that produced them")
        if self.data_origin == "DERIVED" and not (isinstance(self.metadata.get("method"), str) and self.metadata["method"].strip()):
            raise ValueError("DERIVED observations need metadata.method describing how the value was computed")
        return self


class ObservationOut(HealthObservation):
    received_at: datetime  # type: ignore[assignment]
    ingested_at: datetime


class ObservationPage(BaseModel):
    count: int
    items: list[ObservationOut]
