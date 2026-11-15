from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.db.deps import DbSession
from app.modules.ingestion.schemas import IngestBatch, IngestResult
from app.modules.ingestion.service import ingest

router = APIRouter(tags=["ingestion"])


@router.post(
    "/observations",
    response_model=IngestResult,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest canonical HealthObservations (idempotent by observation_id)",
    description=(
        "Every observation must carry data_origin and the provenance that origin requires: "
        "REAL_PUBLIC needs source_reference.repository and dataset_accession, SIMULATED needs device_id, "
        "DERIVED needs metadata.method. Resending an identical observation_id is counted as a duplicate; "
        "reusing an id with different content is rejected."
    ),
)
def post_observations(batch: IngestBatch, db: DbSession) -> IngestResult:
    try:
        return ingest(db, batch)
    except IntegrityError as exc:
        # Two concurrent batches stored the same observation_id first; a retry resolves it as a duplicate.
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "concurrent write of the same observation_id, retry the batch") from exc
