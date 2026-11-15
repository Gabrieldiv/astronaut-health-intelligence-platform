import type { MetricState } from '../../types/domain'

export interface GaugeGeometry {
  /** Left edge of the personal normal band, 0..1 of the track. */
  bandStart: number
  /** Right edge of the personal normal band, 0..1 of the track. */
  bandEnd: number
  /** Value marker position, 0..1 of the track (null when there is no value). */
  marker: number | null
  /** Where the value sits relative to the band. */
  side: 'below' | 'within' | 'above' | null
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/**
 * Bullet gauge scaling: the personal band sits in the middle of the track with half a band of
 * margin on each side; a value far outside widens the track so the marker stays visible
 * (it is drawn at the edge, never off the track). Degenerate bands get a small width.
 */
export function gaugeScale(value: number | null | undefined, low: number, high: number): GaugeGeometry {
  let lo = Math.min(low, high)
  let hi = Math.max(low, high)
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { bandStart: 0, bandEnd: 0, marker: null, side: null }
  if (hi - lo < 1e-9) {
    const pad = Math.abs(hi) * 0.05 || 1
    lo -= pad
    hi += pad
  }
  const span = hi - lo
  let min = lo - span * 0.5
  let max = hi + span * 0.5
  const v = value != null && Number.isFinite(value) ? value : null
  if (v != null) {
    if (v < min) min = v - span * 0.1
    if (v > max) max = v + span * 0.1
  }
  const pos = (x: number) => clamp01((x - min) / (max - min))
  return {
    bandStart: pos(lo),
    bandEnd: pos(hi),
    marker: v == null ? null : pos(v),
    side: v == null ? null : v < Math.min(low, high) ? 'below' : v > Math.max(low, high) ? 'above' : 'within',
  }
}

export interface MetricChange {
  direction: 'up' | 'down' | 'flat'
  /** Whole percent change from the person's typical value (median), null when unknown. */
  pct: number | null
  /** True when the current value is inside the personal band. */
  inBand: boolean | null
}

/**
 * Direction and size of a metric's change against the personal baseline, for factor chips
 * ("HRV down 18%"). Uses the baseline median (mean as fallback). No value or no ready baseline
 * gives a null percent: missing data is never read as normal.
 */
export function metricChange(ms: MetricState | undefined): MetricChange {
  if (!ms || ms.current == null || ms.status === 'NO_DATA') return { direction: 'flat', pct: null, inBand: null }
  const b = ms.baseline
  if (!b || b.status !== 'READY') return { direction: 'flat', pct: null, inBand: null }
  const ref = Number.isFinite(b.median) && b.median !== 0 ? b.median : b.mean
  const inBand = ms.current >= b.low && ms.current <= b.high
  if (!ref) return { direction: 'flat', pct: null, inBand }
  const raw = ((ms.current - ref) / Math.abs(ref)) * 100
  const pct = Math.round(Math.abs(raw))
  return { direction: pct === 0 ? 'flat' : raw > 0 ? 'up' : 'down', pct, inBand }
}

/**
 * Half-width 0..1 of a diverging change bar: a 25% change from baseline fills one side. A zero
 * or missing baseline (presence measures such as folds) shows any change as a full side.
 */
export function changeBarWidth(change: number | null, baseline: number | null): number | null {
  if (change == null || !Number.isFinite(change)) return null
  if (change === 0) return 0
  if (baseline == null || baseline === 0) return 1
  return clamp01(Math.abs(change / baseline) / 0.25)
}

/** Delay clock dial: one hour of one way delay fills it (clamped). */
export function delayClockFraction(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  return clamp01(seconds / 3600)
}

/** Fraction 0..1 of a limit (null when unknown); values over the limit stay at 1. */
export function limitFraction(value: number | null | undefined, limit: number): number | null {
  if (value == null || !Number.isFinite(value) || !(limit > 0)) return null
  return clamp01(value / limit)
}
