"""Registry contracts. Astronauts are pseudonymized: unknown fields (such as a real name) are rejected."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.observations.schemas import ID_PATTERN, DataOrigin, MissionPhase

# Same codes as DeviceKind in frontend/web/src/types/domain.ts.
DeviceKind = Literal["BIO_MONITOR", "ACTIGRAPHY", "BP_MONITOR", "EXERCISE_CEVIS", "EXERCISE_ARED", "EXERCISE_T2", "ENV_SENSOR", "DOSIMETER"]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class AstronautIn(_Strict):
    id: str = Field(pattern=ID_PATTERN, examples=["ASTRONAUT-001"])
    pseudonym: str = Field(min_length=1, max_length=80, description="Call sign or code. Never a real name.", examples=["Commander A"])
    role: str | None = Field(default=None, max_length=80, examples=["Commander"])


class AstronautOut(AstronautIn):
    created_at: datetime


class MissionIn(_Strict):
    id: str = Field(pattern=ID_PATTERN, examples=["MISSION-001"])
    name: str = Field(min_length=1, max_length=120)
    destination: Literal["ISS", "MOON", "MARS", "ANALOG", "OTHER"] | None = None
    phase: MissionPhase
    started_at: datetime | None = None


class MissionOut(MissionIn):
    created_at: datetime


class DeviceIn(_Strict):
    id: str = Field(pattern=ID_PATTERN, examples=["SIM-ASTROSKIN-001"])
    kind: DeviceKind
    name: str = Field(min_length=1, max_length=120)
    assigned_to: str | None = Field(default=None, description="Astronaut id, or null for cabin devices.")
    mission_id: str | None = None
    data_origin: DataOrigin = Field(description="SIMULATED for every device in the MVP.")


class DeviceOut(DeviceIn):
    created_at: datetime
