# AHI API (backend)

FastAPI modular monolith for AHI (Astronaut Health Intelligence). Decision support prototype, not a
medical device. The web app (`frontend/web`) works without this API (offline demo mode); when the
API runs, the app shows "Connected to AHI API" and loads NASA data live.

## Run

Local, SQLite fallback (Python 3.12 or newer):

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:create_app --factory --reload --port 8000
# open http://localhost:8000/docs
```

With Docker Compose (PostgreSQL 17 + API), from the repository root:

```bash
docker compose up --build
```

Migrations run on start (`AUTO_MIGRATE=true`). To run them by hand: `alembic upgrade head`
(reads `DATABASE_URL`). Configuration: see `.env.example` (copy to `.env`, never commit it).

Tests (external HTTP is mocked with respx, the live NASA sources are never called):

```bash
python -m pytest
```

## Modules (`app/modules`)

| Module | Endpoints (prefix `/api/v1`) | Notes |
| --- | --- | --- |
| `health` | `GET /health`, `/health/live`, `/health/ready` | `/health` is what the web app probes. |
| `registry` | `POST/GET /astronauts`, `GET /astronauts/{id}`, `POST/GET /missions`, `POST/GET /devices` | Pseudonymized: unknown fields such as a real name are rejected. |
| `ingestion` | `POST /observations` (202) | Canonical HealthObservation (PROJECT_MASTER 6.3). Idempotent by `observation_id`. |
| `observations` | `GET /observations?subject_id=&metric_code=&data_origin=&start=&end=` | Ordered by `measured_at`, UTC. |
| `nasa` | `GET /space-weather?days=30`, `GET /nasa/osdr/studies?q=` | Real public NASA data (REAL_PUBLIC), cached 15 min. |
| `assistant` | `POST /assistant/chat` (server sent events), `GET /assistant/status` | Demo only: Claude API explains the engine snapshot. Needs `ANTHROPIC_API_KEY` in `.env`, else 503. See `docs/assistant-architecture.md`. |
| `engine` | none yet | Seam for porting the TypeScript engine (see below). |

### Ingestion rules

- `data_origin` is mandatory (`SIMULATED`, `REAL_PUBLIC`, `DERIVED`, `MANUAL`) and must come with its
  provenance: `REAL_PUBLIC` needs `source_reference.repository` and `dataset_accession`, `SIMULATED`
  needs `device_id`, `DERIVED` needs `metadata.method`.
- `value: null` is allowed only with `quality.status` `MISSING` or `INVALID`; it is stored as NULL, never as zero.
- Timestamps must carry a timezone and are stored in UTC.
- A batch is validated as a whole (422 and nothing stored if one observation is invalid).
- Resending an identical `observation_id` counts as a duplicate (no op). Reusing an id with different
  content is reported in `rejected`.

### NASA sources (no API key)

- **DONKI** (CCMC, NASA Goddard): `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{FLR|SEP|CME|GST}?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd`.
  CCMC retired the former `kauai.ccmc.gsfc.nasa.gov` host; paths after `/DONKI/` are unchanged.
  The response of `/space-weather` is exactly `SpaceWeatherSnapshot` of `frontend/web/src/types/nasa.ts`.
  If any of the four feeds fails the endpoint answers 502 (never a partial list that would read as "no storms").
- **OSDR**: `https://osdr.nasa.gov/osdr/data/search?term=<q>&type=cgene&ffield=organism&fvalue=Homo%20sapiens`.
  Returns accession, title, study link, project type, mission and release date.

## Tools

```bash
# Refresh the bundled offline snapshot (real DONKI data, last 30 days)
python -m app.cli donki-snapshot --days 30     # writes frontend/web/src/data/nasa/donki-snapshot.json
# Export the OpenAPI schema, then regenerate the web types
python -m app.cli openapi                      # writes backend/openapi.json
cd ../frontend/web && npm run api:types        # writes src/types/api.gen.ts
```

## Moving the health engine to Python later

The engine (baseline, anomaly, risk, forecast, recommendations) stays in TypeScript
(`frontend/web/src/engine`) for now, so the app runs with no server. `app/modules/engine/__init__.py`
documents the seam: a `HealthEngine` protocol that reads canonical observations through
`observations.service.query_observations` and returns the `domain.ts` shapes tagged `DERIVED`.
Port it module by module, reusing the vitest fixtures as pytest cases, and keep the TypeScript engine
as the offline fallback.
