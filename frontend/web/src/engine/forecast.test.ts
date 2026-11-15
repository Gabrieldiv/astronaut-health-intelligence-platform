import { describe, expect, it } from 'vitest'
import type { ForecastHorizonHours } from '../types/domain'
import { FORECAST_HORIZONS } from './config'
import { binMeans, buildHorizonPrediction, buildHorizonPredictions, buildPrediction, holtFit, holtForecast, holtIntervalSd, holtIntervalSds, horizonLabel, thinPoints } from './forecast'
import { DAY_MS, HOUR_MS, MIN_MS } from './text'

const NOW = Date.parse('2026-11-14T12:00:00Z')

describe('Holt linear smoothing', () => {
  it('follows a linear trend (damped)', () => {
    const y = Array.from({ length: 40 }, (_, i) => 10 + 0.5 * i)
    const fit = holtFit(y, 0.5, 0.3, 1)!
    const f = holtForecast(fit, 4)
    expect(f[0]).toBeCloseTo(30, 0)
    expect(f[3]).toBeCloseTo(31.5, 0)
    const damped = holtForecast(holtFit(y, 0.5, 0.3, 0.8)!, 20)
    // damping keeps long horizons from running away
    expect(damped[19]! - damped[0]!).toBeLessThan(0.5 * 19)
  })

  it('returns null with too few points', () => {
    expect(holtFit([1, 2])).toBeNull()
  })

  it('interval widens with the horizon', () => {
    const y = Array.from({ length: 30 }, (_, i) => 50 + Math.sin(i))
    const fit = holtFit(y)!
    const s1 = holtIntervalSd(fit, 1)
    const s12 = holtIntervalSd(fit, 12)
    expect(s12).toBeGreaterThan(s1)
  })

  it('computes the interval SDs of every step in one pass, matching the per step formula', () => {
    const fit = holtFit(Array.from({ length: 30 }, (_, i) => 50 + Math.sin(i)))!
    const all = holtIntervalSds(fit, 40)
    for (const h of [1, 2, 7, 40]) expect(all[h - 1]).toBeCloseTo(holtIntervalSd(fit, h), 10)
  })

  it('bins irregular points into time windows', () => {
    const b = binMeans(
      [
        { t: 0, v: 1 },
        { t: 10, v: 3 },
        { t: 100, v: 5 },
      ],
      0,
      50,
    )
    expect(b).toEqual([
      { t: 25, v: 2 },
      { t: 125, v: 5 },
    ])
  })
})

describe('buildPrediction', () => {
  const rising = (hours: number) =>
    Array.from({ length: hours * 60 }, (_, i) => ({ t: NOW - (hours * 60 - i) * MIN_MS, v: 60 + (i / 60) * 0.8 + Math.sin(i / 7) }))

  it('is not eligible with insufficient data', () => {
    const p = buildPrediction({ astronautId: 'A', metric: 'HEART_RATE', now: NOW, kind: 'continuous', points: rising(2), band: { low: 50, high: 70 } })
    expect(p.eligible).toBe(false)
    expect(p.points).toHaveLength(0)
    expect(p.disclaimer).toMatch(/Insufficient data/)
  })

  it('gives a 6 h horizon with partial data and 24 h with a full day, with widening 80% intervals', () => {
    const p6 = buildPrediction({ astronautId: 'A', metric: 'HEART_RATE', now: NOW, kind: 'continuous', points: rising(8), band: { low: 50, high: 70 } })
    expect(p6.eligible).toBe(true)
    expect(p6.horizonHours).toBe(6)
    const p24 = buildPrediction({ astronautId: 'A', metric: 'HEART_RATE', now: NOW, kind: 'continuous', points: rising(24), band: { low: 50, high: 90 } })
    expect(p24.horizonHours).toBe(24)
    expect(p24.intervalLabel).toBe('80% interval')
    const first = p24.points[0]!
    const last = p24.points[p24.points.length - 1]!
    expect(last.hi - last.lo).toBeGreaterThan(first.hi - first.lo)
    expect(first.lo).toBeLessThanOrEqual(first.v)
    expect(first.hi).toBeGreaterThanOrEqual(first.v)
    expect(p24.disclaimer).toMatch(/Not a clinical prediction/)
  })

  it('estimates hours until the central forecast leaves the personal band', () => {
    // currently ~79 and rising 0.8/h; band high 80 -> exit within a few hours
    const p = buildPrediction({ astronautId: 'A', metric: 'HEART_RATE', now: NOW, kind: 'continuous', points: rising(24), band: { low: 50, high: 80 } })
    expect(p.hoursToBandExit).not.toBeNull()
    expect(p.hoursToBandExit!).toBeGreaterThan(0)
    expect(p.hoursToBandExit!).toBeLessThan(12)
    const inside = buildPrediction({ astronautId: 'A', metric: 'HEART_RATE', now: NOW, kind: 'continuous', points: rising(24), band: { low: 0, high: 500 } })
    expect(inside.hoursToBandExit).toBeNull()
  })

  it('handles daily metrics with day steps', () => {
    const pts = Array.from({ length: 12 }, (_, i) => ({ t: NOW - (12 - i) * DAY_MS + 6 * HOUR_MS, v: 7 - i * 0.1 }))
    const p = buildPrediction({ astronautId: 'A', metric: 'SLEEP_DURATION', now: NOW, kind: 'event', points: pts, band: { low: 6, high: 8 }, physicalMin: 0 })
    expect(p.eligible).toBe(true)
    expect(p.points).toHaveLength(3)
    expect(p.points[2]!.v).toBeLessThan(p.points[0]!.v)
  })

  it('does not report a band exit while a metric is recovering from the opposite side', () => {
    // 20 h at 62 bpm, then an acute spike to 140 for 2 h, then a fast return to 62 in the last hour
    const pts = Array.from({ length: 23 * 60 }, (_, i) => {
      const hAgo = 23 - i / 60
      const v = hAgo > 3 ? 62 : hAgo > 1 ? 140 : 62
      return { t: NOW - hAgo * HOUR_MS, v }
    })
    const p = buildPrediction({ astronautId: 'A', metric: 'HEART_RATE', now: NOW, kind: 'continuous', points: pts, band: { low: 52, high: 78 } })
    expect(p.eligible).toBe(true)
    expect(p.hoursToBandExit).toBeNull()
  })
})

describe('selectable horizons (24 h to 15 days)', () => {
  /** Continuous series, one point every 5 min over `hours`, slow rise plus a daily wave. */
  const history = (hours: number) =>
    Array.from({ length: hours * 12 }, (_, i) => {
      const t = NOW - (hours * 12 - i) * 5 * MIN_MS
      return { t, v: 60 + (i / 12) * 0.02 + 2 * Math.sin((2 * Math.PI * i) / 288) + 0.5 * Math.sin(i * 1.7) }
    })
  const input = (hours: number) => ({ astronautId: 'A', metric: 'HEART_RATE' as const, now: NOW, kind: 'continuous' as const, points: history(hours), band: { low: 40, high: 90 } })
  const width = (p: { points: Array<{ lo: number; hi: number }> }) => {
    const last = p.points[p.points.length - 1]!
    return last.hi - last.lo
  }

  it('offers 24 h, 36 h, 72 h, 7 days and 15 days', () => {
    expect([...FORECAST_HORIZONS.options]).toEqual([24, 36, 72, 168, 360])
    expect(FORECAST_HORIZONS.options.map(horizonLabel)).toEqual(['24 h', '36 h', '72 h', '7 days', '15 days'])
    expect(Object.keys(buildHorizonPredictions(input(120))).map(Number)).toEqual([24, 36, 72, 168, 360])
  })

  it('projects each horizon to its full length when the history is long enough', () => {
    const all = buildHorizonPredictions(input(200))
    for (const h of FORECAST_HORIZONS.options) {
      const p = all[h]!
      expect(p.eligible).toBe(true)
      expect(p.horizonHours).toBe(h)
      expect(p.points.length).toBeLessThanOrEqual(FORECAST_HORIZONS.maxPoints + 1)
      expect(Math.round((p.points[p.points.length - 1]!.t - NOW) / HOUR_MS)).toBe(h)
    }
    expect(all[360]!.disclaimer).toMatch(/rough trend/)
    expect(all[24]!.disclaimer).not.toMatch(/rough trend/)
  })

  it('widens the uncertainty with the horizon, within and across horizons', () => {
    const all = buildHorizonPredictions(input(200))
    const p = all[168]!
    for (let i = 1; i < p.points.length; i++) expect(p.points[i]!.hi - p.points[i]!.lo).toBeGreaterThanOrEqual(p.points[i - 1]!.hi - p.points[i - 1]!.lo - 1e-9)
    const widths = FORECAST_HORIZONS.options.map((h) => width(all[h]!))
    for (let i = 1; i < widths.length; i++) expect(widths[i]!).toBeGreaterThan(widths[i - 1]!)
  })

  it('says "not enough history" instead of projecting when the history is too short for the horizon', () => {
    // 5 days of history (what the simulator stores): up to 7 days can be projected, 15 days cannot.
    const all = buildHorizonPredictions(input(120))
    expect(all[168]!.eligible).toBe(true)
    const p15 = all[360]!
    expect(p15.eligible).toBe(false)
    expect(p15.ineligibleReason).toBe('HISTORY_TOO_SHORT')
    expect(p15.points).toHaveLength(0)
    expect(p15.horizonHours).toBe(360)
    expect(p15.historyHours).toBeCloseTo(120, 0)
    expect(p15.disclaimer).toMatch(/Not enough history for this horizon/)
    // 30 h of history: 24 h and 36 h only
    const short = buildHorizonPredictions(input(30))
    const ok = (h: ForecastHorizonHours) => short[h]!.eligible
    expect([ok(24), ok(36), ok(72), ok(168), ok(360)]).toEqual([true, true, false, false, false])
  })

  it('keeps the usual insufficient data reason for gaps that are not about history length', () => {
    const pts = history(48).filter((p) => p.t < NOW - 6 * HOUR_MS) // nothing in the last 6 h
    const p = buildHorizonPrediction({ ...input(48), points: pts }, 24)
    expect(p.eligible).toBe(false)
    expect(p.ineligibleReason).toBe('INSUFFICIENT_DATA')
  })

  it('projects daily metrics in day steps, up to 15 days with two weeks of nights', () => {
    const nights = (n: number) => Array.from({ length: n }, (_, i) => ({ t: NOW - (n - i) * DAY_MS + 6 * HOUR_MS, v: 7 - i * 0.03 + 0.2 * Math.sin(i) }))
    const ev = (n: number) => ({ astronautId: 'A', metric: 'SLEEP_DURATION' as const, now: NOW, kind: 'event' as const, points: nights(n), band: { low: 6, high: 8 }, physicalMin: 0 })
    const all = buildHorizonPredictions(ev(14))
    expect(all[24]!.points).toHaveLength(1)
    expect(all[72]!.points).toHaveLength(3)
    expect(all[168]!.points).toHaveLength(7)
    expect(all[360]!.points).toHaveLength(15)
    expect(width(all[360]!)).toBeGreaterThan(width(all[72]!))
    // a week of nights is not enough for 15 days
    expect(buildHorizonPrediction(ev(7), 360).ineligibleReason).toBe('HISTORY_TOO_SHORT')
  })

  it('thins long projections but keeps the horizon end', () => {
    const pts = Array.from({ length: 720 }, (_, i) => i)
    const thin = thinPoints(pts, 72)
    expect(thin.length).toBeLessThanOrEqual(73)
    expect(thin[thin.length - 1]).toBe(719)
    expect(thinPoints([1, 2, 3], 72)).toEqual([1, 2, 3])
  })
})
