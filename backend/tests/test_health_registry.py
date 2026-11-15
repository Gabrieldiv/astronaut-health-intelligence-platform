from fastapi.testclient import TestClient


def test_health_reports_database(client: TestClient) -> None:
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["service"] == "ahi-api"
    assert body["database"] == "ok"
    assert body["database_backend"] == "sqlite"
    assert client.get("/api/v1/health/live").json() == {"status": "ok"}
    assert client.get("/api/v1/health/ready").json() == {"status": "ready"}


def test_cors_allows_the_web_app(client: TestClient) -> None:
    res = client.options(
        "/api/v1/health",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert res.headers["access-control-allow-origin"] == "http://localhost:5173"
    other = client.get("/api/v1/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in other.headers


def test_request_id_header(client: TestClient) -> None:
    res = client.get("/api/v1/health/live", headers={"x-request-id": "abc123"})
    assert res.headers["x-request-id"] == "abc123"


def test_registry_round_trip(client: TestClient) -> None:
    a = client.post("/api/v1/astronauts", json={"id": "ASTRONAUT-001", "pseudonym": "Commander A", "role": "Commander"})
    assert a.status_code == 201, a.text
    assert a.json()["created_at"].endswith(("Z", "+00:00"))
    m = client.post("/api/v1/missions", json={"id": "MISSION-001", "name": "Gateway demo", "destination": "MOON", "phase": "IN_FLIGHT"})
    assert m.status_code == 201, m.text
    d = client.post(
        "/api/v1/devices",
        json={"id": "SIM-ASTROSKIN-001", "kind": "BIO_MONITOR", "name": "Bio-Monitor shirt (sim)", "assigned_to": "ASTRONAUT-001", "mission_id": "MISSION-001", "data_origin": "SIMULATED"},
    )
    assert d.status_code == 201, d.text
    assert [x["id"] for x in client.get("/api/v1/astronauts").json()] == ["ASTRONAUT-001"]
    assert client.get("/api/v1/astronauts/ASTRONAUT-001").json()["pseudonym"] == "Commander A"
    assert client.get("/api/v1/astronauts/NOPE").status_code == 404
    assert len(client.get("/api/v1/devices", params={"assigned_to": "ASTRONAUT-001"}).json()) == 1
    assert len(client.get("/api/v1/missions").json()) == 1


def test_registry_rejects_duplicates_names_and_unknown_refs(client: TestClient) -> None:
    body = {"id": "ASTRONAUT-002", "pseudonym": "Flight Engineer B"}
    assert client.post("/api/v1/astronauts", json=body).status_code == 201
    assert client.post("/api/v1/astronauts", json=body).status_code == 409
    # Pseudonymization: a real name field is not part of the contract and is refused.
    assert client.post("/api/v1/astronauts", json={**body, "id": "ASTRONAUT-003", "full_name": "Jane Doe"}).status_code == 422
    dev = {"id": "SIM-X", "kind": "DOSIMETER", "name": "Dosimeter (sim)", "assigned_to": "GHOST", "data_origin": "SIMULATED"}
    assert client.post("/api/v1/devices", json=dev).status_code == 422
