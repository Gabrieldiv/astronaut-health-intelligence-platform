"""AHI API: modular monolith. Each module under app/modules owns its router, schemas and tables."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.cache import TTLCache
from app.core.config import APP_VERSION, Settings, get_settings
from app.core.logging import RequestLogMiddleware, configure_logging
from app.db.migrate import upgrade_head
from app.db.session import Database
from app.modules.health.router import router as health_router
from app.modules.ingestion.router import router as ingestion_router
from app.modules.nasa.donki import DonkiClient
from app.modules.nasa.osdr import OsdrClient
from app.modules.nasa.router import router as nasa_router
from app.modules.observations.router import router as observations_router
from app.modules.registry.router import router as registry_router

API_PREFIX = "/api/v1"
USER_AGENT = f"AHI-hackathon-prototype/{APP_VERSION} (decision support research demo)"


def create_app(settings: Settings | None = None, *, migrate: bool | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    db = Database(settings.database_url)
    run_migrations = settings.auto_migrate if migrate is None else migrate

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if run_migrations:
            upgrade_head(settings.database_url)
        async with httpx.AsyncClient(
            timeout=settings.http_timeout_seconds, headers={"User-Agent": USER_AGENT}, follow_redirects=True
        ) as http:
            app.state.donki = DonkiClient(http, settings.donki_base_url, TTLCache(settings.nasa_cache_ttl_seconds))
            app.state.osdr = OsdrClient(http, settings.osdr_base_url, TTLCache(settings.nasa_cache_ttl_seconds))
            logging.getLogger("ahi").info("api started", extra={"database": db.engine.dialect.name, "version": APP_VERSION})
            yield
        db.engine.dispose()

    app = FastAPI(
        title="AHI API",
        version=APP_VERSION,
        summary="Astronaut Health Intelligence: decision support prototype, not a medical device.",
        lifespan=lifespan,
    )
    app.state.db = db
    app.state.settings = settings
    app.add_middleware(RequestLogMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
    for r in (health_router, registry_router, ingestion_router, observations_router, nasa_router):
        app.include_router(r, prefix=API_PREFIX)
    return app
