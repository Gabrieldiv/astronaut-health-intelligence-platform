"""HTTP contract of the assistant. Mirrors frontend/web/src/features/assistant/types.ts.

Every list and string is bounded so a request can never grow the prompt (and the bill) without limit.
Unknown fields are ignored so the web app can add context fields before the API knows them.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

MAX_QUESTION_CHARS = 1000
MAX_TURN_CHARS = 4000
MAX_HISTORY_TURNS = 12
MAX_REQUEST_BYTES = 64_000

Short = Annotated[str, Field(max_length=120)]
Text = Annotated[str, Field(max_length=600)]
DataOrigin = Literal["SIMULATED", "REAL_PUBLIC", "DERIVED", "MANUAL"]
Status = Literal["LOW", "MODERATE", "HIGH", "CRITICAL", "NO_DATA"]


class _Model(BaseModel):
    model_config = ConfigDict(extra="ignore")


class MetricReading(_Model):
    code: Short
    label: Short
    value: float | None = Field(description="Latest value. null means no data, never zero.")
    unit: Short
    status: Status
    normal_low: float | None = Field(default=None, description="Lower edge of the personal normal band")
    normal_high: float | None = None
    baseline_ready: bool = False
    trend_per_hour: float | None = None
    explanation: Text | None = None
    quality: Short | None = None
    data_origin: DataOrigin = "SIMULATED"


class AlertItem(_Model):
    severity: Status
    title: Text
    detail: Text = ""
    metric: Short | None = None
    minutes_open: int | None = None
    escalated: bool = False


class RecommendationItem(_Model):
    title: Text
    rationale: Text = ""
    priority: Status
    audience: Short
    autonomy: Short | None = None
    requires_human_review: bool = True


class AstronautSnapshot(_Model):
    id: Short
    callsign: Short
    role: Short


class OverallState(_Model):
    status: Status
    risk_score: float | None = None
    headline: Text = ""
    confidence: float | None = None
    contributing_factors: Annotated[list[Text], Field(max_length=10)] = []
    limitations: Annotated[list[Text], Field(max_length=10)] = []


class MissionSnapshot(_Model):
    profile: Short
    vehicle: Short = ""
    mission_day: int | None = None
    scenario: Short = ""
    earth_link: Short = ""
    one_way_delay_seconds: float | None = None


class CabinSnapshot(_Model):
    status: Status
    headline: Text = ""
    metrics: Annotated[list[MetricReading], Field(max_length=12)] = []


class CrewMember(_Model):
    callsign: Short
    status: Status


class AssistantContext(_Model):
    """Grounded snapshot of the engine outputs for the selected astronaut."""

    schema_version: Literal["1"] = "1"
    data_origin: DataOrigin = "SIMULATED"
    sim_time_utc: Short = ""
    astronaut: AstronautSnapshot
    overall: OverallState
    metrics: Annotated[list[MetricReading], Field(max_length=30)] = []
    open_alerts: Annotated[list[AlertItem], Field(max_length=15)] = []
    recommendations: Annotated[list[RecommendationItem], Field(max_length=10)] = []
    mission: MissionSnapshot
    cabin: CabinSnapshot | None = None
    crew_overview: Annotated[list[CrewMember], Field(max_length=8)] = []


class ChatTurn(_Model):
    role: Literal["user", "assistant"]
    content: Annotated[str, Field(min_length=1, max_length=MAX_TURN_CHARS)]


class ChatRequest(_Model):
    question: Annotated[str, Field(min_length=1, max_length=MAX_QUESTION_CHARS)]
    history: Annotated[list[ChatTurn], Field(max_length=MAX_HISTORY_TURNS)] = []
    context: AssistantContext

    @model_validator(mode="after")
    def _check(self) -> "ChatRequest":
        if not self.question.strip():
            raise ValueError("question is empty")
        # The history must alternate user, assistant, user, assistant... so the new question follows an answer.
        for i, turn in enumerate(self.history):
            expected = "user" if i % 2 == 0 else "assistant"
            if turn.role != expected:
                raise ValueError("history must alternate user and assistant turns, starting with user")
        if self.history and self.history[-1].role != "assistant":
            raise ValueError("history must end with an assistant turn")
        return self


class AssistantStatus(BaseModel):
    configured: bool
    provider: str
    model: str
    deployment: Literal["cloud-demo"] = "cloud-demo"
    note: str
