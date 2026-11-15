"""Request and response shapes of POST /analytics/multivariate."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

FiniteFloat = Annotated[float, Field(allow_inf_nan=False)]
Vector = Annotated[list[FiniteFloat], Field(min_length=1, max_length=32)]
FeatureCode = Annotated[str, Field(pattern=r"^[A-Z0-9_]{1,40}$")]

MAX_TRAINING_ROWS = 20_000
MAX_SCORE_ROWS = 5_000


class MultivariateOptions(BaseModel):
    """Demo configuration, not an official limit. Defaults mirror MULTIVARIATE in src/engine/config.ts."""

    model_config = ConfigDict(extra="forbid")

    n_estimators: int = Field(default=100, ge=10, le=500)
    max_samples: int = Field(default=256, ge=16, le=4096)
    random_state: int = Field(default=20261115, ge=0, le=2**32 - 1)
    whiten: bool = Field(default=True, description="Decorrelate with PCA whitening fitted on the training window.")
    whitening_floor: float = Field(default=0.05, gt=0, le=10, description="Minimum variance per principal axis.")
    range_aware: bool = Field(
        default=True,
        description="Range aware isolation like the browser forest (far points score above the usual extremes). False: plain sklearn scores.",
    )
    calibration_quantile: float = Field(default=0.995, ge=0.5, lt=1)
    score_floor: float = Field(default=0.6, ge=0, le=1)


class MultivariateRequest(BaseModel):
    """Standardized feature windows (robust z per metric vs the personal baseline), not raw vitals."""

    model_config = ConfigDict(extra="forbid")

    subject_id: str | None = Field(default=None, max_length=64, description="Pseudonymized id, echoed back.")
    features: list[FeatureCode] = Field(min_length=1, max_length=32)
    training: list[Vector] = Field(min_length=32, max_length=MAX_TRAINING_ROWS, description="The person's own baseline window.")
    score: list[Vector] = Field(min_length=1, max_length=MAX_SCORE_ROWS, description="Vectors to score.")
    options: MultivariateOptions = Field(default_factory=MultivariateOptions)

    @model_validator(mode="after")
    def _shapes(self) -> "MultivariateRequest":
        d = len(self.features)
        if len(set(self.features)) != d:
            raise ValueError("features must be unique")
        for name, rows in (("training", self.training), ("score", self.score)):
            for i, row in enumerate(rows):
                if len(row) != d:
                    raise ValueError(f"{name}[{i}] has {len(row)} values, expected {d} (one per feature)")
        return self


class FeatureContribution(BaseModel):
    feature: str
    z: float
    share: float = Field(description="Share of the squared deviation (sums to 1 over all features).")


class MultivariateResult(BaseModel):
    score: float = Field(description="Isolation Forest anomaly score 0..1 (about 0.5 or less is typical).")
    above_threshold: bool = Field(description="Score at or above the personal threshold. Not a flag: persistence rules apply first.")
    contributions: list[FeatureContribution]


class MultivariateResponse(BaseModel):
    subject_id: str | None
    model_version: str
    engine: str
    label: Literal["Experimental, machine learning"] = "Experimental, machine learning"
    data_origin: Literal["DERIVED"] = "DERIVED"
    features: list[str]
    training_size: int
    threshold: float
    results: list[MultivariateResult]
    limitations: list[str]
