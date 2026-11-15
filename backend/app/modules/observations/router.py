from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.db.deps import DbSession
from app.modules.observations.schemas import DataOrigin, MetricCode, ObservationPage
from app.modules.observations.service import query_observations

router = APIRouter(tags=["observations"])


@router.get("/observations", response_model=ObservationPage, summary="Query observations of one subject")
def list_observations(
    db: DbSession,
    subject_id: Annotated[str, Query(min_length=1, max_length=40)],
    metric_code: MetricCode | None = None,
    data_origin: DataOrigin | None = None,
    start: Annotated[datetime | None, Query(description="Inclusive, ISO 8601 with timezone")] = None,
    end: Annotated[datetime | None, Query(description="Exclusive, ISO 8601 with timezone")] = None,
    limit: Annotated[int, Query(ge=1, le=5000)] = 1000,
) -> ObservationPage:
    for name, v in (("start", start), ("end", end)):
        if v is not None and v.tzinfo is None:
            raise HTTPException(422, f"{name} must include a timezone, e.g. 2026-11-13T00:00:00Z")
    if start and end and end <= start:
        raise HTTPException(422, "end must be after start")
    items = query_observations(db, subject_id=subject_id, metric_code=metric_code, start=start, end=end, data_origin=data_origin, limit=limit)
    return ObservationPage(count=len(items), items=items)
