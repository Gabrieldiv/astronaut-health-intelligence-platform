"""Service health. The web app calls /health to choose between "Connected to AHI API" and offline demo mode."""

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel
from sqlalchemy import text

from app.core.config import APP_VERSION

router = APIRouter(tags=["health"])


class HealthStatus(BaseModel):
    status: Literal["ok", "degraded"]
    service: Literal["ahi-api"] = "ahi-api"
    version: str
    database: Literal["ok", "error"]
    database_backend: str
    time: str


def _db_ok(request: Request) -> bool:
    try:
        with request.app.state.db.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@router.get("/health", response_model=HealthStatus, summary="API and database status")
def health(request: Request) -> HealthStatus:
    ok = _db_ok(request)
    return HealthStatus(
        status="ok" if ok else "degraded",
        version=APP_VERSION,
        database="ok" if ok else "error",
        database_backend=request.app.state.db.engine.dialect.name,
        time=datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


@router.get("/health/live", summary="Liveness probe")
def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready", summary="Readiness probe (database reachable)")
def ready(request: Request, response: Response) -> dict[str, str]:
    if not _db_ok(request):
        response.status_code = 503
        return {"status": "not_ready"}
    return {"status": "ready"}
