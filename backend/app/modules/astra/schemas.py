"""Request and response shapes of POST /analytics/deviation (ASTRA deviation detector)."""

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.observations.schemas import ID_PATTERN, MissionPhase

DeviationMetric = Literal[
    "HEART_RATE",
    "SYSTOLIC_BP",
    "DIASTOLIC_BP",
    "RESPIRATORY_RATE",
    "BODY_TEMPERATURE",
    "BODY_WEIGHT",
]
Level = Literal["LOW", "MODERATE", "HIGH", "NO_DATA"]
Detector = Literal["z", "ewma", "cusum", "weight_rate"]

FiniteFloat = Annotated[float, Field(allow_inf_nan=False)]
MAX_DAYS = 400
PHASE_ORDER = {"PRE_FLIGHT": 0, "IN_FLIGHT": 1, "POST_FLIGHT": 2}


class DayRecord(BaseModel):
    """One day of one person: the daily value of each metric (null or absent means missing, never zero)."""

    model_config = ConfigDict(extra="forbid")

    date: date
    phase: MissionPhase
    values: dict[DeviationMetric, FiniteFloat | None] = Field(
        description="Daily value per metric: HEART_RATE bpm, SYSTOLIC_BP and DIASTOLIC_BP mmHg, RESPIRATORY_RATE breaths/min, "
        "BODY_TEMPERATURE degC, BODY_WEIGHT kg. A daily mean or a standard morning reading, one value per day.",
    )


class DeviationRequest(BaseModel):
    """The whole stay of ONE person so far: PRE_FLIGHT days (baseline), then IN_FLIGHT, then POST_FLIGHT."""

    model_config = ConfigDict(extra="forbid")

    subject_id: str | None = Field(default=None, pattern=ID_PATTERN, description="Pseudonymized id, echoed back.")
    days: list[DayRecord] = Field(min_length=1, max_length=MAX_DAYS)

    @model_validator(mode="after")
    def _shape(self) -> "DeviationRequest":
        dates = [d.date for d in self.days]
        if len(set(dates)) != len(dates):
            raise ValueError("days must have one record per date")
        ordered = sorted(self.days, key=lambda d: d.date)
        ranks = [PHASE_ORDER[d.phase] for d in ordered]
        if ranks != sorted(ranks):
            raise ValueError("phases must follow the dates: PRE_FLIGHT, then IN_FLIGHT, then POST_FLIGHT")
        return self


class DayResult(BaseModel):
    date: date
    phase: MissionPhase
    rel_day: int | None = Field(
        description="Days since the start of IN_FLIGHT (day 1); negative before it. null when there is no IN_FLIGHT day yet."
    )
    level: Level = Field(description="LOW, MODERATE (attention), HIGH (alert) or NO_DATA. Missing data is never LOW.")
    detectors: list[Detector] = Field(description="Which detectors fired (confirmed) on this day.")
    triggered_rules: list[str]
    main_indicator: DeviationMetric | None = Field(
        description="Metric with the largest deviation of the day (weight when only its rate fired)."
    )
    deviation_u: float | None = Field(
        description="Deviation of main_indicator in units of normal variation, adaptation already discounted."
    )
    deviations: dict[DeviationMetric, float | None] = Field(
        description="Standardized deviation u per metric. BODY_WEIGHT is the weight rate of change, not the weight."
    )
    message: str


class BaselineInfo(BaseModel):
    metric: DeviationMetric
    status: Literal["READY", "INSUFFICIENT_DATA"]
    pre_days: int = Field(description="Valid PRE_FLIGHT readings found for this metric.")
    required: int


class DeviationResponse(BaseModel):
    subject_id: str | None
    model_version: str
    reference_pack: str
    method: str
    data_origin: Literal["DERIVED"] = "DERIVED"
    baselines: list[BaselineInfo]
    invalid_values: int = Field(description="Values outside the physical plausibility limits, treated as missing.")
    results: list[DayResult]
    limitations: list[str]
