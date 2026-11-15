"""NASA OSDR (Open Science Data Repository) connector. Public search API, no API key.

  GET https://osdr.nasa.gov/osdr/data/search?term=<q>&from=0&size=<n>&type=cgene&ffield=organism&fvalue=Homo%20sapiens

Answers an Elasticsearch style document: hits.total and hits.hits[]._source with keys such as
"Accession", "Study Title", "organism", "Project Type", "Mission" ({"Name": ...}),
"Study Public Release Date" (epoch seconds) and "Study Description".
The organism filter keeps human studies; OSDR also holds animal, plant and microbe studies,
and some human studies are cell cultures or ground analogs (see projectType and the description).
"""

import logging
import re
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.cache import TTLCache
from app.modules.nasa.donki import UpstreamError
from app.modules.nasa.schemas import OsdrStudy, OsdrStudyList

log = logging.getLogger("ahi.nasa.osdr")

STUDY_URL = "https://osdr.nasa.gov/bio/repo/data/studies/{accession}"
_ACCESSION = re.compile(r"^OSD-\d+$")


def _text(v: Any) -> str | None:
    return v.strip() if isinstance(v, str) and v.strip() else None


def _release(v: Any) -> str | None:
    if isinstance(v, (int, float)) and v > 0:
        return datetime.fromtimestamp(float(v), UTC).date().isoformat()
    if isinstance(v, str):
        try:
            return _release(float(v))
        except ValueError:
            return None
    return None


def _first_sentences(text: str | None, limit: int = 280) -> str | None:
    if not text:
        return None
    clean = re.sub(r"\s+", " ", text)
    if len(clean) <= limit:
        return clean
    cut = clean[:limit]
    stop = cut.rfind(". ")
    return cut[: stop + 1] if stop > 80 else cut.rstrip() + "..."


def to_study(source: dict) -> OsdrStudy | None:
    accession = _text(source.get("Accession"))
    title = _text(source.get("Study Title"))
    if not accession or not _ACCESSION.match(accession) or not title:
        return None
    mission = source.get("Mission")
    mission_name = _text(mission.get("Name")) if isinstance(mission, dict) else None
    return OsdrStudy(
        id=accession,
        title=title,
        link=STUDY_URL.format(accession=accession),
        organism=_text(source.get("organism")),
        projectType=_text(source.get("Project Type")),
        mission=mission_name,
        releaseDate=_release(source.get("Study Public Release Date")),
        description=_first_sentences(_text(source.get("Study Description"))),
    )


class OsdrClient:
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

    async def search_human_studies(self, q: str, size: int) -> OsdrStudyList:
        key = f"{q.lower()}:{size}"
        cached = self.cache.get(key)
        if cached is not None:
            return cached
        params = {"term": q, "from": 0, "size": size, "type": "cgene", "ffield": "organism", "fvalue": "Homo sapiens"}
        url = f"{self.base_url}/osdr/data/search"
        try:
            res = await self.http.get(url, params=params)
        except httpx.HTTPError as exc:
            raise UpstreamError(f"OSDR unreachable: {exc.__class__.__name__}") from exc
        if res.status_code != 200:
            raise UpstreamError(f"OSDR answered HTTP {res.status_code}")
        try:
            body = res.json()
            hits = body["hits"]
            raw_hits = hits["hits"]
            total_raw = hits.get("total", 0)
        except (ValueError, KeyError, TypeError) as exc:
            raise UpstreamError("OSDR search answered an unexpected document") from exc
        total = total_raw.get("value", 0) if isinstance(total_raw, dict) else int(total_raw or 0)
        studies: list[OsdrStudy] = []
        seen: set[str] = set()
        for h in raw_hits if isinstance(raw_hits, list) else []:
            study = to_study(h.get("_source", {})) if isinstance(h, dict) else None
            if study and study.id not in seen:
                seen.add(study.id)
                studies.append(study)
        result = OsdrStudyList(
            sourceUrl=f"{url}?{urlencode(params)}",
            retrievedAt=self.now().astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            query=q,
            total=total,
            studies=studies,
        )
        self.cache.set(key, result)
        log.info("fetched OSDR", extra={"query": q, "studies": len(studies), "total": total})
        return result
