/**
 * Exam schedule: when each periodic exam session happens, relative to launch.
 *
 * Eyes [S1 in config.ts]: pre-flight baseline exam about 18 months before launch (OCT, acuity) and
 * eye ultrasound about 7 months before, then in-flight "Eye Weeks" on flight days 30 and 90 and
 * 30 days before return (R-30).
 * Ears: pre-flight audiometry, then on-orbit hearing assessments (OOHA) on a demo cadence
 * (EXAMS.ears, demo configuration: the sources confirm the assessment, not its cadence).
 */
import type { EngineMsg, ExamKind, ExamRegionId, MissionPhase } from '../../types/domain'
import { EXAMS } from '../config'
import { msg, said } from '../msg'
import { DAY_MS, HOUR_MS } from '../text'

export interface PlannedSession {
  region: ExamRegionId
  label: string
  /** Structured form of `label` for translation (engine/msg.ts). */
  labelMsg: EngineMsg
  kinds: ExamKind[]
  /** Day relative to launch (negative before launch). */
  flightDay: number
  /** Sim epoch ms. */
  at: number
  isBaseline: boolean
  phase: MissionPhase
}

/** Sim time of a session on a given flight day. */
export function sessionTime(missionStart: number, flightDay: number): number {
  return missionStart + flightDay * DAY_MS + EXAMS.sessionHourUtc * HOUR_MS
}

/** "FD 30", "L-540 d" (before launch). */
export function flightDayLabel(day: number): string {
  return day < 0 ? `L${day} d` : `FD ${day}`
}

/** Structured form of flightDayLabel. */
export function flightDayMsg(day: number): EngineMsg {
  return day < 0 ? msg('exam.ld', { n: -day }) : msg('exam.fd', { n: day })
}

/** Every session of a region for a mission of `plannedDays`, ascending. */
export function examSchedule(region: ExamRegionId, missionStart: number, plannedDays: number): PlannedSession[] {
  const out: PlannedSession[] = []
  const cfg = region === 'eyes' ? EXAMS.eyes : EXAMS.ears
  cfg.preflight.forEach((p, i) => {
    const labelMsg = msg(`exam.label.pre.${region}.${i}`)
    out.push({ region, label: said(p.label, labelMsg), labelMsg, kinds: [...p.kinds], flightDay: p.day, at: sessionTime(missionStart, p.day), isBaseline: true, phase: 'PRE_FLIGHT' })
  })
  if (region === 'eyes') {
    const days = new Set<number>(EXAMS.eyes.inflightDays.filter((d) => d < plannedDays))
    const r30 = plannedDays - EXAMS.eyes.returnMinusDays
    if (r30 > 0) days.add(r30)
    for (const d of [...days].sort((a, b) => a - b)) {
      const isR30 = d === r30 && !EXAMS.eyes.inflightDays.includes(d)
      const labelMsg = msg(isR30 ? 'exam.label.r30' : 'exam.label.eyeWeek', { n: d })
      const label = said(isR30 ? `Eye exam 30 days before return (FD ${d})` : `Flight day ${d} eye exam (Eye Week)`, labelMsg)
      out.push({ region, label, labelMsg, kinds: [...EXAMS.eyes.inflightKinds], flightDay: d, at: sessionTime(missionStart, d), isBaseline: false, phase: 'IN_FLIGHT' })
    }
  } else {
    for (let d = EXAMS.ears.firstFlightDay; d < plannedDays; d += EXAMS.ears.everyDays) {
      const labelMsg = msg('exam.label.ooha', { n: d })
      out.push({ region, label: said(`On-orbit hearing assessment (FD ${d})`, labelMsg), labelMsg, kinds: ['AUDIOMETRY'], flightDay: d, at: sessionTime(missionStart, d), isBaseline: false, phase: 'IN_FLIGHT' })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

/** First planned session strictly after `now`, or null when none is left in the mission. */
export function nextDue(schedule: PlannedSession[], now: number): PlannedSession | null {
  for (const s of schedule) if (!s.isBaseline && s.at > now) return s
  return null
}
