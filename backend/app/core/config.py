"""Runtime configuration, read from environment variables (or a local .env file)."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_VERSION = "0.1.0"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # SQLite is the zero setup fallback. Docker Compose sets a PostgreSQL URL.
    database_url: str = Field(default="sqlite:///./ahi.db", alias="DATABASE_URL")
    # Apply Alembic migrations when the API starts (convenient for demos and Compose).
    auto_migrate: bool = Field(default=True, alias="AUTO_MIGRATE")

    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5183,http://127.0.0.1:5183",
        alias="CORS_ORIGINS",
    )
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    # NASA DONKI web service (CCMC, NASA Goddard). No API key. The CCMC moved DONKI from
    # kauai.ccmc.gsfc.nasa.gov to ccmc.gsfc.nasa.gov; the paths after /DONKI/ are unchanged.
    donki_base_url: str = Field(default="https://ccmc.gsfc.nasa.gov/DONKI/WS/get", alias="DONKI_BASE_URL")
    # NASA OSDR public search API. No API key.
    osdr_base_url: str = Field(default="https://osdr.nasa.gov", alias="OSDR_BASE_URL")

    http_timeout_seconds: float = Field(default=20.0, alias="HTTP_TIMEOUT_SECONDS")
    # Short cache so a demo never hammers the public sources.
    nasa_cache_ttl_seconds: int = Field(default=900, alias="NASA_CACHE_TTL_SECONDS")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
