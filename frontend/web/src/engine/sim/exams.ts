/**
 * Exam and noise simulators (SIMULATED data only).
 *
 * Periodic exams are not a signal stream: each call returns what one exam session would measure
 * for one astronaut on one day. Values are seeded per (seed, astronaut, measure, side, day), so a
 * session always reads the same, whatever the tick rate.
 *
 * Personal "true" values are plausible orders of magnitude for adults, not reference values:
 * - peripapillary total retinal thickness (OCT) around 390 µm,
 * - optic nerve sheath diameter (ocular ultrasound) around 5.1 mm,
 * - visual acuity around -0.08 logMAR (better than 20/20 is common in astronauts),
 * - hearing thresholds 0 to 20 dB HL, rounded to the 5 dB steps of an audiometer,
 * - crew worn work period noise 64 to 68.5 dBA (ISS like order of magnitude).
 *
 * Measurement noise is bounded on purpose (clamped normal), so with no scenario a session never
 * crosses the change rules of src/engine/config.ts EXAMS. A scenario hook (SANS_PROGRESSION) adds a
 * gradual, SANS like change to one astronaut's eye exams. Everything here is SIMULATED.
 */
import type { Laterality } from '../../types/domain'
import { EXAMS } from '../config'
import { hash01, hashNormal } from '../random'
import { clamp } from '../stats'

export type Side = Exclude<Laterality, 'BOTH'>
export const SIDES: Side[] = ['RIGHT', 'LEFT']

/** Bounded standard normal: |z| <= 2.5. */
const zc = (...k: Array<string | number>) => clamp(hashNormal(...k), -2.5, 2.5)
const round = (v: number, step: number) => Math.round(v / step) * step

/** SANS like change from flight day 0: saturating curve (0 before launch, 1 far into the mission). */
export function sansProgress(flightDay: number): number {
  return flightDay <= 0 ? 0 : 1 - Math.exp(-flightDay / 70)
}

/** Size of the simulated SANS like change (SIMULATED, scenario only, not a clinical model). */
export const SANS_EFFECT = {
  /** Retinal thickness increase at full progress (right eye; the left eye gets `leftShare`). */
  retinaUm: 65,
  onsdMm: 0.9,
  leftShare: 0.85,
  /** New choroidal folds in the right eye from this flight day. */
  foldsFromDay: 60,
  /** Acuity loss (logMAR) from this flight day (hyperopic shift, simulated). */
  acuityFromDay: 80,
  acuityLogMar: 0.1,
} as const

export interface EyeReading {
  side: Side
  retinaUm: number
  folds: 0 | 1
  onsdMm: number
  acuityLogMar: number
}

export interface HearingReading {
  side: Side
  /** Threshold per frequency (Hz -> dB HL), 5 dB steps. */
  thresholds: Record<number, number>
}

export interface NoiseReading {
  workLeqDba: number
  sleepLeqDba: number
  dosePct: number
}

export class ExamSimulator {
  readonly seed: number
  /** Astronaut ids with a SANS like change (scenario hook). */
  private readonly sans: Set<string>
  private readonly ages: Map<string, number>

  constructor(seed: number, opts: { sansAstronautIds?: string[]; ages?: Record<string, number> } = {}) {
    this.seed = seed
    this.sans = new Set(opts.sansAstronautIds ?? [])
    this.ages = new Map(Object.entries(opts.ages ?? {}))
  }

  hasSansChange(id: string): boolean {
    return this.sans.has(id)
  }

  /** One eye as measured on `day` (relative to launch). */
  eye(id: string, side: Side, day: number): EyeReading {
    const s = this.seed
    const sideOff = side === 'RIGHT' ? 1 : -1
    // personal truth
    const retinaBase = 390 + 14 * zc(s, id, 'trt') + 3 * sideOff * zc(s, id, 'trt-asym')
    const onsdBase = 5.1 + 0.18 * zc(s, id, 'onsd') + 0.05 * sideOff * zc(s, id, 'onsd-asym')
    const acuityBase = -0.08 + 0.04 * zc(s, id, 'va')
    const foldsBase: 0 | 1 = hash01(s, id, side, 'folds-pre') < 0.06 ? 1 : 0
    // scenario hook (SIMULATED)
    let retina = retinaBase
    let onsd = onsdBase
    let acuity = acuityBase
    let folds = foldsBase
    if (this.sans.has(id)) {
      const k = sansProgress(day) * (side === 'RIGHT' ? 1 : SANS_EFFECT.leftShare)
      retina += SANS_EFFECT.retinaUm * k
      onsd += SANS_EFFECT.onsdMm * k
      if (side === 'RIGHT' && day >= SANS_EFFECT.foldsFromDay) folds = 1
      if (day >= SANS_EFFECT.acuityFromDay) acuity += SANS_EFFECT.acuityLogMar
    }
    // measurement (bounded noise: test to test variation)
    return {
      side,
      retinaUm: Math.round(retina + 3.5 * zc(s, id, side, day, 'trt-m')),
      folds,
      onsdMm: round(onsd + 0.08 * zc(s, id, side, day, 'onsd-m'), 0.01),
      // one letter = 0.02 logMAR; the reading moves by at most one letter
      acuityLogMar: round(acuity, 0.02) + 0.02 * Math.round(clamp(zc(s, id, side, day, 'va-m') / 1.6, -1, 1)),
    }
  }

  /** Pure tone audiometry of one ear on `day` (relative to launch). */
  ear(id: string, side: Side, day: number): HearingReading {
    const s = this.seed
    const age = this.ages.get(id) ?? 40
    const thresholds: Record<number, number> = {}
    for (const hz of [...EXAMS.ears.lowFreqsHz, ...EXAMS.ears.highFreqsHz]) {
      const high = hz >= 2000
      const truth = 7 + 4 * zc(s, id, side, hz, 'hl') + (high ? Math.max(0, age - 35) * 0.35 : 0)
      // audiometers step in 5 dB; the reading moves by at most one step from the personal truth
      const step = hash01(s, id, side, hz, day, 'hl-m')
      const jitter = step < 0.2 ? -5 : step > 0.8 ? 5 : 0
      thresholds[hz] = round(truth, 5) + jitter
    }
    return { side, thresholds }
  }

  /** Crew worn noise for the day that starts at flight day `day` (SIMULATED). */
  noise(id: string, day: number): NoiseReading {
    const s = this.seed
    const work = 66.2 + 1.5 * zc(s, id, 'noise-work') + 1.1 * zc(s, id, day, 'noise-day')
    const sleep = 54 + 1.5 * zc(s, id, 'noise-sleep') + 0.8 * zc(s, id, day, 'noise-night')
    const workLeqDba = Math.round(clamp(work, 58, 71.5) * 10) / 10
    const sleepLeqDba = Math.round(clamp(sleep, 45, 62) * 10) / 10
    return { workLeqDba, sleepLeqDba, dosePct: noiseDosePct([{ leqDba: workLeqDba, hours: EXAMS.noise.workHours }, { leqDba: sleepLeqDba, hours: EXAMS.noise.sleepHours }]) }
  }
}

/**
 * Noise dose (%) for a day made of periods at a constant level: D = 100 x sum(C_i / T_i) with
 * T_i = criterionHours / 2^((L_i - criterionDba) / exchangeDb). 85 dBA over 8 hours = 100 [S3].
 */
export function noiseDosePct(periods: { leqDba: number; hours: number }[]): number {
  const n = EXAMS.noise
  let d = 0
  for (const p of periods) {
    const allowed = n.criterionHours / 2 ** ((p.leqDba - n.criterionDba) / n.exchangeDb)
    d += p.hours / allowed
  }
  return Math.round(d * 1000) / 10
}

/** Mean of the given frequencies of one ear (dB HL). */
export function meanThreshold(r: HearingReading, freqs: readonly number[]): number {
  let sum = 0
  for (const hz of freqs) sum += r.thresholds[hz] ?? 0
  return Math.round((sum / freqs.length) * 10) / 10
}
