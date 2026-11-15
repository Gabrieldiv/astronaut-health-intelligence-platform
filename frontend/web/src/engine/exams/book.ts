/**
 * ExamBook: the periodic exam follow up of the whole crew (eyes and ears).
 *
 * Every planned session (pre-flight baseline and in-flight) is simulated once, up front, as
 * canonical HealthObservation records with an exam context (data_origin SIMULATED). A session is
 * only visible once the sim clock has reached its time, so "next exam due" is real and an exam
 * not yet done reads "no exam yet" (NO_DATA), never normal.
 *
 * The engine asks for: the region state (history, latest, next due), rule hits (alerts, risk
 * factors) and one MetricState per exam measure (so the 3D chips and the region detail show the
 * latest exam value next to the streamed metrics).
 */
import type {
  Astronaut,
  EngineMsg,
  EngineParam,
  ExamKind,
  ExamRegionId,
  ExamRegionState,
  ExamSession,
  HealthObservation,
  Laterality,
  MetricCode,
  MetricState,
  NoiseDay,
  RiskLevel,
  Status,
} from '../../types/domain'
import { STATUS_META } from '../../lib/status'
import { METRIC_CATALOG } from '../catalog'
import { EXAMS } from '../config'
import type { RuleHit } from '../risk'
import { DAY_MS } from '../text'
import { msg, said } from '../msg'
import { ExamSimulator, SIDES, meanThreshold } from '../sim/exams'
import { EXAM_RULE_TITLES, assessSession, baselineMap, noiseStatus, sessionStatus } from './assess'
import { EXAM_METHOD, EXAM_METHOD_MSG } from './method'
import { examSchedule, flightDayLabel, flightDayMsg, nextDue, type PlannedSession } from './schedule'

export const EYE_METRICS: MetricCode[] = ['RETINAL_THICKNESS', 'CHOROIDAL_FOLDS', 'OPTIC_NERVE_SHEATH_DIAMETER', 'VISUAL_ACUITY']
export const EAR_METRICS: MetricCode[] = ['HEARING_THRESHOLD_HIGH', 'HEARING_THRESHOLD_LOW', 'NOISE_EXPOSURE', 'NOISE_DOSE']
export const EXAM_METRICS: MetricCode[] = [...EYE_METRICS, ...EAR_METRICS]
export const EXAM_REGIONS: ExamRegionId[] = ['eyes', 'ears']

/** Simulated exam devices (one id per exam kind). */
export const EXAM_DEVICE: Record<ExamKind, { id: string; name: string }> = {
  OCT: { id: 'SIM-OCT', name: 'Optical coherence tomography (OCT) eye scanner' },
  OCULAR_ULTRASOUND: { id: 'SIM-ULTRASOUND', name: 'Ocular ultrasound' },
  VISUAL_ACUITY: { id: 'SIM-ACUITY', name: 'Visual acuity chart' },
  AUDIOMETRY: { id: 'SIM-AUDIOMETER', name: 'On-orbit hearing assessment (audiometer)' },
  NOISE_DOSIMETRY: { id: 'SIM-ACOUSTIC-DOSIMETER', name: 'Crew worn acoustic dosimeter' },
}

export interface ExamBookOptions {
  seed: number
  crew: Astronaut[]
  missionId: string
  /** Sim epoch ms of launch (flight day 0, 00:00 UTC). */
  missionStart: number
  plannedDays: number
  /** Astronauts whose simulated eye exams follow a SANS like change (scenario hook). */
  sansAstronautIds?: string[]
}

type Sessions = Record<ExamRegionId, ExamSession[]>

const iso = (t: number) => new Date(t).toISOString()
const isFlag = (s: Status) => s === 'MODERATE' || s === 'HIGH' || s === 'CRITICAL'

export class ExamBook {
  readonly sim: ExamSimulator
  private readonly opts: ExamBookOptions
  private readonly schedules: Record<ExamRegionId, PlannedSession[]>
  private readonly sessions = new Map<string, Sessions>()
  private readonly noiseDays = new Map<string, NoiseDay>()
  private readonly cache = new Map<string, { key: string; state: ExamRegionState }>()

  constructor(opts: ExamBookOptions) {
    this.opts = opts
    this.sim = new ExamSimulator(opts.seed, { sansAstronautIds: opts.sansAstronautIds, ages: Object.fromEntries(opts.crew.map((a) => [a.id, a.age])) })
    this.schedules = {
      eyes: examSchedule('eyes', opts.missionStart, opts.plannedDays),
      ears: examSchedule('ears', opts.missionStart, opts.plannedDays),
    }
    for (const a of opts.crew) this.sessions.set(a.id, { eyes: this.build(a.id, 'eyes'), ears: this.build(a.id, 'ears') })
  }

  schedule(region: ExamRegionId): PlannedSession[] {
    return this.schedules[region]
  }

  // -------------------------------------------------------------------------
  // Simulation of the planned sessions
  // -------------------------------------------------------------------------

  private obs(id: string, ps: PlannedSession, examId: string, kind: ExamKind, metric: MetricCode, laterality: Laterality, value: number | null, metadata: Record<string, unknown> = {}): HealthObservation {
    return {
      observation_id: `${examId}-${metric}-${laterality}`,
      subject_id: id,
      mission_id: this.opts.missionId,
      device_id: EXAM_DEVICE[kind].id,
      metric_code: metric,
      value,
      unit: METRIC_CATALOG[metric].unit,
      measured_at: iso(ps.at),
      received_at: iso(ps.at),
      data_origin: 'SIMULATED',
      source_reference: { repository: null, dataset_accession: null, file_name: null, record_reference: null },
      quality: { status: value === null ? 'MISSING' : 'VALID', confidence: value === null ? 0 : 1, is_estimated: false },
      context: { mission_phase: ps.phase, activity: 'REST' },
      metadata: { flight_day: ps.flightDay, ...metadata },
      exam: { exam_id: examId, kind, session_label: ps.label, laterality, is_baseline: ps.isBaseline },
    }
  }

  private build(id: string, region: ExamRegionId): ExamSession[] {
    const out: ExamSession[] = []
    for (const ps of this.schedules[region]) {
      const examId = `EX-${region.toUpperCase()}-${id}-${ps.flightDay < 0 ? 'L' : 'FD'}${Math.abs(ps.flightDay)}`
      const observations: HealthObservation[] = []
      for (const side of SIDES) {
        if (region === 'eyes') {
          const r = this.sim.eye(id, side, ps.flightDay)
          if (ps.kinds.includes('OCT')) {
            observations.push(this.obs(id, ps, examId, 'OCT', 'RETINAL_THICKNESS', side, r.retinaUm, { scan: 'peripapillary total retinal thickness' }))
            observations.push(this.obs(id, ps, examId, 'OCT', 'CHOROIDAL_FOLDS', side, r.folds))
          }
          if (ps.kinds.includes('OCULAR_ULTRASOUND')) observations.push(this.obs(id, ps, examId, 'OCULAR_ULTRASOUND', 'OPTIC_NERVE_SHEATH_DIAMETER', side, r.onsdMm))
          if (ps.kinds.includes('VISUAL_ACUITY')) observations.push(this.obs(id, ps, examId, 'VISUAL_ACUITY', 'VISUAL_ACUITY', side, Math.round(r.acuityLogMar * 100) / 100, { chart: 'distance' }))
        } else {
          const r = this.sim.ear(id, side, ps.flightDay)
          const meta = { thresholds_db_hl: r.thresholds }
          observations.push(this.obs(id, ps, examId, 'AUDIOMETRY', 'HEARING_THRESHOLD_HIGH', side, meanThreshold(r, EXAMS.ears.highFreqsHz), { ...meta, frequencies_hz: [...EXAMS.ears.highFreqsHz] }))
          observations.push(this.obs(id, ps, examId, 'AUDIOMETRY', 'HEARING_THRESHOLD_LOW', side, meanThreshold(r, EXAMS.ears.lowFreqsHz), { ...meta, frequencies_hz: [...EXAMS.ears.lowFreqsHz] }))
        }
      }
      out.push({
        id: examId,
        astronautId: id,
        region,
        kinds: ps.kinds,
        label: ps.label,
        labelMsg: ps.labelMsg,
        phase: ps.phase,
        at: ps.at,
        flightDay: ps.flightDay,
        isBaseline: ps.isBaseline,
        device_id: EXAM_DEVICE[ps.kinds[0] ?? 'OCT'].id,
        data_origin: 'SIMULATED',
        observations,
        results: [],
        status: 'NO_DATA',
      })
    }
    const baselines = baselineMap(out.filter((s) => s.isBaseline).flatMap((s) => s.observations))
    return out.map((s) => {
      if (s.isBaseline) return s
      const results = assessSession(s.observations, baselines)
      return { ...s, results, status: sessionStatus(region, results) }
    })
  }

  /** Noise of the day that starts at flight day `day` (complete at the next midnight). */
  noiseDay(id: string, day: number): NoiseDay {
    const key = `${id}|${day}`
    let d = this.noiseDays.get(key)
    if (!d) {
      const r = this.sim.noise(id, day)
      d = { astronautId: id, at: this.opts.missionStart + (day + 1) * DAY_MS, flightDay: day, leqDba: r.workLeqDba, dosePct: r.dosePct, status: noiseStatus(r.workLeqDba, r.dosePct), data_origin: 'SIMULATED' }
      this.noiseDays.set(key, d)
    }
    return d
  }

  /** Completed noise days at `now` (most recent EXAMS.noise.keepDays), ascending. */
  noiseHistory(id: string, now: number): NoiseDay[] {
    const lastDay = Math.floor((now - this.opts.missionStart) / DAY_MS) - 1
    const out: NoiseDay[] = []
    for (let d = Math.max(0, lastDay - EXAMS.noise.keepDays + 1); d <= lastDay; d++) out.push(this.noiseDay(id, d))
    return out
  }

  // -------------------------------------------------------------------------
  // Queries at a sim time
  // -------------------------------------------------------------------------

  /** Every session of an astronaut and region (including future ones). Tests and debugging only. */
  allSessions(id: string, region: ExamRegionId): ExamSession[] {
    return this.sessions.get(id)?.[region] ?? []
  }

  state(id: string, region: ExamRegionId, now: number): ExamRegionState {
    const all = this.allSessions(id, region)
    const visible = all.filter((s) => s.at <= now)
    const noise = region === 'ears' ? this.noiseHistory(id, now) : undefined
    const key = `${visible.length}|${noise?.length ? noise[noise.length - 1]!.flightDay : -1}`
    const ck = `${id}|${region}`
    const hit = this.cache.get(ck)
    if (hit && hit.key === key) return hit.state
    const state = this.compute(id, region, now, visible, noise)
    this.cache.set(ck, { key, state })
    return state
  }

  private compute(id: string, region: ExamRegionId, now: number, visible: ExamSession[], noise: NoiseDay[] | undefined): ExamRegionState {
    const baselineSessions = visible.filter((s) => s.isBaseline)
    const sessions = visible.filter((s) => !s.isBaseline)
    const latest = sessions[sessions.length - 1] ?? null
    const nd = nextDue(this.schedules[region], now)
    const next = nd ? { at: nd.at, flightDay: nd.flightDay, label: nd.label, labelMsg: nd.labelMsg } : null
    const nextText = next ? ` Next: ${next.label}.` : ''
    const nextMsg: EngineParam = next ? msg('exam.next', { label: next.labelMsg }) : ''
    const what = region === 'eyes' ? 'eye exam' : 'hearing test'

    let examStatus: Status
    let examSummary: string
    let examMsg: EngineMsg
    if (!baselineSessions.length) {
      examStatus = 'NO_DATA'
      examSummary = `No pre-flight ${what} baseline on file, so in-flight results cannot be compared.`
      examMsg = msg(`exam.sum.noBaseline.${region}`)
    } else if (!latest) {
      examStatus = 'NO_DATA'
      examSummary = `No in-flight ${what} yet (pre-flight baseline on file).${nextText}`
      examMsg = msg(`exam.sum.noneYet.${region}`, { next: nextMsg })
    } else {
      examStatus = latest.status
      const flagged = latest.results.filter((r) => isFlag(r.status)).sort((a, b) => STATUS_META[b.status].rank - STATUS_META[a.status].rank)
      const when = flightDayLabel(latest.flightDay)
      const whenMsg = flightDayMsg(latest.flightDay)
      if (examStatus === 'NO_DATA') {
        examSummary = `Last ${what} (${when}) has no usable value.${nextText}`
        examMsg = msg(`exam.sum.unusable.${region}`, { when: whenMsg, next: nextMsg })
      } else if (flagged.length) {
        const more = flagged.length - 2
        examSummary = `${cap(what)} ${when}: ${flagged.slice(0, 2).map((r) => r.note).join('; ')}.${flagged.length > 2 ? ` ${more} more change(s).` : ''}`
        examMsg = msg(`exam.sum.flagged.${region}`, { when: whenMsg, notes: notesMsg(flagged.slice(0, 2)), more: flagged.length > 2 ? msg('exam.more', { n: more }) : '' })
      } else {
        examSummary = `Last ${what} (${when}): no change beyond the expected variation from your pre-flight baseline.`
        examMsg = msg(`exam.sum.ok.${region}`, { when: whenMsg })
      }
    }

    let status = examStatus
    let summary = examSummary
    let summaryMsg = examMsg
    if (noise) {
      const today = noise[noise.length - 1]
      const ns: Status = today ? today.status : 'NO_DATA'
      if (isFlag(ns)) {
        // noise above its reference level counts even when the hearing test is not due yet
        status = STATUS_META[ns].rank > STATUS_META[examStatus].rank ? ns : examStatus
        summary = `${noiseSentence(today!)} ${examSummary}`
        summaryMsg = msg('exam.sum.withNoiseFlag', { noise: msg('sent1', { a: noiseMsg(today!) }), exam: examMsg })
      } else if (today) {
        summary = `${examSummary} Noise yesterday: ${today.leqDba.toFixed(1)} dBA over the work period, ${today.dosePct.toFixed(0)}% of the daily dose.`
        summaryMsg = msg('exam.sum.withNoise', { exam: examMsg, leq: { num: today.leqDba, decimals: 1 }, pct: { num: today.dosePct, decimals: 0 } })
      }
    }
    return {
      region,
      astronautId: id,
      status,
      summary: said(summary, summaryMsg),
      summaryMsg,
      baselineSessions,
      sessions,
      latest,
      nextDue: next,
      noise,
      method: said(EXAM_METHOD[region], EXAM_METHOD_MSG[region]),
      methodMsg: EXAM_METHOD_MSG[region],
    }
  }

  /** Rule hits for the risk score, alerts and audit (one per rule at most). */
  hits(id: string, now: number): RuleHit[] {
    const out: RuleHit[] = []
    const eyes = this.state(id, 'eyes', now)
    if (eyes.latest && isFlag(eyes.latest.status)) out.push(this.sessionHit(id, eyes.latest, 'R-SANS-01'))
    const ears = this.state(id, 'ears', now)
    if (ears.latest && isFlag(ears.latest.status)) out.push(this.sessionHit(id, ears.latest, 'R-HEAR-01'))
    const day = ears.noise?.[ears.noise.length - 1]
    if (day && isFlag(day.status)) {
      out.push({
        subjectId: id,
        ruleId: 'R-NOISE-01',
        level: day.status as RiskLevel,
        metric: day.status === 'HIGH' ? 'NOISE_DOSE' : 'NOISE_EXPOSURE',
        region: 'ears',
        method: 'PERSISTENCE',
        kind: 'PHYSIO',
        label: noiseSentence(day).replace(/\.$/, ''),
        labelMsg: noiseMsg(day),
        phrase: 'Noise exposure was above its reference level yesterday',
        phraseMsg: msg('exam.noisePhrase'),
        title: EXAM_RULE_TITLES['R-NOISE-01']!,
        titleMsg: msg('ruleTitle', { title: { key: 'eng.rule.R-NOISE-01', en: EXAM_RULE_TITLES['R-NOISE-01']! } }),
      })
    }
    return out
  }

  private sessionHit(id: string, s: ExamSession, ruleId: string): RuleHit {
    const flagged = s.results.filter((r) => isFlag(r.status)).sort((a, b) => STATUS_META[b.status].rank - STATUS_META[a.status].rank)
    const eyes = s.region === 'eyes'
    return {
      subjectId: id,
      ruleId,
      level: s.status as RiskLevel,
      metric: flagged[0]?.metric ?? null,
      region: s.region,
      method: 'PERSISTENCE',
      kind: 'PHYSIO',
      label: `${eyes ? 'Eye exam' : 'Hearing test'} ${flightDayLabel(s.flightDay)} versus pre-flight baseline: ${flagged.slice(0, 3).map((r) => r.note).join('; ')}`,
      labelMsg: msg(`exam.hit.${s.region}`, { when: flightDayMsg(s.flightDay), notes: notesMsg(flagged.slice(0, 3)) }),
      phrase: eyes ? 'Your last eye exam changed from your pre-flight baseline' : 'Your last hearing test changed from your pre-flight baseline',
      phraseMsg: msg(eyes ? 'exam.eyePhrase' : 'exam.earPhrase'),
      title: EXAM_RULE_TITLES[ruleId]!,
      titleMsg: msg('ruleTitle', { title: { key: `eng.rule.${ruleId}`, en: EXAM_RULE_TITLES[ruleId]! } }),
    }
  }

  /** One MetricState per exam measure: the latest value (worst side) or NO_DATA when not measured yet. */
  metricStates(id: string, now: number): Partial<Record<MetricCode, MetricState>> {
    const out: Partial<Record<MetricCode, MetricState>> = {}
    const eyes = this.state(id, 'eyes', now)
    const ears = this.state(id, 'ears', now)
    for (const metric of EXAM_METRICS) {
      const def = METRIC_CATALOG[metric]
      const empty = (why: string, at = 0): MetricState => ({
        metric,
        current: null,
        unit: def.unit,
        status: 'NO_DATA',
        zScore: null,
        ewma: null,
        trendPerHour: null,
        baseline: null,
        lastUpdated: at,
        quality: 'MISSING',
        data_origin: 'SIMULATED',
        deviationPct: null,
        explanation: why,
        ruleId: null,
      })
      if (metric === 'NOISE_EXPOSURE' || metric === 'NOISE_DOSE') {
        const day = ears.noise?.[ears.noise.length - 1]
        if (!day) {
          out[metric] = empty('No noise reading yet.')
          continue
        }
        const v = metric === 'NOISE_EXPOSURE' ? day.leqDba : day.dosePct
        const st = metric === 'NOISE_DOSE' ? (day.dosePct > EXAMS.noise.doseLimitPct ? 'HIGH' : 'LOW') : day.leqDba > EXAMS.noise.workLeqDba ? 'MODERATE' : 'LOW'
        out[metric] = { ...empty(''), current: v, status: st, lastUpdated: day.at, quality: 'VALID', explanation: isFlag(st) ? noiseSentence(day) : null, ruleId: isFlag(st) ? 'R-NOISE-01' : null }
        continue
      }
      const st = EYE_METRICS.includes(metric) ? eyes : ears
      const session = [...st.sessions].reverse().find((s) => s.results.some((r) => r.metric === metric))
      if (!session) {
        out[metric] = empty(st.baselineSessions.length ? 'No in-flight exam yet. An exam not yet done is never read as normal.' : 'No pre-flight baseline on file.')
        continue
      }
      const rs = session.results.filter((r) => r.metric === metric)
      const pick = rs.reduce((a, b) => (STATUS_META[b.status].rank > STATUS_META[a.status].rank || (b.status === a.status && Math.abs(b.change ?? 0) > Math.abs(a.change ?? 0)) ? b : a))
      out[metric] = {
        ...empty(''),
        current: pick.value,
        status: pick.status,
        lastUpdated: session.at,
        quality: pick.value === null ? 'MISSING' : 'VALID',
        deviationPct: pick.baseline ? Math.round(((pick.change ?? 0) / Math.abs(pick.baseline)) * 1000) / 10 : null,
        explanation: isFlag(pick.status) || pick.status === 'NO_DATA' ? `${flightDayLabel(session.flightDay)}: ${pick.note}` : null,
        ruleId: pick.ruleId,
      }
    }
    return out
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Notes joined with "; " as a structured message (null notes are skipped). */
function notesMsg(results: { note: string; noteMsg?: EngineMsg }[]): EngineParam {
  const parts: EngineParam[] = results.map((r) => r.noteMsg ?? r.note)
  return parts.slice(1).reduce<EngineParam>((a, b) => msg('exam.semi', { a, b }), parts[0] ?? '')
}

/** Structured noise sentence, without the final period (same words as noiseSentence). */
function noiseMsg(d: NoiseDay): EngineMsg {
  if (d.dosePct > EXAMS.noise.doseLimitPct) return msg('exam.noise.dose', { pct: { num: d.dosePct, decimals: 0 } })
  return msg('exam.noise.leq', { leq: { num: d.leqDba, decimals: 1 }, lim: EXAMS.noise.workLeqDba })
}

function noiseSentence(d: NoiseDay): string {
  if (d.dosePct > EXAMS.noise.doseLimitPct) return `Noise dose yesterday ${d.dosePct.toFixed(0)}%, above the 24 hour limit (NASA-STD-3001 V2 6115).`
  return `Noise yesterday ${d.leqDba.toFixed(1)} dBA over the work period, above the ${EXAMS.noise.workLeqDba} dBA ISS flight rule level.`
}
