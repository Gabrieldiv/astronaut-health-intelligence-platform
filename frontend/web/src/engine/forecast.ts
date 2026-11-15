/**
 * Short horizon statistical projection: damped Holt linear smoothing.
 *
 *   level_t = alpha y_t + (1 - alpha)(level_{t-1} + phi trend_{t-1})
 *   trend_t = beta (level_t - level_{t-1}) + (1 - beta) phi trend_{t-1}
 *   yhat_{t+h} = level_t + (phi + phi^2 + ... + phi^h) trend_t
 *
 * The 80% interval uses the one step residual SD widened with the horizon:
 *   sd_h = sd_1 x sqrt(1 + sum_{j=1}^{h-1} (alpha (1 + beta (phi + ... + phi^j)))^2)
 *
 * Horizons are shown only when there is enough recent data (PROJECT_MASTER 9.6).
 * buildHorizonPrediction() projects a horizon the user picked (24 h to 15 days) and declines
 * when the history is too short for it (FORECAST_HORIZONS.minHistoryRatio, demo rule).
 * This is a statistical projection of simulated data, never a clinical prediction.
 */
import type { ForecastHorizonHours, ForecastPoint, MetricCode, Prediction } from '../types/domain'
import { FORECAST, FORECAST_HORIZONS, FORECAST_METHOD } from './config'
import { clamp, sd } from './stats'
import { DAY_MS, HOUR_MS, MIN_MS } from './text'

export interface HoltFit {
  level: number
  trend: number
  residSd: number
  n: number
  alpha: number
  beta: number
  phi: number
}

export function holtFit(y: number[], alpha: number = FORECAST.alpha, beta: number = FORECAST.beta, phi: number = FORECAST.phi): HoltFit | null {
  const n = y.length
  if (n < 3) return null
  let level = y[0]!
  let trend = (y[Math.min(n - 1, 3)]! - y[0]!) / Math.min(n - 1, 3)
  const resid: number[] = []
  for (let i = 1; i < n; i++) {
    const pred = level + phi * trend
    resid.push(y[i]! - pred)
    const prevLevel = level
    level = alpha * y[i]! + (1 - alpha) * (level + phi * trend)
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend
  }
  // Use recent residuals: the series may have changed regime.
  const recent = resid.slice(-Math.max(6, Math.floor(resid.length / 2)))
  let residSd = Math.sqrt(recent.reduce((s, r) => s + r * r, 0) / Math.max(1, recent.length))
  if (!Number.isFinite(residSd) || residSd === 0) residSd = sd(y) || 1e-6
  return { level, trend, residSd, n, alpha, beta, phi }
}

export function holtForecast(fit: HoltFit, steps: number): number[] {
  const out: number[] = []
  let phiSum = 0
  let phiPow = 1
  for (let h = 1; h <= steps; h++) {
    phiPow *= fit.phi
    phiSum += phiPow
    out.push(fit.level + phiSum * fit.trend)
  }
  return out
}

/** SD of the h step ahead forecast error (approximation for damped Holt). */
export function holtIntervalSd(fit: HoltFit, h: number): number {
  let acc = 1
  let phiSum = 0
  let phiPow = 1
  for (let j = 1; j < h; j++) {
    phiPow *= fit.phi
    phiSum += phiPow
    const c = fit.alpha * (1 + fit.beta * phiSum)
    acc += c * c
  }
  return fit.residSd * Math.sqrt(acc)
}

/** holtIntervalSd for h = 1..steps in one pass (same values, linear time for long horizons). */
export function holtIntervalSds(fit: HoltFit, steps: number): number[] {
  const out: number[] = []
  let acc = 1
  let phiSum = 0
  let phiPow = 1
  for (let h = 1; h <= steps; h++) {
    out.push(fit.residSd * Math.sqrt(acc))
    phiPow *= fit.phi
    phiSum += phiPow
    const c = fit.alpha * (1 + fit.beta * phiSum)
    acc += c * c
  }
  return out
}

/** Mean per time bin, skipping empty bins. */
export function binMeans(points: Array<{ t: number; v: number }>, t0: number, binMs: number): Array<{ t: number; v: number }> {
  const sums = new Map<number, { s: number; n: number }>()
  for (const p of points) {
    if (p.t < t0) continue
    const k = Math.floor((p.t - t0) / binMs)
    const e = sums.get(k)
    if (e) {
      e.s += p.v
      e.n++
    } else sums.set(k, { s: p.v, n: 1 })
  }
  return [...sums.entries()].sort((a, b) => a[0] - b[0]).map(([k, e]) => ({ t: t0 + (k + 0.5) * binMs, v: e.s / e.n }))
}

export const FORECAST_DISCLAIMER =
  'Statistical projection from recent simulated data. Not a clinical prediction: uncertainty grows with the horizon and the projection assumes recent conditions continue.'

export interface ForecastInput {
  astronautId: string
  metric: MetricCode
  now: number
  kind: 'continuous' | 'event'
  /** Continuous: raw (context adjusted) points of the last FORECAST.windowHours. Event: one point per day. */
  points: Array<{ t: number; v: number }>
  band: { low: number; high: number } | null
  physicalMin?: number
  physicalMax?: number
  methodNote?: string
}

function ineligible(input: ForecastInput, why: string): Prediction {
  return {
    astronautId: input.astronautId,
    metric: input.metric,
    method: FORECAST_METHOD,
    horizonHours: 0,
    points: [],
    intervalLabel: '80% interval',
    hoursToBandExit: null,
    eligible: false,
    disclaimer: `Insufficient data for a projection (${why}).`,
  }
}

export function buildPrediction(input: ForecastInput): Prediction {
  const lo = input.physicalMin ?? -Infinity
  const hi = input.physicalMax ?? Infinity
  let series: Array<{ t: number; v: number }>
  let stepMs: number
  let steps: number
  if (input.kind === 'continuous') {
    const binMs = FORECAST.binMin * MIN_MS
    const t0 = input.now - FORECAST.windowHours * HOUR_MS
    series = binMeans(input.points, t0, binMs)
    if (series.length < FORECAST.minBins) return ineligible(input, `${series.length} of ${FORECAST.minBins} half-hour windows with data`)
    const last = series[series.length - 1]!
    if (input.now - last.t > 2 * HOUR_MS) return ineligible(input, 'no recent values')
    stepMs = binMs
    const horizonH = series.length >= FORECAST.binsFor24h ? 24 : 6
    steps = (horizonH * HOUR_MS) / binMs
  } else {
    series = input.points.slice(-14)
    if (series.length < FORECAST.minEvents) return ineligible(input, `${series.length} of ${FORECAST.minEvents} daily values`)
    const last = series[series.length - 1]!
    if (input.now - last.t > 2 * DAY_MS) return ineligible(input, 'no recent values')
    stepMs = DAY_MS
    steps = series.length >= FORECAST.eventsFor72h ? 3 : 1
  }
  const fit = holtFit(series.map((p) => p.v))
  if (!fit) return ineligible(input, 'too few points')
  const central = holtForecast(fit, steps)
  const lastT = series[series.length - 1]!.t
  const startT = input.kind === 'continuous' ? input.now : lastT
  const pts = central.map((v, i) => {
    const h = i + 1
    const s = FORECAST.z80 * holtIntervalSd(fit, h)
    return {
      t: startT + h * stepMs,
      v: clamp(v, lo, hi),
      lo: clamp(v - s, lo, hi),
      hi: clamp(v + s, lo, hi),
    }
  })
  const hoursToBandExit = bandExit(input, series, fit, pts)
  const horizonHours = Math.round((pts[pts.length - 1]!.t - input.now) / HOUR_MS)
  return {
    astronautId: input.astronautId,
    metric: input.metric,
    method: input.methodNote ? `${FORECAST_METHOD} (${input.methodNote})` : FORECAST_METHOD,
    horizonHours,
    points: pts,
    intervalLabel: '80% interval',
    hoursToBandExit,
    eligible: true,
    disclaimer: FORECAST_DISCLAIMER,
  }
}

/** Hours until the central forecast leaves the personal band (0 = outside now), null if it stays inside. */
function bandExit(input: ForecastInput, series: Array<{ t: number; v: number }>, fit: HoltFit, pts: ForecastPoint[]): number | null {
  let hoursToBandExit: number | null = null
  if (input.band) {
    const band = input.band
    const outside = (v: number) => v < band.low || v > band.high
    // Judge "outside now" on the latest observed window, not on the smoothed level,
    // which lags behind a fast change (for example right after a recovery).
    const lastV = series[series.length - 1]!.v
    if (outside(lastV)) hoursToBandExit = 0
    else {
      const first = pts.find((p) => outside(p.v))
      if (first) {
        // A series that just came back from the opposite side of the band is recovering:
        // its downward (or upward) momentum is not a drift out of the normal range.
        // Recovering = a recent excursion outside the band and the trend points back from it.
        // The smoothed level lags, so the projection can still sit on either side of the band.
        const recent = series.slice(-FORECAST.recoveryLookbackBins)
        const recovering =
          (fit.trend < 0 && recent.some((p) => p.v > band.high)) || (fit.trend > 0 && recent.some((p) => p.v < band.low))
        if (!recovering) hoursToBandExit = Math.max(0, (first.t - input.now) / HOUR_MS)
      }
    }
  }
  return hoursToBandExit
}

const HORIZON_WORD: Record<ForecastHorizonHours, string> = { 24: '24 h', 36: '36 h', 72: '72 h', 168: '7 days', 360: '15 days' }

/** Plain label of a horizon, e.g. "7 days". */
export function horizonLabel(h: ForecastHorizonHours): string {
  return HORIZON_WORD[h]
}

/** Plain duration for history notes, e.g. "18 h" or "7.5 days". */
export function fmtSpan(hours: number): string {
  return hours >= 48 ? `${Math.round((hours / 24) * 10) / 10} days` : `${Math.round(hours)} h`
}

/** Keep at most `max` points, evenly spaced, always keeping the last one (the horizon end). */
export function thinPoints<T>(pts: T[], max: number): T[] {
  if (pts.length <= max) return pts
  const stride = Math.ceil(pts.length / max)
  const out: T[] = []
  for (let i = stride - 1; i < pts.length; i += stride) out.push(pts[i]!)
  if (out[out.length - 1] !== pts[pts.length - 1]) out.push(pts[pts.length - 1]!)
  return out
}

/** Hours of history the projection can rely on (now minus the oldest point). */
export function historyHoursOf(input: Pick<ForecastInput, 'now' | 'points'>): number {
  let first = Infinity
  for (const p of input.points) if (p.t < first) first = p.t
  return Number.isFinite(first) ? Math.max(0, (input.now - first) / HOUR_MS) : 0
}

/**
 * Projection for a horizon picked by the user (24 h, 36 h, 72 h, 7 days or 15 days).
 *
 * `points` is the whole available history (continuous: context adjusted raw points; event: one
 * point per day). The horizon is projected only when the history goes back at least
 * horizon x FORECAST_HORIZONS.minHistoryRatio hours (demo rule); otherwise the result is not
 * eligible, with ineligibleReason 'HISTORY_TOO_SHORT'. The fit window grows with the horizon
 * (never shorter than FORECAST.windowHours) and the step is the same for every horizon, so the
 * 80% interval keeps widening the further ahead it goes.
 */
export function buildHorizonPrediction(input: ForecastInput, horizon: ForecastHorizonHours, binned?: Array<{ t: number; v: number }>): Prediction {
  const neededH = horizon * FORECAST_HORIZONS.minHistoryRatio
  const historyHours = Math.round(historyHoursOf(input) * 10) / 10
  const base = { historyHours, horizonHours: horizon }
  if (historyHours < neededH) {
    return {
      ...ineligible(input, 'history too short'),
      ...base,
      ineligibleReason: 'HISTORY_TOO_SHORT',
      disclaimer: `Not enough history for this horizon: a ${horizonLabel(horizon)} projection needs at least ${fmtSpan(neededH)} of history, ${fmtSpan(historyHours)} available.`,
    }
  }
  const notEnough = (why: string): Prediction => ({ ...ineligible(input, why), ...base, ineligibleReason: 'INSUFFICIENT_DATA' })
  const lo = input.physicalMin ?? -Infinity
  const hi = input.physicalMax ?? Infinity
  const windowH = Math.max(FORECAST.windowHours, neededH)
  let series: Array<{ t: number; v: number }>
  let stepMs: number
  let steps: number
  if (input.kind === 'continuous') {
    stepMs = FORECAST.binMin * MIN_MS
    const t0 = input.now - windowH * HOUR_MS
    // Pre-binned on the same half-hour grid (see buildHorizonPredictions): keep the bins of this window.
    series = binned ? binned.filter((p) => p.t >= t0 + stepMs / 2) : binMeans(input.points, t0, stepMs)
    if (series.length < FORECAST.minBins) return notEnough(`${series.length} of ${FORECAST.minBins} half-hour windows with data`)
    if (input.now - series[series.length - 1]!.t > 2 * HOUR_MS) return notEnough('no recent values')
    steps = Math.round((horizon * HOUR_MS) / stepMs)
  } else {
    const from = input.now - Math.max(14 * 24, neededH) * HOUR_MS
    series = input.points.filter((p) => p.t >= from).sort((a, b) => a.t - b.t)
    if (series.length < FORECAST.minEvents) return notEnough(`${series.length} of ${FORECAST.minEvents} daily values`)
    if (input.now - series[series.length - 1]!.t > 2 * DAY_MS) return notEnough('no recent values')
    stepMs = DAY_MS
    steps = Math.max(1, Math.floor(horizon / 24))
  }
  const fit = holtFit(series.map((p) => p.v))
  if (!fit) return notEnough('too few points')
  const central = holtForecast(fit, steps)
  const sds = holtIntervalSds(fit, steps)
  const startT = input.kind === 'continuous' ? input.now : series[series.length - 1]!.t
  const full: ForecastPoint[] = central.map((v, i) => {
    const s = FORECAST.z80 * sds[i]!
    return { t: startT + (i + 1) * stepMs, v: clamp(v, lo, hi), lo: clamp(v - s, lo, hi), hi: clamp(v + s, lo, hi) }
  })
  const longNote = horizon > FORECAST_HORIZONS.longHorizonHours ? ' Long horizon: read it as a rough trend, not a value to expect.' : ''
  return {
    astronautId: input.astronautId,
    metric: input.metric,
    method: input.methodNote ? `${FORECAST_METHOD} (${input.methodNote})` : FORECAST_METHOD,
    horizonHours: horizon,
    points: thinPoints(full, FORECAST_HORIZONS.maxPoints),
    intervalLabel: '80% interval',
    hoursToBandExit: bandExit(input, series, fit, full),
    eligible: true,
    disclaimer: FORECAST_DISCLAIMER + longNote,
    historyHours,
  }
}

/** The projection for every selectable horizon (FORECAST_HORIZONS.options). */
export function buildHorizonPredictions(input: ForecastInput): Partial<Record<ForecastHorizonHours, Prediction>> {
  const out: Partial<Record<ForecastHorizonHours, Prediction>> = {}
  // Bin the continuous history once on a half-hour grid anchored at `now`; every window is a
  // whole number of half hours, so each horizon gets exactly the bins it would compute itself.
  const maxWindowH = Math.max(FORECAST.windowHours, ...FORECAST_HORIZONS.options.map((h) => h * FORECAST_HORIZONS.minHistoryRatio))
  const binned = input.kind === 'continuous' ? binMeans(input.points, input.now - maxWindowH * HOUR_MS, FORECAST.binMin * MIN_MS) : undefined
  for (const h of FORECAST_HORIZONS.options) out[h] = buildHorizonPrediction(input, h, binned)
  return out
}
