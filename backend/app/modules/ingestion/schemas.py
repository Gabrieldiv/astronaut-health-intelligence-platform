from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.observations.schemas import HealthObservation


class IngestBatch(BaseModel):
    """A batch is validated as a whole: one invalid observation rejects the request (422) and nothing is stored."""

    model_config = ConfigDict(extra="forbid")
    observations: list[HealthObservation] = Field(min_length=1, max_length=5000)


class Rejection(BaseModel):
    observation_id: str
    reason: str


class IngestResult(BaseModel):
    status: Literal["ACCEPTED"]
    batch_id: str
    accepted_count: int = Field(description="New observations stored.")
    duplicate_count: int = Field(description="Identical resends of an id already stored (idempotent no op).")
    rejected_count: int
    rejected: list[Rejection]
