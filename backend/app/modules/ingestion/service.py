"""Idempotent ingestion of canonical observations."""

import logging
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.ingestion.schemas import IngestBatch, IngestResult, Rejection
from app.modules.observations.models import ObservationRow
from app.modules.observations.service import payload_hash, to_row

log = logging.getLogger("ahi.ingestion")


def ingest(db: Session, batch: IngestBatch) -> IngestResult:
    now = datetime.now(UTC)
    batch_id = str(uuid.uuid4())
    ids = [o.observation_id for o in batch.observations]
    existing = {
        oid: sha
        for oid, sha in db.execute(
            select(ObservationRow.observation_id, ObservationRow.payload_sha256).where(ObservationRow.observation_id.in_(set(ids)))
        )
    }
    accepted = duplicates = 0
    rejected: list[Rejection] = []
    seen: dict[str, str] = {}
    for obs in batch.observations:
        sha = payload_hash(obs)
        prior = existing.get(obs.observation_id) or seen.get(obs.observation_id)
        if prior is not None:
            if prior == sha:
                duplicates += 1
            else:
                rejected.append(Rejection(observation_id=obs.observation_id, reason="observation_id already used with different content"))
            continue
        db.add(to_row(obs, now))
        seen[obs.observation_id] = sha
        accepted += 1
    db.commit()
    log.info(
        "ingested batch",
        extra={"batch_id": batch_id, "accepted": accepted, "duplicates": duplicates, "rejected": len(rejected)},
    )
    return IngestResult(
        status="ACCEPTED",
        batch_id=batch_id,
        accepted_count=accepted,
        duplicate_count=duplicates,
        rejected_count=len(rejected),
        rejected=rejected,
    )
