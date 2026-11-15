/**
 * Exam assessment: each measure of an in-flight session is compared with the person's own
 * pre-flight baseline (same eye or ear). Rules (see EXAMS in config.ts for the sources):
 *
 * | Rule       | Measure                         | Watch (MODERATE)                          | Warning (HIGH)                    |
 * |------------|---------------------------------|-------------------------------------------|-----------------------------------|
 * | R-SANS-01  | Retinal thickness (OCT)         | > +19.4 µm, published variability [S1]    | 2+ eye measures flagged together  |
 * |            | Choroidal folds (OCT)           | new since the baseline                    | (demo configuration)              |
 * |            | Optic nerve sheath (ultrasound) | >= +0.5 mm (demo configuration)           |                                   |
 * |            | Visual acuity                   | >= +0.1 logMAR (demo configuration)       |                                   |
 * | R-HEAR-01  | Hearing threshold, high pitch   | shift > 10 dB, HSRB metric [S2]           | shift >= 30 dB [S2]               |
 * |            | Hearing threshold, low pitch    | shift > 10 dB (same criterion, demo)      | shift >= 30 dB                    |
 * | R-NOISE-01 | Noise exposure, work period     | > 72 dBA LEQ 16 h, ISS flight rule [S2]   |                                   |
 * |            | Daily noise dose                |                                           | > 100%, NASA-STD-3001 V2 6115 [S3]|
 *
 * Missing data is never normal: no baseline, or no value, gives NO_DATA with a plain reason.
 * Nothing here is a diagnosis: a flag means "review with the flight surgeon".
 */
import type { ExamMeasureResult, HealthObservation, Laterality, MetricCode, Status } from '../../types/domain'
import { worstStatus } from '../../lib/status'
import { EXAMS } from '../config'

const EPS = 1e-9

export const EXAM_RULE_TITLES: Record<string, string> = {
  'R-SANS-01': 'Eye exam changed from pre-flight baseline',
  'R-HEAR-01': 'Hearing test changed from pre-flight baseline',
  'R-NOISE-01': 'Noise exposure above the reference level',
}

const sideWord = (l: Laterality) => (l === 'RIGHT' ? 'right' : l === 'LEFT' ? 'left' : 'both')
const signed = (v: number, decimals: number) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(decimals)}`

/** Status and plain note of one measure versus its baseline. */
export function assessMeasure(metric: MetricCode, laterality: Laterality, value: number | null, baseline: number | null): ExamMeasureResult {
  const base = { metric, laterality, value, baseline, change: null as number | null }
  const eye = `${sideWord(laterality)} ${metric === 'HEARING_THRESHOLD_HIGH' || metric === 'HEARING_THRESHOLD_LOW' ? 'ear' : 'eye'}`
  if (value === null) return { ...base, status: 'NO_DATA', note: `No value recorded for the ${eye}. Missing data is never treated as normal.`, ruleId: null }
  if (baseline === null) return { ...base, status: 'NO_DATA', note: `No pre-flight baseline on file for the ${eye}, so the change cannot be judged.`, ruleId: null }
  const change = Math.round((value - baseline) * 1000) / 1000
  const r = { ...base, change }
  switch (metric) {
    case 'RETINAL_THICKNESS': {
      const lim = EXAMS.eyes.retinalThicknessChangeUm
      if (change > lim + EPS) return { ...r, status: 'MODERATE', note: `${signed(change, 0)} µm versus before flight (${eye}): more than the usual test to test variation of ${lim} µm`, ruleId: 'R-SANS-01' }
      return { ...r, status: 'LOW', note: `${signed(change, 0)} µm versus before flight (${eye}): within the usual test to test variation`, ruleId: null }
    }
    case 'CHOROIDAL_FOLDS':
      if (value >= 1 && baseline < 1) return { ...r, status: 'MODERATE', note: `New folds at the back of the ${eye} since before flight`, ruleId: 'R-SANS-01' }
      if (value >= 1) return { ...r, status: 'LOW', note: `Folds already present before flight in the ${eye}, unchanged`, ruleId: null }
      return { ...r, status: 'LOW', note: `No folds seen in the ${eye}`, ruleId: null }
    case 'OPTIC_NERVE_SHEATH_DIAMETER': {
      const lim = EXAMS.eyes.onsdChangeMm
      if (change >= lim - EPS) return { ...r, status: 'MODERATE', note: `${signed(change, 2)} mm versus before flight (${eye}): wider than the demo change level of ${lim} mm`, ruleId: 'R-SANS-01' }
      return { ...r, status: 'LOW', note: `${signed(change, 2)} mm versus before flight (${eye})`, ruleId: null }
    }
    case 'VISUAL_ACUITY': {
      const lim = EXAMS.eyes.acuityChangeLogMar
      if (change >= lim - EPS) return { ...r, status: 'MODERATE', note: `${signed(change, 2)} logMAR versus before flight (${eye}): about ${Math.round(change / 0.1)} chart line(s) less sharp`, ruleId: 'R-SANS-01' }
      return { ...r, status: 'LOW', note: `${signed(change, 2)} logMAR versus before flight (${eye})`, ruleId: null }
    }
    case 'HEARING_THRESHOLD_HIGH':
    case 'HEARING_THRESHOLD_LOW': {
      const pitch = metric === 'HEARING_THRESHOLD_HIGH' ? 'high pitch' : 'low pitch'
      if (change >= EXAMS.ears.largeShiftDb - EPS) return { ...r, status: 'HIGH', note: `${pitch} hearing ${signed(change, 0)} dB versus before flight (${eye}): a large shift`, ruleId: 'R-HEAR-01' }
      if (change > EXAMS.ears.shiftDb + EPS) return { ...r, status: 'MODERATE', note: `${pitch} hearing ${signed(change, 0)} dB versus before flight (${eye}): more than the ${EXAMS.ears.shiftDb} dB shift criterion`, ruleId: 'R-HEAR-01' }
      return { ...r, status: 'LOW', note: `${pitch} hearing ${signed(change, 0)} dB versus before flight (${eye})`, ruleId: null }
    }
    default:
      return { ...r, status: 'LOW', note: '', ruleId: null }
  }
}

/** Baseline per (metric, side): the latest pre-flight value that is not missing. */
export function baselineMap(observations: HealthObservation[]): Map<string, number> {
  const out = new Map<string, { at: string; v: number }>()
  for (const o of observations) {
    if (o.value === null || !o.exam?.is_baseline) continue
    const key = `${o.metric_code}|${o.exam.laterality}`
    const prev = out.get(key)
    if (!prev || o.measured_at >= prev.at) out.set(key, { at: o.measured_at, v: o.value })
  }
  return new Map([...out].map(([k, x]) => [k, x.v]))
}

/** Assess every observation of one in-flight session against the baseline map. */
export function assessSession(observations: HealthObservation[], baselines: Map<string, number>): ExamMeasureResult[] {
  return observations.map((o) => {
    const lat = o.exam?.laterality ?? 'BOTH'
    return assessMeasure(o.metric_code, lat, o.value, baselines.get(`${o.metric_code}|${lat}`) ?? null)
  })
}

/**
 * Session status. Eyes: several different measures flagged in the same session read Warning
 * (EXAMS.eyes.signsForHigh, demo configuration). All results missing = NO_DATA.
 */
export function sessionStatus(region: 'eyes' | 'ears', results: ExamMeasureResult[]): Status {
  if (!results.length) return 'NO_DATA'
  const worst = worstStatus(results.map((r) => r.status))
  if (region === 'eyes' && worst === 'MODERATE') {
    const flagged = new Set(results.filter((r) => r.status === 'MODERATE' || r.status === 'HIGH').map((r) => r.metric))
    if (flagged.size >= EXAMS.eyes.signsForHigh) return 'HIGH'
  }
  return worst
}

/** Noise day status: dose over the 24 hour limit = Warning, work LEQ over the flight rule = Watch. */
export function noiseStatus(leqDba: number | null, dosePct: number | null): Status {
  if (leqDba === null || dosePct === null) return 'NO_DATA'
  if (dosePct > EXAMS.noise.doseLimitPct + EPS) return 'HIGH'
  if (leqDba > EXAMS.noise.workLeqDba + EPS) return 'MODERATE'
  return 'LOW'
}
