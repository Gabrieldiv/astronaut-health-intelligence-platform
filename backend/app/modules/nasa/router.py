from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request

from app.modules.nasa.donki import DonkiClient, UpstreamError
from app.modules.nasa.osdr import OsdrClient
from app.modules.nasa.schemas import OsdrStudyList, SpaceWeatherSnapshot

router = APIRouter(tags=["nasa"])

UPSTREAM = {502: {"description": "The NASA source could not be reached or answered unexpectedly. No data is invented."}}


@router.get(
    "/space-weather",
    response_model=SpaceWeatherSnapshot,
    responses=UPSTREAM,  # type: ignore[arg-type]
    summary="Recent space weather from NASA DONKI (REAL_PUBLIC context, not crew measurements)",
)
async def space_weather(request: Request, days: Annotated[int, Query(ge=1, le=90)] = 30) -> SpaceWeatherSnapshot:
    client: DonkiClient = request.app.state.donki
    try:
        return await client.snapshot(days)
    except UpstreamError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get(
    "/nasa/osdr/studies",
    response_model=OsdrStudyList,
    responses=UPSTREAM,  # type: ignore[arg-type]
    summary="Human studies in NASA OSDR matching a search term (REAL_PUBLIC context)",
)
async def osdr_studies(
    request: Request,
    q: Annotated[str, Query(min_length=2, max_length=80)] = "astronaut",
    size: Annotated[int, Query(ge=1, le=25)] = 10,
) -> OsdrStudyList:
    client: OsdrClient = request.app.state.osdr
    try:
        return await client.search_human_studies(q.strip(), size)
    except UpstreamError as exc:
        raise HTTPException(502, str(exc)) from exc
