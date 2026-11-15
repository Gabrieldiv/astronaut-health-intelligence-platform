"""ASTRA deviation detector for one person (numpy only).

Same computation as the ASTRA analysis pipeline (platform_output step, without the Isolation Forest):

1. Baseline: the person's own PRE_FLIGHT days. z = (value - mean) / effective SD, where the effective SD shrinks the
   person's SD toward the reference population SD (weight of 4 days). Needs 7 valid PRE_FLIGHT readings per metric.
2. Weight is judged by its rate of change: slope of the last 14 days of % change from the baseline weight.
3. Standardization: u = (z - expected adaptation at this day) / scale of healthy people in this phase.
   The expected adaptation curve and the scale come from the reference pack (params/reference_pack.json).
4. Detectors on u: Z-Score (|u| >= 3, 2 days in a row), EWMA (L 4.5, 3 days), CUSUM (k 1, h 12, 3 days),
   weight rate (|u| >= 2.5, 5 days). Days without a reading never reset a run and are never read as normal.
5. Level: HIGH = weight rate, or 2 or more of the 3 statistical detectors on the same day.
   MODERATE = any other confirmed alarm. LOW = no alarm. NO_DATA = nothing could be evaluated that day.

The Isolation Forest of the analysis is left out on purpose: in this platform machine learning never sets a level.
Decision support only, not a diagnosis. Limits and weights are the ones calibrated in the ASTRA analysis, not official limits.
"""

import json
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.modules.astra.schemas import (
    DayResult,
    DeviationMetric,
    DeviationRequest,
    DeviationResponse,
)

MODEL_VERSION = "astra-deviation v1 (statistical detectors, calibrated on NASA bed rest data)"
PACK_PATH = Path(__file__).parent / "params" / "reference_pack.json"

# Order matters: the first five are the daily vitals standardized against their own baseline.
VITALS: list[DeviationMetric] = ["HEART_RATE", "SYSTOLIC_BP", "DIASTOLIC_BP", "RESPIRATORY_RATE", "BODY_TEMPERATURE"]
WEIGHT: DeviationMetric = "BODY_WEIGHT"
ALL_METRICS: list[DeviationMetric] = [*VITALS, WEIGHT]
NAMES = {
    "HEART_RATE": "Heart rate",
    "SYSTOLIC_BP": "Systolic pressure",
    "DIASTOLIC_BP": "Diastolic pressure",
    "RESPIRATORY_RATE": "Respiratory rate",
    "BODY_TEMPERATURE": "Temperature",
    "BODY_WEIGHT": "Weight",
}
RULE_IDS = {"z": "R-ASTRA-Z-01", "ewma": "R-ASTRA-EWMA-01", "cusum": "R-ASTRA-CUSUM-01", "weight_rate": "R-ASTRA-WRATE-01"}
PHASE_OF = {"PRE_FLIGHT": "PRE", "IN_FLIGHT": "IN", "POST_FLIGHT": "POST"}

# Physical plausibility limits (same as the ASTRA cleaning step). Outside them the value is treated as missing.
PHYSICAL_LIMITS = {
    "HEART_RATE": (30, 220),
    "SYSTOLIC_BP": (60, 260),
    "DIASTOLIC_BP": (30, 150),
    "RESPIRATORY_RATE": (5, 40),
    "BODY_TEMPERATURE": (34, 41),
    "BODY_WEIGHT": (30, 200),
}

MIN_BASELINE_DAYS = 7
SHRINKAGE_K = 4.0
Z_LIMIT, Z_CONSEC = 3.0, 2
EWMA_LAMBDA, EWMA_L, EWMA_CONSEC = 0.2, 4.5, 3
CUSUM_K, CUSUM_H, CUSUM_CONSEC = 1.0, 12.0, 3
RATE_WINDOW, RATE_MIN_POINTS, RATE_LIMIT, RATE_CONSEC = 14, 8, 2.5, 5

LIMITATIONS = [
    "Decision support only, not a diagnosis. Levels are attention levels of a prototype, not medical classifications.",
    "Calibrated on 23 NASA bed rest volunteers (an analog of spaceflight, not astronauts); intervals are wide.",
    "In healthy people the HIGH level still appeared in about 3 of 10 people over a stay (cross validation), so it calls for review.",
    "The expected adaptation is a single curve for everyone, not per sex, and is not validated in flight.",
]
METHOD = (
    "Own PRE_FLIGHT baseline, expected adaptation discounted, deviations in units of healthy variation; "
    "Z-Score, EWMA, CUSUM and weight rate of change with confirmation days."
)


@dataclass(frozen=True)
class Signal:
    axis: np.ndarray
    curve: np.ndarray
    scale: dict[str, float]


@dataclass(frozen=True)
class ReferencePack:
    version: str
    pop_sd: dict[str, float]
    signals: dict[str, Signal]


@lru_cache(maxsize=1)
def load_pack() -> ReferencePack:
    raw = json.loads(PACK_PATH.read_text(encoding="utf-8"))
    signals = {
        metric: Signal(
            axis=np.asarray(s["axis"], dtype=float),
            curve=np.asarray([np.nan if v is None else v for v in s["curve"]], dtype=float),
            scale=dict(s["scale"]),
        )
        for metric, s in raw["signals"].items()
    }
    return ReferencePack(version=raw["pack_version"], pop_sd=dict(raw["pop_sd"]), signals=signals)


# ----------------------------------------------------------------------------------------
# Detectors (identical to ASTRA detectors.py)
# ----------------------------------------------------------------------------------------
def confirm(flag: np.ndarray, u: np.ndarray, n: int) -> np.ndarray:
    """Alarm = n consecutive VALID readings flagged (days without a reading do not reset the count)."""
    out = np.zeros(len(flag), dtype=bool)
    run = 0
    for i in range(len(flag)):
        if np.isnan(u[i]):
            continue
        run = run + 1 if flag[i] else 0
        out[i] = run >= n
    return out


def ewma_flag(u: np.ndarray) -> np.ndarray:
    flag = np.zeros(len(u), dtype=bool)
    state, t = 0.0, 0
    for i, x in enumerate(u):
        if np.isnan(x):
            continue
        t += 1
        state = EWMA_LAMBDA * x + (1 - EWMA_LAMBDA) * state
        limit = EWMA_L * np.sqrt(EWMA_LAMBDA / (2 - EWMA_LAMBDA) * (1 - (1 - EWMA_LAMBDA) ** (2 * t)))
        flag[i] = abs(state) > limit
    return flag


def cusum_flag(u: np.ndarray) -> np.ndarray:
    flag = np.zeros(len(u), dtype=bool)
    sp = sn = 0.0
    for i, x in enumerate(u):
        if not np.isnan(x):
            sp = max(0.0, sp + x - CUSUM_K)
            sn = max(0.0, sn - x - CUSUM_K)
        flag[i] = sp > CUSUM_H or sn > CUSUM_H
    return flag


def rolling_slope(day: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Slope (unit of y per day) of the last RATE_WINDOW days, point by point."""
    out = np.full(len(y), np.nan)
    for i in range(len(y)):
        inside = (day > day[i] - RATE_WINDOW) & (day <= day[i]) & ~np.isnan(y)
        if inside.sum() >= RATE_MIN_POINTS:
            out[i] = np.polyfit(day[inside], y[inside], 1)[0]
    return out


def nearest(axis: np.ndarray, query: np.ndarray) -> np.ndarray:
    """Index of the nearest axis value (axis sorted ascending); the lower one on a tie."""
    pos = np.clip(np.searchsorted(axis, query), 1, len(axis) - 1)
    left, right = axis[pos - 1], axis[pos]
    return np.where(np.abs(query - left) <= np.abs(right - query), pos - 1, pos)


# ----------------------------------------------------------------------------------------
# Standardization
# ----------------------------------------------------------------------------------------
def relative_days(dates: list[date], phases: list[str]) -> np.ndarray:
    """Day 1 is the first IN_FLIGHT date; days before it are negative (-1 = the day before). NaN when there is no IN day."""
    first_in = next((d for d, p in zip(dates, phases, strict=True) if p == "IN"), None)
    if first_in is None:
        return np.full(len(dates), np.nan)
    diff = np.array([(d - first_in).days for d in dates], dtype=float)
    return np.where(diff < 0, diff, diff + 1)


def deviations(values: np.ndarray, phases: np.ndarray, rel_day: np.ndarray, pack: ReferencePack) -> tuple[np.ndarray, dict[str, int]]:
    """Standardized deviation u for every row and metric (columns follow ALL_METRICS), plus the PRE reading count per metric."""
    n = len(rel_day)
    pre = phases == "PRE"
    in_phase = phases == "IN"
    end_in = np.nanmax(rel_day[in_phase]) if in_phase.any() else np.nan
    axis = np.where(phases == "POST", 1000 + (rel_day - end_in), rel_day)
    u = np.full((n, len(ALL_METRICS)), np.nan)
    pre_counts: dict[str, int] = {}
    for j, metric in enumerate(ALL_METRICS):
        x = values[:, j]
        x_pre = x[pre & ~np.isnan(x)]
        count = len(x_pre)
        pre_counts[metric] = count
        if count < MIN_BASELINE_DAYS or np.isnan(axis).all():
            continue
        if metric == WEIGHT:
            base = x_pre.mean()
            raw = np.where(np.isnan(x), np.nan, (x / base - 1) * 100)
            raw = rolling_slope(rel_day, raw)
        else:
            dof = count - 1
            sd = x_pre.std(ddof=1) if count > 1 else 0.0
            eff_sd = np.sqrt((dof * sd**2 + SHRINKAGE_K * pack.pop_sd[metric] ** 2) / (dof + SHRINKAGE_K))
            raw = (x - x_pre.mean()) / eff_sd
        sig = pack.signals[metric]
        curve = sig.curve[nearest(sig.axis, np.where(np.isnan(axis), sig.axis[0], axis))]
        scale = np.where(phases == "POST", sig.scale["POST"], sig.scale["IN"])
        col = (raw - curve) / scale
        col[pre | np.isnan(axis)] = np.nan  # only IN and POST days are judged
        u[:, j] = col
    return u, pre_counts


# ----------------------------------------------------------------------------------------
# Messages
# ----------------------------------------------------------------------------------------
def message(level: str, metric: str | None, u: float | None, detectors: list[str]) -> str:
    if level == "LOW":
        return ""
    if level == "NO_DATA":
        return "No data: no valid reading or baseline not ready, so the status is unknown (never read as normal)"
    word = "Alert" if level == "HIGH" else "Attention"
    fired = ",".join(detectors)
    if metric is None or u is None or np.isnan(u):
        return f"{word}: {fired}"
    direction = "above" if u > 0 else "below"
    if metric == WEIGHT:
        return f"{word}: weight rate of change {abs(u):.1f} deviations {direction} expected ({fired})"
    return f"{word}: {NAMES[metric]} {abs(u):.1f} deviations {direction} expected for this day of the stay ({fired})"


# ----------------------------------------------------------------------------------------
# Entry point
# ----------------------------------------------------------------------------------------
def analyze(req: DeviationRequest) -> DeviationResponse:
    pack = load_pack()
    days = sorted(req.days, key=lambda d: d.date)
    dates = [d.date for d in days]
    phases = np.array([PHASE_OF[d.phase] for d in days])
    values = np.full((len(days), len(ALL_METRICS)), np.nan)
    invalid = 0
    for i, d in enumerate(days):
        for j, metric in enumerate(ALL_METRICS):
            v = d.values.get(metric)
            if v is None:
                continue
            lo, hi = PHYSICAL_LIMITS[metric]
            if lo <= v <= hi:
                values[i, j] = v
            else:
                invalid += 1
    rel_day = relative_days(dates, list(phases))
    u_all, pre_counts = deviations(values, phases, rel_day, pack)

    judged = np.flatnonzero(phases != "PRE")
    u = u_all[judged]
    fz, fe, fc = (np.zeros(len(judged), dtype=bool) for _ in range(3))
    for j in range(len(VITALS)):
        col = u[:, j]
        fz |= confirm(np.abs(col) >= Z_LIMIT, col, Z_CONSEC)
        fe |= confirm(ewma_flag(col), col, EWMA_CONSEC)
        fc |= confirm(cusum_flag(col), col, CUSUM_CONSEC)
    uw = u[:, len(VITALS)]
    fw = confirm(np.abs(uw) >= RATE_LIMIT, uw, RATE_CONSEC)
    n_det = fz.astype(int) + fe.astype(int) + fc.astype(int)

    results: list[DayResult] = []
    for i, d in enumerate(days):
        if phases[i] == "PRE":
            continue
        k = int(np.searchsorted(judged, i))
        row = u[k]
        fired = [name for name, f in (("z", fz), ("ewma", fe), ("cusum", fc), ("weight_rate", fw)) if f[k]]
        no_data = bool(np.isnan(row).all())
        level = "NO_DATA" if no_data else "HIGH" if (fw[k] or n_det[k] >= 2) else "MODERATE" if fired else "LOW"
        vit = np.where(np.isnan(row[: len(VITALS)]), -1.0, np.abs(row[: len(VITALS)]))
        main: str | None = None
        main_u: float | None = None
        if vit.max() >= 0:
            top = int(vit.argmax())
            main, main_u = VITALS[top], float(row[top])
        if fired == ["weight_rate"]:
            main, main_u = WEIGHT, float(row[len(VITALS)])
        results.append(
            DayResult(
                date=d.date,
                phase=d.phase,
                rel_day=None if np.isnan(rel_day[i]) else int(rel_day[i]),
                level=level,
                detectors=fired,
                triggered_rules=[RULE_IDS[x] for x in fired],
                main_indicator=main,  # type: ignore[arg-type]
                deviation_u=None if main_u is None else round(main_u, 3),
                deviations={m: (None if np.isnan(row[j]) else round(float(row[j]), 3)) for j, m in enumerate(ALL_METRICS)},
                message=message(level, main, main_u, fired),
            )
        )
    return DeviationResponse(
        subject_id=req.subject_id,
        model_version=MODEL_VERSION,
        reference_pack=pack.version,
        method=METHOD,
        baselines=[
            {
                "metric": m,
                "status": "READY" if pre_counts[m] >= MIN_BASELINE_DAYS else "INSUFFICIENT_DATA",
                "pre_days": pre_counts[m],
                "required": MIN_BASELINE_DAYS,
            }
            for m in ALL_METRICS
        ],
        invalid_values=invalid,
        results=results,
        limitations=LIMITATIONS,
    )
