/** Region configuration for the anatomy viewer: colors, layers, anchors, camera framing, key values. */
import type { AppState, BodyRegionId, ExamMeasureResult, ExamRegionState, MetricCode, Status } from '../../types/domain'
import { STATUS_META } from '../../lib/status'
import { METRIC_CATALOG } from '../../engine/catalog'
import { formatFixed, t } from '../../i18n'
import { metricShort } from '../../i18n/catalog'

export const REGIONS: BodyRegionId[] = ['brain', 'eyes', 'ears', 'heart', 'lungs', 'kidneys', 'muscles', 'bones', 'skin']

/**
 * Regions followed with periodic exams instead of a live stream. 'ears' has no atlas structure (the
 * ear is excluded for license reasons): the viewer shows a marker on the sides of the head.
 */
export const EXAM_REGION_IDS: BodyRegionId[] = ['eyes', 'ears']

export type LayerId = 'skin' | 'muscles' | 'skeleton' | 'organs' | 'vessels'
export const LAYERS: { id: LayerId; label: string }[] = [
  { id: 'skin', label: 'Skin' },
  { id: 'muscles', label: 'Muscles' },
  { id: 'skeleton', label: 'Skeleton' },
  { id: 'organs', label: 'Organs' },
  { id: 'vessels', label: 'Vessels' },
]

export const REGION_LAYER: Record<BodyRegionId, LayerId> = {
  brain: 'organs',
  heart: 'organs',
  lungs: 'organs',
  kidneys: 'organs',
  muscles: 'muscles',
  bones: 'skeleton',
  skin: 'skin',
  eyes: 'organs',
  ears: 'skin',
}

/** Healthy (LOW) hologram tints: a cool palette so any warm color reads as attention. */
export const LOW_COLORS: Record<BodyRegionId, string> = {
  skin: '#3fd3f2',
  muscles: '#2dd4bf',
  bones: '#dbe7ff',
  brain: '#a5b4fc',
  heart: '#5eead4',
  lungs: '#7dd3fc',
  kidneys: '#67e8f9',
  eyes: '#93c5fd',
  ears: '#c4b5fd',
}
export const NO_DATA_COLOR = '#64748b'

export interface StatusVisual {
  color: string
  intensity: number
  /** pulse amplitude (0 = steady) */
  pulse: number
}

export function statusVisual(region: BodyRegionId, status: Status): StatusVisual {
  if (status === 'LOW') return { color: LOW_COLORS[region], intensity: 0.78, pulse: 0 }
  if (status === 'NO_DATA') return { color: NO_DATA_COLOR, intensity: 0.5, pulse: 0 }
  const color = STATUS_META[status].color
  if (status === 'MODERATE') return { color, intensity: 1.6, pulse: 0.18 }
  if (status === 'HIGH') return { color, intensity: 2.0, pulse: 0.32 }
  return { color, intensity: 2.5, pulse: 0.6 }
}

/** Label anchor points (model space, male frame, multiplied by the body scale). */
export const ANCHORS: Record<BodyRegionId, [number, number, number]> = {
  brain: [0, 1.735, -0.01],
  heart: [0.04, 1.275, 0.07],
  lungs: [-0.11, 1.34, 0.03],
  kidneys: [0.075, 1.112, -0.06],
  muscles: [0.135, 0.7, 0.04],
  bones: [-0.1, 0.5, 0.05],
  skin: [-0.29, 1.0, 0.02],
  eyes: [0.032, 1.65, 0.08],
  ears: [0.078, 1.64, -0.005],
}

export interface Framing {
  target: [number, number, number]
  dir: [number, number, number]
  dist: number
  /** Whole body shot: distance and height are fitted to the viewport instead of `dist`. */
  full?: boolean
}

/** Body extent (male frame, meters) used to fit full body shots: floor contact to top of head. */
export const BODY_FRAME = { bottom: -0.015, top: 1.77, width: 0.8 }

export const DEFAULT_FRAMING: Framing = { target: [0, 0.93, 0], dir: [0, 0.06, 1], dist: 3.55, full: true }

export const FRAMING: Record<BodyRegionId, Framing> = {
  brain: { target: [0, 1.67, -0.01], dir: [0.6, 0.38, 1], dist: 0.78 },
  heart: { target: [0.014, 1.298, 0.04], dir: [0.38, 0.14, 1], dist: 0.82 },
  lungs: { target: [0, 1.31, 0.0], dir: [0.25, 0.12, 1], dist: 1.15 },
  kidneys: { target: [0, 1.11, -0.05], dir: [0.32, 0.18, -1], dist: 0.9 },
  muscles: { target: [0, 0.95, 0], dir: [0.5, 0.08, 1], dist: 3.2, full: true },
  bones: { target: [0, 0.93, 0], dir: [-0.45, 0.08, 1], dist: 3.3, full: true },
  skin: { target: [0, 0.95, 0], dir: [0.22, 0.05, 1], dist: 3.3, full: true },
  eyes: { target: [0, 1.64, 0.05], dir: [0.3, 0.08, 1], dist: 0.55 },
  ears: { target: [0, 1.64, 0], dir: [1, 0.12, 0.3], dist: 0.6 },
}

const PREFERRED: Record<BodyRegionId, MetricCode[]> = {
  brain: ['REACTION_TIME', 'SLEEP_DURATION', 'SLEEP_EFFICIENCY'],
  heart: ['HEART_RATE', 'HRV_RMSSD', 'SYSTOLIC_BP', 'DIASTOLIC_BP'],
  lungs: ['SPO2', 'RESPIRATORY_RATE'],
  kidneys: ['HYDRATION'],
  muscles: ['EXERCISE_LOAD', 'ACTIVITY_LEVEL'],
  bones: ['RADIATION_DOSE'],
  skin: ['SKIN_TEMPERATURE'],
  eyes: ['RETINAL_THICKNESS', 'OPTIC_NERVE_SHEATH_DIAMETER', 'VISUAL_ACUITY', 'CHOROIDAL_FOLDS'],
  ears: ['HEARING_THRESHOLD_HIGH', 'HEARING_THRESHOLD_LOW', 'NOISE_EXPOSURE', 'NOISE_DOSE'],
}

/** Key value text for a region, e.g. "HR 72 bpm". Picks the worst metric when the region is not nominal. */
export function regionValueText(s: AppState, region: BodyRegionId): string | null {
  const h = s.health[s.selectedAstronautId]
  if (!h) return null
  if (region === 'eyes' || region === 'ears') {
    const ex = h.exams?.[region]
    if (ex) return examValueText(ex)
  }
  const rs = h.regions[region]
  const fromRegion = rs?.metrics?.length ? rs.metrics : []
  const candidates = [...new Set<MetricCode>([...PREFERRED[region], ...fromRegion])]
  let best: MetricCode | null = null
  let bestRank = -2
  for (const code of candidates) {
    const m = h.metrics[code]
    if (!m) continue
    const rank = STATUS_META[m.status].rank
    if (best === null || rank > bestRank) {
      best = code
      bestRank = rank
    }
  }
  if (!best) return null
  const m = h.metrics[best]!
  const def = METRIC_CATALOG[best]
  if (m.current === null || m.status === 'NO_DATA') return t('anatomy.exam.noData', { short: metricShort(best) })
  const unit = def.unit === 'score' ? '' : def.unit.startsWith('%') ? def.unit : ` ${def.unit}`
  return `${metricShort(best)} ${formatFixed(m.current, def.decimals)}${unit}`
}

/** "+3 µm", "-0.02 logMAR", "new folds": change of one exam measure from the pre-flight baseline. */
export function examChangeText(r: ExamMeasureResult): string {
  const def = METRIC_CATALOG[r.metric]
  if (r.metric === 'CHOROIDAL_FOLDS')
    return r.value === null ? t('anatomy.exam.noValue') : r.value >= 1 ? (r.baseline !== null && r.baseline < 1 ? t('anatomy.exam.newFolds') : t('anatomy.exam.foldsUnchanged')) : t('anatomy.exam.noFolds')
  if (r.change === null) return r.baseline === null ? t('anatomy.exam.noBaseline') : t('anatomy.exam.noValue')
  const sign = r.change > 0 ? '+' : r.change < 0 ? '−' : '±' // minus sign (reads clearly next to a label)
  return `${sign}${formatFixed(Math.abs(r.change), def.decimals)} ${def.unit}`
}

/** Key text of an exam region: the most notable change of the last exam, or "No exam yet". */
export function examValueText(ex: ExamRegionState): string {
  const latest = ex.latest
  if (!latest || !latest.results.length) {
    const day = ex.noise?.[ex.noise.length - 1]
    if (day && day.status !== 'LOW') return t('anatomy.exam.noise', { value: formatFixed(day.leqDba, 1) })
    return t('anatomy.exam.noExam')
  }
  const order = PREFERRED[ex.region]
  const pick = latest.results.reduce((a, b) => {
    const ra = STATUS_META[a.status].rank
    const rb = STATUS_META[b.status].rank
    if (rb !== ra) return rb > ra ? b : a
    const oa = order.indexOf(a.metric)
    const ob = order.indexOf(b.metric)
    if (oa !== ob) return ob < oa ? b : a
    return Math.abs(b.change ?? 0) > Math.abs(a.change ?? 0) ? b : a
  })
  return `${metricShort(pick.metric)} ${examChangeText(pick)}`
}

/** Regions with no catalog metric are context only: no floating label when they lack data. */
export const HAS_METRICS: Record<BodyRegionId, boolean> = Object.fromEntries(
  REGIONS.map((r) => [r, Object.values(METRIC_CATALOG).some((m) => m.region === r)]),
) as Record<BodyRegionId, boolean>

/** Compact, render-stable key of region statuses for the selected astronaut (use as a store selector). */
export function statusKey(s: AppState): string {
  const h = s.health[s.selectedAstronautId]
  return REGIONS.map((r) => h?.regions?.[r]?.status ?? 'NO_DATA').join(',')
}

export function parseStatusKey(key: string): Record<BodyRegionId, Status> {
  const parts = key.split(',') as Status[]
  return Object.fromEntries(REGIONS.map((r, i) => [r, parts[i] ?? 'NO_DATA'])) as Record<BodyRegionId, Status>
}
