import { describe, expect, it } from 'vitest'
import type { MetricState } from '../../types/domain'
import { gaugeScale, limitFraction, metricChange } from './scale'

const ms = (current: number | null, status: MetricState['status'] = 'LOW', ready = true): MetricState => ({
  metric: 'HRV_RMSSD',
  current,
  unit: 'ms',
  status,
  zScore: null,
  ewma: null,
  trendPerHour: null,
  baseline: ready
    ? { metric: 'HRV_RMSSD', status: 'READY', median: 50, mean: 50, low: 40, high: 60 } as MetricState['baseline']
    : ({ metric: 'HRV_RMSSD', status: 'INSUFFICIENT_DATA', median: 0, mean: 0, low: 0, high: 0 } as unknown as MetricState['baseline']),
  lastUpdated: 0,
  quality: 'VALID',
  data_origin: 'SIMULATED',
})

describe('gaugeScale', () => {
  it('centers the band with half a band of margin each side', () => {
    const g = gaugeScale(50, 40, 60)
    expect(g.bandStart).toBeCloseTo(0.25)
    expect(g.bandEnd).toBeCloseTo(0.75)
    expect(g.marker).toBeCloseTo(0.5)
    expect(g.side).toBe('within')
  })
  it('keeps a far value on the track and says which side it is on', () => {
    const g = gaugeScale(200, 40, 60)
    expect(g.marker).toBeGreaterThan(0.9)
    expect(g.marker).toBeLessThanOrEqual(1)
    expect(g.side).toBe('above')
    expect(gaugeScale(0, 40, 60).side).toBe('below')
    expect(gaugeScale(0, 40, 60).marker).toBeGreaterThanOrEqual(0)
  })
  it('handles no value and a degenerate band', () => {
    expect(gaugeScale(null, 40, 60).marker).toBeNull()
    const g = gaugeScale(10, 10, 10)
    expect(g.bandEnd).toBeGreaterThan(g.bandStart)
    expect(g.side).toBe('within')
  })
})

describe('metricChange', () => {
  it('gives direction and whole percent vs the personal median', () => {
    expect(metricChange(ms(41))).toEqual({ direction: 'down', pct: 18, inBand: true })
    expect(metricChange(ms(70))).toEqual({ direction: 'up', pct: 40, inBand: false })
    expect(metricChange(ms(50))).toEqual({ direction: 'flat', pct: 0, inBand: true })
  })
  it('never reads missing data or an unready baseline as a change or as normal', () => {
    expect(metricChange(ms(null, 'NO_DATA'))).toEqual({ direction: 'flat', pct: null, inBand: null })
    expect(metricChange(ms(41, 'NO_DATA'))).toEqual({ direction: 'flat', pct: null, inBand: null })
    expect(metricChange(ms(41, 'LOW', false)).pct).toBeNull()
    expect(metricChange(undefined).pct).toBeNull()
  })
})

describe('limitFraction', () => {
  it('clamps to the limit and handles unknowns', () => {
    expect(limitFraction(150, 600)).toBeCloseTo(0.25)
    expect(limitFraction(900, 600)).toBe(1)
    expect(limitFraction(null, 600)).toBeNull()
    expect(limitFraction(10, 0)).toBeNull()
  })
})
