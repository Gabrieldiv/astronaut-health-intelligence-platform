import pytest
from fastapi.testclient import TestClient

from tests.conftest import observation


def post(client: TestClient, *obs: dict):  # type: ignore[no-untyped-def]
    return client.post("/api/v1/observations", json={"observations": list(obs)})


def test_ingest_and_query(client: TestClient) -> None:
    res = post(
        client,
        observation(observation_id="o1", measured_at="2026-11-13T14:30:00Z", value=70),
        observation(observation_id="o2", measured_at="2026-11-13T15:30:00+01:00", value=74),  # same instant as o1
        observation(observation_id="o3", measured_at="2026-11-13T16:30:00Z", value=78),
        observation(observation_id="o4", metric_code="SPO2", unit="%", value=98),
    )
    assert res.status_code == 202, res.text
    body = res.json()
    assert body["status"] == "ACCEPTED"
    assert (body["accepted_count"], body["duplicate_count"], body["rejected_count"]) == (4, 0, 0)

    q = client.get("/api/v1/observations", params={"subject_id": "ASTRONAUT-001", "metric_code": "HEART_RATE"})
    assert q.status_code == 200
    items = q.json()["items"]
    assert [i["observation_id"] for i in items] == ["o1", "o2", "o3"]
    assert items[1]["measured_at"] == "2026-11-13T14:30:00Z"
    assert items[0]["data_origin"] == "SIMULATED"
    assert items[0]["received_at"].endswith("Z")

    window = client.get(
        "/api/v1/observations",
        params={"subject_id": "ASTRONAUT-001", "metric_code": "HEART_RATE", "start": "2026-11-13T15:00:00Z", "end": "2026-11-13T17:00:00Z"},
    )
    assert [i["observation_id"] for i in window.json()["items"]] == ["o3"]
    assert client.get("/api/v1/observations", params={"subject_id": "ASTRONAUT-001", "start": "2026-11-13T15:00:00"}).status_code == 422
    assert client.get("/api/v1/observations", params={"subject_id": "OTHER"}).json()["count"] == 0


def test_ingest_is_idempotent_by_observation_id(client: TestClient) -> None:
    assert post(client, observation()).json()["accepted_count"] == 1
    again = post(client, observation(received_at="2026-11-13T14:31:00Z")).json()
    assert (again["accepted_count"], again["duplicate_count"], again["rejected_count"]) == (0, 1, 0)
    changed = post(client, observation(value=99)).json()
    assert changed["rejected_count"] == 1
    assert changed["rejected"][0]["reason"].startswith("observation_id already used")
    # Duplicates inside one batch are also detected.
    inner = post(client, observation(observation_id="z1"), observation(observation_id="z1")).json()
    assert (inner["accepted_count"], inner["duplicate_count"]) == (1, 1)
    assert client.get("/api/v1/observations", params={"subject_id": "ASTRONAUT-001"}).json()["count"] == 2


@pytest.mark.parametrize(
    ("patch", "fragment"),
    [
        ({"data_origin": None}, "data_origin"),
        ({"data_origin": "MADE_UP"}, "data_origin"),
        ({"data_origin": "REAL_PUBLIC"}, "REAL_PUBLIC observations need"),
        ({"device_id": None}, "SIMULATED observations need"),
        ({"data_origin": "DERIVED"}, "DERIVED observations need"),
        ({"value": None}, "null value must be flagged"),
        ({"measured_at": "2026-11-13T14:30:00"}, "timezone"),
        ({"metric_code": "MOOD_RING"}, "metric_code"),
        ({"quality": None}, "quality"),
        ({"patient_name": "x"}, "patient_name"),
    ],
)
def test_ingest_rejects_missing_provenance_and_bad_payloads(client: TestClient, patch: dict, fragment: str) -> None:
    obs = observation(**patch)
    if patch.get("data_origin") is None and "data_origin" in patch:
        obs.pop("data_origin")
    if "quality" in patch and patch["quality"] is None:
        obs.pop("quality")
    res = post(client, obs)
    assert res.status_code == 422
    assert fragment in res.text
    assert client.get("/api/v1/observations", params={"subject_id": "ASTRONAUT-001"}).json()["count"] == 0


def test_provenance_rules_accept_complete_records(client: TestClient) -> None:
    res = post(
        client,
        observation(
            observation_id="pub-1",
            subject_id="C001",
            device_id=None,
            metric_code="WBC",
            unit="10^3/uL",
            value=5.1,
            data_origin="REAL_PUBLIC",
            source_reference={"repository": "NASA OSDR", "dataset_accession": "OSD-569", "file_name": "LSDS-8_CBC.csv", "record_reference": "C001 L-92"},
        ),
        observation(observation_id="der-1", data_origin="DERIVED", device_id=None, metadata={"method": "rolling median, 7 days"}),
        observation(observation_id="man-1", data_origin="MANUAL", device_id=None, metric_code="MOOD", unit="score", value=4),
        observation(observation_id="miss-1", value=None, quality={"status": "MISSING", "confidence": 0, "is_estimated": False}),
    )
    assert res.status_code == 202, res.text
    assert res.json()["accepted_count"] == 4
    missing = client.get("/api/v1/observations", params={"subject_id": "ASTRONAUT-001", "data_origin": "SIMULATED"}).json()["items"]
    assert missing[0]["value"] is None  # never turned into zero


def test_empty_batch_rejected(client: TestClient) -> None:
    assert client.post("/api/v1/observations", json={"observations": []}).status_code == 422
