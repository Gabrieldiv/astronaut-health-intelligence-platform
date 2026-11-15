"""NASA DONKI connector (Space Weather Database Of Notifications, Knowledge, Information).

Web service of the Community Coordinated Modeling Center (CCMC), NASA Goddard. No API key.
  GET {base}/FLR?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd   solar flares   (flrID, beginTime, peakTime, classType, link)
  GET {base}/SEP?startDate=...&endDate=...                 solar energetic particles (sepID, eventTime, link)
  GET {base}/CME?startDate=...&endDate=...                 coronal mass ejections   (activityID, startTime, link)
  GET {base}/GST?startDate=...&endDate=...                 geomagnetic storms (gstID, startTime, allKpIndex[].kpIndex, link)
Default base: https://ccmc.gsfc.nasa.gov/DONKI/WS/get (the former kauai.ccmc.gsfc.nasa.gov host was retired by CCMC).
Times come as "2026-10-16T15:38Z" and are normalized to "2026-10-16T15:38:00Z".

All four feeds must answer: a partial result would show "no storms" when the truth is "unknown",
so any upstream failure raises and the caller falls back to the bundled snapshot.
"""

import asyncio
import logging
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from typing import Any

import httpx

from app.core.cache import TTLCache
from app.modules.nasa.schemas import SpaceWeatherEvent, SpaceWeatherEventKind, SpaceWeatherSnapshot, TimeWindow

log = logging.getLogger("ahi.nasa.donki")

DONKI_PORTAL_URL = "https://ccmc.gsfc.nasa.gov/DONKI/"
FEEDS: tuple[str, ...] = ("FLR", "SEP", "CME", "GST")


class UpstreamError(Exception):
    """A public source did not answer as documented."""


def normalize_time(value: Any) -> str | None:
    if not isinstance(value, str) or not value.strip():
        return None
    raw = value.strip()
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _max_kp(items: Any) -> float | None:
    if not isinstance(items, list):
        return None
    values = [i.get("kpIndex") for i in items if isinstance(i, dict)]
    nums = [float(v) for v in values if isinstance(v, (int, float))]
    return max(nums) if nums else None


def _event(kind: SpaceWeatherEventKind, raw: dict, id_key: str, start_key: str) -> SpaceWeatherEvent | None:
    event_id = raw.get(id_key)
    start = normalize_time(raw.get(start_key))
    link = raw.get("link")
    if not isinstance(event_id, str) or not start or not isinstance(link, str):
        log.warning("skipping malformed DONKI record", extra={"kind": kind, "record_id": event_id})
        return None
    return SpaceWeatherEvent(
        id=event_id,
        kind=kind,
        startTime=start,
        peakTime=normalize_time(raw.get("peakTime")) if kind == "SOLAR_FLARE" else None,
        classType=raw.get("classType") if kind == "SOLAR_FLARE" and isinstance(raw.get("classType"), str) else None,
        kpIndex=_max_kp(raw.get("allKpIndex")) if kind == "GEOMAGNETIC_STORM" else None,
        link=link,
    )


def normalize(feed: str, records: list[dict]) -> list[SpaceWeatherEvent]:
    spec: dict[str, tuple[SpaceWeatherEventKind, str, str]] = {
        "FLR": ("SOLAR_FLARE", "flrID", "beginTime"),
        "SEP": ("SEP", "sepID", "eventTime"),
        "CME": ("CME", "activityID", "startTime"),
        "GST": ("GEOMAGNETIC_STORM", "gstID", "startTime"),
    }
    kind, id_key, start_key = spec[feed]
    out = []
    for r in records:
        if isinstance(r, dict) and (e := _event(kind, r, id_key, start_key)) is not None:
            out.append(e)
    return out


class DonkiClient:
    def __init__(
        self,
        http: httpx.AsyncClient,
        base_url: str,
        cache: TTLCache,
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self.http = http
        self.base_url = base_url.rstrip("/")
        self.cache = cache
        self.now = now

    async def _feed(self, feed: str, start: date, end: date) -> list[dict]:
        url = f"{self.base_url}/{feed}"
        params = {"startDate": start.isoformat(), "endDate": end.isoformat()}
        try:
            res = await self.http.get(url, params=params)
        except httpx.HTTPError as exc:
            raise UpstreamError(f"DONKI {feed} unreachable: {exc.__class__.__name__}") from exc
        if res.status_code != 200:
            raise UpstreamError(f"DONKI {feed} answered HTTP {res.status_code}")
        # DONKI answers an empty body (or "[]") when there is no event in the window.
        if not res.content.strip():
            return []
        try:
            data = res.json()
        except ValueError as exc:
            raise UpstreamError(f"DONKI {feed} returned non JSON content") from exc
        if not isinstance(data, list):
            raise UpstreamError(f"DONKI {feed} returned {type(data).__name__}, expected a list")
        return data

    async def snapshot(self, days: int, mode: str = "live") -> SpaceWeatherSnapshot:
        now = self.now()
        end = now.date()
        start = end - timedelta(days=days)
        key = f"{start}:{end}"
        cached = self.cache.get(key)
        if cached is not None:
            return cached.model_copy(update={"mode": mode})

        results = await asyncio.gather(*(self._feed(f, start, end) for f in FEEDS))
        events: dict[str, SpaceWeatherEvent] = {}
        for feed, records in zip(FEEDS, results, strict=True):
            for e in normalize(feed, records):
                events[e.id] = e
        ordered = sorted(events.values(), key=lambda e: (e.startTime, e.id), reverse=True)
        snap = SpaceWeatherSnapshot(
            sourceUrl=DONKI_PORTAL_URL,
            retrievedAt=now.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            window=TimeWindow(start=f"{start.isoformat()}T00:00:00Z", end=now.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")),
            events=ordered,
            mode=mode,  # type: ignore[arg-type]
        )
        self.cache.set(key, snap)
        log.info("fetched DONKI", extra={"start": str(start), "end": str(end), "events": len(ordered)})
        return snap
