from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

DONKI = "https://donki.test/WS/get"
OSDR = "https://osdr.test"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(  # type: ignore[call-arg]
        DATABASE_URL=f"sqlite:///{(tmp_path / 'ahi.db').as_posix()}",
        DONKI_BASE_URL=DONKI,
        OSDR_BASE_URL=OSDR,
        NASA_CACHE_TTL_SECONDS=600,
        LOG_LEVEL="WARNING",
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    # Migrations run in the lifespan, so every test exercises the Alembic revision too.
    with TestClient(create_app(settings, migrate=True)) as c:
        yield c


def observation(**overrides: object) -> dict:
    base: dict = {
        "observation_id": "obs-0001",
        "subject_id": "ASTRONAUT-001",
        "mission_id": "MISSION-001",
        "device_id": "SIM-ASTROSKIN-001",
        "metric_code": "HEART_RATE",
        "value": 72.4,
        "unit": "bpm",
        "measured_at": "2026-11-13T14:30:00Z",
        "data_origin": "SIMULATED",
        "quality": {"status": "VALID", "confidence": 1.0, "is_estimated": False},
        "context": {"mission_phase": "IN_FLIGHT", "activity": "REST"},
    }
    base.update(overrides)
    return base
