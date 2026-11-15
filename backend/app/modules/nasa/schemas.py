"""Public NASA context data. Mirrors frontend/web/src/types/nasa.ts exactly (field names included)."""

from typing import Literal

from pydantic import BaseModel, Field

SpaceWeatherEventKind = Literal["SOLAR_FLARE", "SEP", "CME", "GEOMAGNETIC_STORM"]


class SpaceWeatherEvent(BaseModel):
    id: str = Field(description='DONKI activity id, e.g. "2026-11-10T04:12:00-FLR-001".')
    kind: SpaceWeatherEventKind
    startTime: str = Field(description="ISO 8601 UTC.")
    peakTime: str | None = None
    classType: str | None = Field(default=None, description='Flare class such as "X1.2" (flares only).')
    kpIndex: float | None = Field(default=None, description="Highest Kp index reported (geomagnetic storms only).")
    link: str = Field(description="DONKI web page of the event.")


class TimeWindow(BaseModel):
    start: str
    end: str


class SpaceWeatherSnapshot(BaseModel):
    data_origin: Literal["REAL_PUBLIC"] = "REAL_PUBLIC"
    source: Literal["NASA DONKI (CCMC)"] = "NASA DONKI (CCMC)"
    sourceUrl: str
    retrievedAt: str = Field(description="ISO 8601 UTC time the data was fetched from DONKI.")
    window: TimeWindow
    events: list[SpaceWeatherEvent]
    mode: Literal["live", "snapshot"]


class OsdrStudy(BaseModel):
    id: str = Field(description='OSDR accession, e.g. "OSD-569".')
    title: str
    link: str = Field(description="Study page in the OSDR repository.")
    organism: str | None = None
    projectType: str | None = Field(default=None, description='As reported by OSDR, e.g. "Spaceflight Study".')
    mission: str | None = None
    releaseDate: str | None = Field(default=None, description="Public release date (YYYY-MM-DD) when OSDR states it.")
    description: str | None = Field(default=None, description="First sentences of the OSDR study description.")


class OsdrStudyList(BaseModel):
    data_origin: Literal["REAL_PUBLIC"] = "REAL_PUBLIC"
    source: Literal["NASA OSDR"] = "NASA OSDR"
    sourceUrl: str = Field(description="The exact search request sent to the OSDR public API.")
    retrievedAt: str
    query: str
    total: int = Field(description="Matching human studies reported by OSDR (only the first ones are returned).")
    studies: list[OsdrStudy]
