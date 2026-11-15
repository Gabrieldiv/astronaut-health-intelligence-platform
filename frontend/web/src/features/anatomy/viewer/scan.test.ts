import { describe, expect, it } from 'vitest'
import { SCAN_OFF_Y, SCAN_TIMING, SCAN_TIMING_REDUCED, scanState } from './scan'

const TOP = 1.79
const BOTTOM = 0

describe('scanState', () => {
  it('sweeps from the head down to the feet', () => {
    const ys: number[] = []
    for (let t = 0.05; t < SCAN_TIMING.sweep; t += 0.05) ys.push(scanState(t, TOP, BOTTOM).y)
    for (let i = 1; i < ys.length; i++) expect(ys[i]!).toBeLessThan(ys[i - 1]!)
    expect(ys[0]!).toBeGreaterThan(TOP - 0.05)
    expect(ys[ys.length - 1]!).toBeLessThan(BOTTOM + 0.05)
  })

  it('rests between sweeps and repeats every period', () => {
    expect(scanState(SCAN_TIMING.sweep + 0.5, TOP, BOTTOM)).toEqual({ y: SCAN_OFF_Y, amp: 0 })
    const a = scanState(1, TOP, BOTTOM)
    const b = scanState(1 + 3 * SCAN_TIMING.period, TOP, BOTTOM)
    expect(b.y).toBeCloseTo(a.y, 9)
    expect(b.amp).toBeCloseTo(a.amp, 9)
  })

  it('fades in and out instead of popping', () => {
    expect(scanState(0, TOP, BOTTOM).amp).toBe(0)
    expect(scanState(SCAN_TIMING.sweep * 0.999, TOP, BOTTOM).amp).toBeLessThan(0.01)
    expect(scanState(SCAN_TIMING.sweep / 2, TOP, BOTTOM).amp).toBeCloseTo(SCAN_TIMING.amp, 6)
  })

  it('never lights a point more than 3 times per second', () => {
    for (const timing of [SCAN_TIMING, SCAN_TIMING_REDUCED]) {
      // a point is lit when the band passes over it: count passes over the chest in 60 seconds
      const y = 1.3
      let passes = 0
      let prev = scanState(0, TOP, BOTTOM, timing)
      for (let t = 0.01; t <= 60; t += 0.01) {
        const s = scanState(t, TOP, BOTTOM, timing)
        if (prev.amp > 0 && s.amp > 0 && prev.y > y && s.y <= y) passes++
        prev = s
      }
      expect(passes / 60).toBeLessThan(3)
      expect(passes).toBe(Math.ceil(60 / timing.period))
    }
  })

  it('is slower and dimmer with reduced motion', () => {
    expect(SCAN_TIMING_REDUCED.sweep).toBeGreaterThan(2 * SCAN_TIMING.sweep)
    expect(SCAN_TIMING_REDUCED.amp).toBeLessThan(SCAN_TIMING.amp)
  })

  it('is off before the start', () => {
    expect(scanState(-1, TOP, BOTTOM).amp).toBe(0)
    expect(scanState(Number.NaN, TOP, BOTTOM).amp).toBe(0)
  })
})
