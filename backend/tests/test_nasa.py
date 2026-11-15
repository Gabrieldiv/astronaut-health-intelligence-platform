"""NASA connectors. External HTTP is always mocked (respx); fixtures are trimmed copies of real responses."""

import json
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from app.core.cache import TTLCache
from app.modules.nasa.donki import DonkiClient, UpstreamError, normalize, normalize_time
from tests.conftest import DONKI, OSDR

FIXTURES = Path(__file__).parent / "fixtures"
DONKI_SAMPLE: dict[str, list] = json.loads((FIXTURES / "donki_sample.json").read_text(encoding="utf-8"))
OSDR_SAMPLE: dict = json.loads((FIXTURES / "osdr_search_sample.json").read_text(encoding="utf-8"))


def mock_donki(router: respx.MockRouter, overrides: dict[str, httpx.Response] | None = None) -> dict[str, respx.Route]:
    routes = {}
    for feed in ("FLR", "SEP", "CME", "GST"):
        resp = (overrides or {}).get(feed) or httpx.Response(200, json=DONKI_SAMPLE[feed])
        routes[feed] = router.get(f"{DONKI}/{feed}").mock(return_value=resp)
    return routes


def test_normalize_time() -> None:
    assert normalize_time("2026-10-16T15:38Z") == "2026-10-16T15:38:00Z"
    assert normalize_time("2026-10-16T15:38:12+02:00") == "2026-10-16T13:38:12Z"
    assert normalize_time("") is None
    assert normalize_time(None) is None
    assert normalize_time("not a date") is None


def test_normalize_maps_each_feed() -> None:
    flr = normalize("FLR", DONKI_SAMPLE["FLR"])[0]
    raw = DONKI_SAMPLE["FLR"][0]
    assert flr.id == raw["flrID"] and flr.kind == "SOLAR_FLARE"
    assert flr.classType == raw["classType"] and flr.peakTime is not None and flr.kpIndex is None
    assert flr.link == raw["link"]
    gst = normalize("GST", DONKI_SAMPLE["GST"])[0]
    assert gst.kind == "GEOMAGNETIC_STORM"
    assert gst.kpIndex == max(k["kpIndex"] for k in DONKI_SAMPLE["GST"][0]["allKpIndex"])
    assert gst.classType is None and gst.peakTime is None
    sep = normalize("SEP", DONKI_SAMPLE["SEP"])[0]
    assert sep.kind == "SEP" and sep.id == DONKI_SAMPLE["SEP"][0]["sepID"]
    cme = normalize("CME", DONKI_SAMPLE["CME"])[0]
    assert cme.kind == "CME" and cme.id == DONKI_SAMPLE["CME"][0]["activityID"]
    # Malformed records are skipped, never patched up.
    assert normalize("FLR", [{"flrID": "x"}, "junk"]) == []  # type: ignore[list-item]


@respx.mock
def test_space_weather_endpoint_matches_contract(client: TestClient) -> None:
    routes = mock_donki(respx.mock)
    res = client.get("/api/v1/space-weather", params={"days": 30})
    assert res.status_code == 200, res.text
    body = res.json()
    assert set(body) == {"data_origin", "source", "sourceUrl", "retrievedAt", "window", "events", "mode"}
    assert body["data_origin"] == "REAL_PUBLIC"
    assert body["source"] == "NASA DONKI (CCMC)"
    assert body["mode"] == "live"
    assert set(body["window"]) == {"start", "end"}
    assert len(body["events"]) == sum(len(v) for v in DONKI_SAMPLE.values())
    starts = [e["startTime"] for e in body["events"]]
    assert starts == sorted(starts, reverse=True)
    for e in body["events"]:
        assert set(e) == {"id", "kind", "startTime", "peakTime", "classType", "kpIndex", "link"}
    params = routes["FLR"].calls.last.request.url.params
    assert set(params) == {"startDate", "endDate"}
    assert len(params["startDate"]) == 10


@respx.mock
def test_space_weather_is_cached(client: TestClient) -> None:
    routes = mock_donki(respx.mock)
    assert client.get("/api/v1/space-weather").status_code == 200
    assert client.get("/api/v1/space-weather").status_code == 200
    assert routes["CME"].call_count == 1


@respx.mock
def test_space_weather_empty_body_means_no_events(client: TestClient) -> None:
    mock_donki(respx.mock, {"SEP": httpx.Response(200, content=b"")})
    body = client.get("/api/v1/space-weather").json()
    assert not any(e["kind"] == "SEP" for e in body["events"])


@pytest.mark.parametrize(
    "failure",
    [httpx.Response(503, text="down"), httpx.Response(200, text="<html>maintenance</html>"), httpx.Response(200, json={"error": "x"}), httpx.ConnectTimeout("t")],
)
@respx.mock
def test_space_weather_upstream_failure_is_502_never_partial(client: TestClient, failure: object) -> None:
    for feed in ("FLR", "SEP", "CME"):
        respx.get(f"{DONKI}/{feed}").mock(return_value=httpx.Response(200, json=DONKI_SAMPLE[feed]))
    route = respx.get(f"{DONKI}/GST")
    if isinstance(failure, Exception):
        route.mock(side_effect=failure)
    else:
        route.mock(return_value=failure)
    res = client.get("/api/v1/space-weather")
    assert res.status_code == 502
    assert "DONKI GST" in res.json()["detail"]


def test_space_weather_days_bounds(client: TestClient) -> None:
    assert client.get("/api/v1/space-weather", params={"days": 0}).status_code == 422
    assert client.get("/api/v1/space-weather", params={"days": 91}).status_code == 422


def test_donki_client_window_and_snapshot_mode() -> None:
    import asyncio

    fixed = datetime(2026, 11, 15, 3, 4, 5, tzinfo=UTC)

    async def run() -> dict:
        with respx.mock() as router:
            mock_donki(router)
            async with httpx.AsyncClient() as http:
                c = DonkiClient(http, DONKI, TTLCache(60), now=lambda: fixed)
                snap = await c.snapshot(30, mode="snapshot")
                return snap.model_dump()

    snap = asyncio.run(run())
    assert snap["mode"] == "snapshot"
    assert snap["retrievedAt"] == "2026-11-15T03:04:05Z"
    assert snap["window"] == {"start": "2026-10-16T00:00:00Z", "end": "2026-11-15T03:04:05Z"}


def test_donki_upstream_error_type() -> None:
    import asyncio

    async def run() -> None:
        with respx.mock() as router:
            mock_donki(router, {"FLR": httpx.Response(500)})
            async with httpx.AsyncClient() as http:
                await DonkiClient(http, DONKI, TTLCache(60)).snapshot(7)

    with pytest.raises(UpstreamError):
        asyncio.run(run())


@respx.mock
def test_osdr_studies(client: TestClient) -> None:
    route = respx.get(f"{OSDR}/osdr/data/search").mock(return_value=httpx.Response(200, json=OSDR_SAMPLE))
    res = client.get("/api/v1/nasa/osdr/studies", params={"q": "astronaut", "size": 3})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["data_origin"] == "REAL_PUBLIC"
    assert body["source"] == "NASA OSDR"
    assert body["query"] == "astronaut"
    first = OSDR_SAMPLE["hits"]["hits"][0]["_source"]
    s = body["studies"][0]
    assert s["id"] == first["Accession"]
    assert s["title"] == first["Study Title"]
    assert s["link"] == f"https://osdr.nasa.gov/bio/repo/data/studies/{first['Accession']}"
    assert s["organism"] == "Homo sapiens"
    assert s["releaseDate"] and len(s["releaseDate"]) == 10
    params = route.calls.last.request.url.params
    assert params["term"] == "astronaut" and params["fvalue"] == "Homo sapiens" and params["size"] == "3"
    assert body["sourceUrl"].startswith(f"{OSDR}/osdr/data/search?")


@respx.mock
def test_osdr_failure_is_502(client: TestClient) -> None:
    respx.get(f"{OSDR}/osdr/data/search").mock(return_value=httpx.Response(200, json={"unexpected": True}))
    res = client.get("/api/v1/nasa/osdr/studies")
    assert res.status_code == 502
    assert client.get("/api/v1/nasa/osdr/studies", params={"q": "a"}).status_code == 422
