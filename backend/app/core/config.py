"""Runtime configuration, read from environment variables (or a local .env file)."""

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
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

    # Assistant (demo only): cloud LLM that explains the engine outputs. Without a key the endpoint
    # answers 503 "assistant not configured" and the web app shows its offline state.
    anthropic_api_key: SecretStr | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    assistant_model: str = Field(default="claude-sonnet-5-5", alias="ASSISTANT_MODEL")
    assistant_max_tokens: int = Field(default=1500, ge=256, le=8000, alias="ASSISTANT_MAX_TOKENS")
    assistant_effort: Literal["low", "medium", "high"] = Field(default="low", alias="ASSISTANT_EFFORT")
    # Server side refusal fallback (Anthropic beta). Set false if the account or model rejects it.
    assistant_refusal_fallback: bool = Field(default=True, alias="ASSISTANT_REFUSAL_FALLBACK")
    assistant_timeout_seconds: float = Field(default=60.0, alias="ASSISTANT_TIMEOUT_SECONDS")
    assistant_rate_limit_per_minute: int = Field(default=6, ge=1, alias="ASSISTANT_RATE_LIMIT_PER_MINUTE")
    assistant_rate_limit_per_hour: int = Field(default=60, ge=1, alias="ASSISTANT_RATE_LIMIT_PER_HOUR")

    @property
    def assistant_configured(self) -> bool:
        return bool(self.anthropic_api_key and self.anthropic_api_key.get_secret_value().strip())

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
