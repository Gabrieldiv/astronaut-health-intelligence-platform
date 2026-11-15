import { describe, expect, it } from 'vitest'
import { HourlyCusum } from './cusum'
import { MetricTracker } from './anomaly'
import { CUSUM } from './config'
import { HOUR_MS, MIN_MS } from './text'

const T0 = Date.parse('2026-11-01T00:00:00Z')
const CFG = { binMin: 60, k: 0.5, h: 8, cap: 16, zClamp: 4 }

/** Feed a constant z for `hours`, one sample every `everyMin` minutes. Returns the next t. */
function feedZ(c: HourlyCusum, t: number, hours: number, z: number, everyMin = 1): number {
  const end = t + hours * HOUR_MS
  for (; t < end; t += everyMin * MIN_MS) c.add(t, z, z * 2, z * 3)
  return t
}

describe('HourlyCusum (tabular CUSUM)', () => {
  it('does not accumulate when hourly means stay within the allowance k', () => {
    const c = new HourlyCusum(CFG)
    feedZ(c, T0, 48, 0.45)
    expect(c.up.s).toBe(0)
    expect(c.down.s).toBe(0)
  })

  it('accumulates a small steady shift by (m - k) per hour and signals once it reaches h', () => {
    const c = new HourlyCusum(CFG)
    let t = feedZ(c, T0, 10, 0.9)
    // 9 closed bins x (0.9 - 0.5) = 3.6
    expect(c.up.s).toBeCloseTo(3.6, 6)
    expect(c.signal('up', t, 12 * HOUR_MS)).toBe(false)
    t = feedZ(c, t, 15, 0.9)
    expect(c.up.s).toBeGreaterThanOrEqual(CFG.h)
    expect(c.signal('up', t, 12 * HOUR_MS)).toBe(true)
    expect(c.signal('down', t, 12 * HOUR_MS)).toBe(false)
    // The run keeps the mean deviation for the explanation.
    expect(c.up.pctSum / c.up.bins).toBeCloseTo(1.8, 6)
    expect(c.up.since).toBe(T0)
  })

  it('does not depend on the sampling cadence (1 min vs 5 min samples)', () => {
    const a = new HourlyCusum(CFG)
    const b = new HourlyCusum(CFG)
    feedZ(a, T0, 20, -0.8, 1)
    feedZ(b, T0, 20, -0.8, 5)
    expect(a.down.s).toBeCloseTo(b.down.s, 9)
    expect(a.side('both').sign).toBe(-1)
  })

  it('is capped and clears in bounded time after the shift ends', () => {
    const c = new HourlyCusum(CFG)
    let t = feedZ(c, T0, 100, 2)
    expect(c.up.s).toBe(CFG.cap)
    t = feedZ(c, t, CFG.cap / CFG.k + 2, 0)
    expect(c.up.s).toBe(0)
    expect(c.up.since).toBeNull()
  })

  it('clamps single spikes so one extreme value cannot fake a drift', () => {
    const c = new HourlyCusum(CFG)
    let t = T0
    c.add(t, 50, 0, 0) // one huge spike, clamped to zClamp
    for (let i = 1; i < 60; i++) c.add((t += MIN_MS), 0, 0, 0)
    feedZ(c, t + MIN_MS, 2, 0)
    expect(c.up.s).toBe(0)
  })
})

describe('MetricTracker CUSUM rule', () => {
  const noise = (i: number) => 1.5 * Math.sin(i * 0.7) + 0.8 * Math.sin(i * 0.13)
  function feed(tr: MetricTracker, t: number, minutes: number, level: number): number {
    for (let i = 0; i < minutes; i++) {
      tr.ingest(t, level + noise(t / MIN_MS), 'REST', 'VALID', 'DEV-TEST')
      t += MIN_MS
    }
    return t
  }

  it('flags a small but steady resting heart rate drift that stays under the EWMA rule', () => {
    const tr = new MetricTracker('AST-T', 'HEART_RATE')
    let t = feed(tr, T0, 5 * 24 * 60, 60)
    tr.recompute()
    // +3 bpm: under one robust SD (floor 3.5 bpm), so the EWMA drift rule never reaches 1.0.
    t = feed(tr, t, 10 * 60, 63)
    const early = tr.assess(t - MIN_MS, false)
    expect(early.status).toBe('LOW')
    expect(early.cusum!).toBeGreaterThan(0)
    t = feed(tr, t, 26 * 60, 63)
    const a = tr.assess(t - MIN_MS, false)
    expect(Math.abs(tr.driftZ)).toBeLessThan(1)
    expect(a.status).toBe('MODERATE')
    expect(a.cusumFlag).toBe(true)
    expect(a.method).toBe('PERSISTENCE')
    expect(a.ruleId).toBe('R-HR-02')
    expect(a.label).toMatch(/Resting heart rate \d+% above your normal: a small but steady drift over \d+ (hours|days) \(CUSUM\)/)
    expect(a.cusum!).toBeGreaterThanOrEqual(CUSUM.h)
  })

  it('stays LOW on stable data', () => {
    const tr = new MetricTracker('AST-T', 'HEART_RATE')
    let t = feed(tr, T0, 5 * 24 * 60, 60)
    tr.recompute()
    t = feed(tr, t, 36 * 60, 60)
    const a = tr.assess(t - MIN_MS, false)
    expect(a.status).toBe('LOW')
    expect(a.cusumFlag).toBe(false)
  })
})
