/**
 * Body scan timing: a bright band of light sweeps the body from head to feet, then rests, on a
 * fixed cycle. It is drawn by the shared tissue shader (uReveal, uScanAmp), so it costs no draw
 * call and no extra pass: only these two uniforms change per frame.
 *
 * Safety: any point of the body is crossed once per cycle (far below 3 flashes per second), the
 * band fades in and out instead of popping, and with prefers-reduced-motion the sweep is slow and
 * dim.
 */

export interface ScanTiming {
  /** Seconds between the starts of two sweeps. */
  period: number
  /** Seconds one sweep takes from head to feet. */
  sweep: number
  /** Peak strength of the band (1 = full). */
  amp: number
}

export const SCAN_TIMING: ScanTiming = { period: 6.5, sweep: 2.4, amp: 1 }
/** prefers-reduced-motion: a slow, dim sweep with a long rest. */
export const SCAN_TIMING_REDUCED: ScanTiming = { period: 18, sweep: 8, amp: 0.4 }

/** Scan line height far away from the body: the band is off. */
export const SCAN_OFF_Y = -100

export interface ScanState {
  /** World height of the scan line. */
  y: number
  /** Band strength, 0 while resting. */
  amp: number
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Scan line at `t` seconds since the first geometry appeared (the first sweep starts at once).
 * `top` and `bottom` are the body bounds on the vertical axis.
 */
export function scanState(t: number, top: number, bottom: number, timing: ScanTiming = SCAN_TIMING): ScanState {
  if (!(t >= 0)) return { y: SCAN_OFF_Y, amp: 0 }
  const p = (t % timing.period) / timing.sweep
  if (p >= 1) return { y: SCAN_OFF_Y, amp: 0 }
  // ease in and out: the band slows at the head and the feet, like a scanner head turning round
  const e = 0.5 - 0.5 * Math.cos(Math.PI * p)
  const margin = 0.04
  const y = top + margin - (top - bottom + 2 * margin) * e
  const amp = timing.amp * smooth(0, 0.07, p) * (1 - smooth(0.86, 1, p))
  return { y, amp }
}
