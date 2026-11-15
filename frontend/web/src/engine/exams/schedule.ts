/**
 * Exam schedule: when each periodic exam session happens, relative to launch.
 *
 * Eyes [S1 in config.ts]: pre-flight baseline exam about 18 months before launch (OCT, acuity) and
 * eye ultrasound about 7 months before, then in-flight "Eye Weeks" on flight days 30 and 90 and
 * 30 days before return (R-30).
 * Ears: pre-flight audiometry, then on-orbit hearing assessments (OOHA) on a demo cadence
 * (EXAMS.ears, demo configuration: the sources confirm the assessment, not its cadence).
 */
import type { ExamKind, ExamRegionId, MissionPhase } from '../../types/domain'
import { EXAMS } from '../config'
import { DAY_MS, HOUR_MS } from '../text'

export interface PlannedSession {
  region: ExamRegionId
  label: string
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

/** Every session of a region for a mission of `plannedDays`, ascending. */
export function examSchedule(region: ExamRegionId, missionStart: number, plannedDays: number): PlannedSession[] {
  const out: PlannedSession[] = []
  const cfg = region === 'eyes' ? EXAMS.eyes : EXAMS.ears
  for (const p of cfg.preflight) {
    out.push({ region, label: p.label, kinds: [...p.kinds], flightDay: p.day, at: sessionTime(missionStart, p.day), isBaseline: true, phase: 'PRE_FLIGHT' })
  }
  if (region === 'eyes') {
    const days = new Set<number>(EXAMS.eyes.inflightDays.filter((d) => d < plannedDays))
    const r30 = plannedDays - EXAMS.eyes.returnMinusDays
    if (r30 > 0) days.add(r30)
    for (const d of [...days].sort((a, b) => a - b)) {
      const label = d === r30 && !EXAMS.eyes.inflightDays.includes(d) ? `Eye exam 30 days before return (FD ${d})` : `Flight day ${d} eye exam (Eye Week)`
      out.push({ region, label, kinds: [...EXAMS.eyes.inflightKinds], flightDay: d, at: sessionTime(missionStart, d), isBaseline: false, phase: 'IN_FLIGHT' })
    }
  } else {
    for (let d = EXAMS.ears.firstFlightDay; d < plannedDays; d += EXAMS.ears.everyDays) {
      out.push({ region, label: `On-orbit hearing assessment (FD ${d})`, kinds: ['AUDIOMETRY'], flightDay: d, at: sessionTime(missionStart, d), isBaseline: false, phase: 'IN_FLIGHT' })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

/** First planned session strictly after `now`, or null when none is left in the mission. */
export function nextDue(schedule: PlannedSession[], now: number): PlannedSession | null {
  for (const s of schedule) if (!s.isBaseline && s.at > now) return s
  return null
}
