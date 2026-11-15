"""The Alembic revision and the ORM models describe the same schema; the OpenAPI export works."""

import json
from pathlib import Path

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine

import app.modules.observations.models  # noqa: F401
import app.modules.registry.models  # noqa: F401
from app.cli import main as cli_main
from app.db.migrate import upgrade_head
from app.db.session import Base


def test_migration_matches_models(tmp_path: Path) -> None:
    url = f"sqlite:///{(tmp_path / 'm.db').as_posix()}"
    upgrade_head(url)
    engine = create_engine(url)
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    engine.dispose()
    assert diff == []


def test_openapi_export(tmp_path: Path) -> None:
    out = tmp_path / "openapi.json"
    assert cli_main(["openapi", "--out", str(out)]) == 0
    schema = json.loads(out.read_text(encoding="utf-8"))
    paths = schema["paths"]
    for p in ("/api/v1/health", "/api/v1/observations", "/api/v1/space-weather", "/api/v1/nasa/osdr/studies", "/api/v1/astronauts"):
        assert p in paths
    snap = schema["components"]["schemas"]["SpaceWeatherSnapshot"]
    assert set(snap["required"]) >= {"sourceUrl", "retrievedAt", "window", "events", "mode"}
