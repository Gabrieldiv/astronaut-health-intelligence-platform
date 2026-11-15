/**
 * Tabular CUSUM for small accumulated changes (PROJECT_MASTER 9.3).
 *
 * Input: per sample robust z against the personal baseline (already standardized), plus the
 * relative and absolute deviation for the explanation. Samples are averaged per bin (one sim
 * hour by default) so the statistic does not depend on the sampling cadence, then:
 *
 *   S_up   = min(cap, max(0, S_up   + m - k))
 *   S_down = min(cap, max(0, S_down - m - k))
 *
 * where m is the bin mean z and k the allowance. A side that reaches h signals a small but
 * steady shift: k = 0.5 means hourly means under half a robust SD never accumulate, so the
 * statistic only grows when a deviation is both small and persistent. The cap bounds how long
 * the flag takes to clear once the shift ends (cap / k bins at most).
 *
 * O(1) per sample, no allocation. Pure TypeScript, no clinical meaning.
 */
import { clamp } from './stats'

export interface CusumConfig {
  binMin: number
  k: number
  h: number
  cap: number
  zClamp: number
}

export interface CusumSide {
  /** Accumulated statistic (z units). */
  s: number
  /** Start of the current accumulation (sim ms), null when s is 0. */
  since: number | null
  /** Sum of bin mean deviations (%) and (metric units) during the current accumulation. */
  pctSum: number
  diffSum: number
  /** Bins in the current accumulation. */
  bins: number
}

const MIN_MS = 60_000

function emptySide(): CusumSide {
  return { s: 0, since: null, pctSum: 0, diffSum: 0, bins: 0 }
}

export class HourlyCusum {
  readonly cfg: CusumConfig
  readonly up: CusumSide = emptySide()
  readonly down: CusumSide = emptySide()
  private readonly binMs: number
  private bin = NaN
  private zSum = 0
  private pctSum = 0
  private diffSum = 0
  private n = 0

  constructor(cfg: CusumConfig) {
    this.cfg = cfg
    this.binMs = cfg.binMin * MIN_MS
  }

  /** Add one sample at sim time t. Closing a bin happens when the first sample of the next bin arrives. */
  add(t: number, z: number, pct: number, diff: number): void {
    const bin = Math.floor(t / this.binMs)
    if (bin !== this.bin) {
      if (this.n > 0) this.close(this.bin * this.binMs)
      this.bin = bin
      this.zSum = 0
      this.pctSum = 0
      this.diffSum = 0
      this.n = 0
    }
    this.zSum += clamp(z, -this.cfg.zClamp, this.cfg.zClamp)
    this.pctSum += pct
    this.diffSum += diff
    this.n++
  }

  private close(binStart: number): void {
    const m = this.zSum / this.n
    const pct = this.pctSum / this.n
    const diff = this.diffSum / this.n
    this.step(this.up, m - this.cfg.k, binStart, pct, diff)
    this.step(this.down, -m - this.cfg.k, binStart, pct, diff)
  }

  private step(side: CusumSide, inc: number, binStart: number, pct: number, diff: number): void {
    const next = Math.min(this.cfg.cap, Math.max(0, side.s + inc))
    if (next <= 0) {
      side.s = 0
      side.since = null
      side.pctSum = 0
      side.diffSum = 0
      side.bins = 0
      return
    }
    if (side.s === 0) side.since = binStart
    side.s = next
    side.pctSum += pct
    side.diffSum += diff
    side.bins++
  }

  /** Side in the metric's bad direction ('both': the larger one). */
  side(dir: 'up' | 'down' | 'both'): { side: CusumSide; sign: 1 | -1 } {
    if (dir === 'up') return { side: this.up, sign: 1 }
    if (dir === 'down') return { side: this.down, sign: -1 }
    return this.up.s >= this.down.s ? { side: this.up, sign: 1 } : { side: this.down, sign: -1 }
  }

  /** True when the bad side reached h and has been accumulating for at least minMs (at sim time now). */
  signal(dir: 'up' | 'down' | 'both', now: number, minMs: number): boolean {
    const { side } = this.side(dir)
    return side.s >= this.cfg.h && side.since !== null && now - side.since >= minMs
  }
}
