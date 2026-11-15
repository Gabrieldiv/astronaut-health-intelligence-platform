"""Read side of observations, plus the row mapping shared with ingestion."""

import hashlib
import json
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.observations.models import ObservationRow
from app.modules.observations.schemas import HealthObservation, ObservationOut


def utc(dt: datetime) -> datetime:
    """SQLite drops tzinfo on read; every stored timestamp is UTC."""
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def payload_hash(obs: HealthObservation) -> str:
    """Hash of the fields that define the measurement (received_at excluded: a retry may stamp it again)."""
    data = obs.model_dump(mode="json", exclude={"received_at"})
    return hashlib.sha256(json.dumps(data, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def to_row(obs: HealthObservation, now: datetime) -> ObservationRow:
    return ObservationRow(
        observation_id=obs.observation_id,
        subject_id=obs.subject_id,
        mission_id=obs.mission_id,
        device_id=obs.device_id,
        metric_code=obs.metric_code,
        value=obs.value,
        unit=obs.unit,
        measured_at=obs.measured_at,
        received_at=obs.received_at or now,
        data_origin=obs.data_origin,
        source_reference=obs.source_reference.model_dump(),
        quality_status=obs.quality.status,
        quality_confidence=obs.quality.confidence,
        is_estimated=obs.quality.is_estimated,
        context=obs.context.model_dump(),
        extra=obs.metadata,
        payload_sha256=payload_hash(obs),
        ingested_at=now,
    )


def to_out(row: ObservationRow) -> ObservationOut:
    return ObservationOut.model_validate(
        {
            "observation_id": row.observation_id,
            "subject_id": row.subject_id,
            "mission_id": row.mission_id,
            "device_id": row.device_id,
            "metric_code": row.metric_code,
            "value": row.value,
            "unit": row.unit,
            "measured_at": utc(row.measured_at),
            "received_at": utc(row.received_at),
            "data_origin": row.data_origin,
            "source_reference": row.source_reference,
            "quality": {"status": row.quality_status, "confidence": row.quality_confidence, "is_estimated": row.is_estimated},
            "context": row.context,
            "metadata": row.extra,
            "ingested_at": utc(row.ingested_at),
        }
    )


def query_observations(
    db: Session,
    *,
    subject_id: str,
    metric_code: str | None,
    start: datetime | None,
    end: datetime | None,
    data_origin: str | None,
    limit: int,
) -> list[ObservationOut]:
    stmt = select(ObservationRow).where(ObservationRow.subject_id == subject_id)
    if metric_code:
        stmt = stmt.where(ObservationRow.metric_code == metric_code)
    if data_origin:
        stmt = stmt.where(ObservationRow.data_origin == data_origin)
    if start:
        stmt = stmt.where(ObservationRow.measured_at >= start)
    if end:
        stmt = stmt.where(ObservationRow.measured_at < end)
    stmt = stmt.order_by(ObservationRow.measured_at.asc(), ObservationRow.observation_id.asc()).limit(limit)
    return [to_out(r) for r in db.scalars(stmt)]
