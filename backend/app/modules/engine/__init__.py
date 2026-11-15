"""Seam for the health intelligence engine (not implemented in Python yet).

Today the engine (personal baseline, anomaly rules, risk, forecast, recommendations) runs in
TypeScript in the browser: frontend/web/src/engine/. It is pure, deterministic and unit tested,
which is what lets the app work with no backend at all (offline demo mode).

Moving it here later is a port, not a redesign. The contract is already fixed:

* Input: canonical HealthObservation rows (app.modules.observations), read with
  observations.service.query_observations for one subject, metric and time window.
* Output: the shapes of frontend/web/src/types/domain.ts (Baseline, MetricAssessment, RiskAssessment,
  Recommendation), each carrying data_origin "DERIVED" and the method used.

Steps when the time comes:
1. Implement HealthEngine below module by module (baseline first), porting the vitest cases of
   src/engine/*.test.ts to pytest so both engines answer the same fixtures.
2. Run it after ingestion (ingestion.service.ingest returns the batch; enqueue the affected
   subject and metric pairs) and persist results in new tables through a new Alembic revision.
3. Expose GET /astronauts/{id}/baseline, /anomalies, /risks, /predictions, /recommendations
   (PROJECT_MASTER section 10.1) and switch the web store to them when the API is connected,
   keeping the TypeScript engine as the offline fallback.
"""

from collections.abc import Sequence
from typing import Any, Protocol

from app.modules.observations.schemas import ObservationOut


class HealthEngine(Protocol):
    """Port of src/engine/. Every returned record must carry data_origin "DERIVED" and metadata.method."""

    def baseline(self, subject_id: str, metric_code: str, history: Sequence[ObservationOut]) -> dict[str, Any]: ...

    def assess(self, subject_id: str, metric_code: str, recent: Sequence[ObservationOut], baseline: dict[str, Any]) -> dict[str, Any]: ...
