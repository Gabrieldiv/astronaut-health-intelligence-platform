import type { Alert, RiskLevel } from '../../types/domain'

/**
 * Pure scheduling logic for the alert sounds (no timers, no audio, no DOM: unit tested).
 *
 * Alarm fatigue rules (inspired by the IEC 60601-1-8 alarm guidance, demo configuration, not an
 * official limit):
 *  - Only open (not acknowledged, not resolved) CRITICAL alerts ring, plus HIGH when the user opts in.
 *  - A new alert rings at once. While it stays open the sound repeats at a calm interval, and it
 *    stops as soon as the alert is acknowledged or resolved.
 *  - A CRITICAL alert still open after a while (or escalated by the engine) switches to a more
 *    urgent sound that repeats more often.
 *  - One sound for all open alerts: the most urgent one decides the sound and the interval, so
 *    five open alerts never make five sounds.
 *  - Never two sounds closer than a minimum gap.
 *  - Alerts created before the page loaded or before the scenario (re)started are replayed
 *    simulated history: they never ring.
 *
 * Times: `nowReal` is real wall time in ms (what a person hears), `simNow` and `createdAt` are
 * simulation time. The sim can run thousands of times faster than real time, so every repeat
 * and escalation interval below is real time.
 */

export type Earcon = 'HIGH' | 'CRITICAL' | 'CRITICAL_ESCALATED'

const EARCON_RANK: Record<Earcon, number> = { HIGH: 0, CRITICAL: 1, CRITICAL_ESCALATED: 2 }

export interface AlarmPolicy {
  includeHigh: boolean
  /** Repeat interval while the most urgent open alert is CRITICAL. */
  repeatCriticalMs: number
  /** Repeat interval once that CRITICAL alert is escalated. */
  repeatEscalatedMs: number
  /** Repeat interval when only HIGH alerts are open. */
  repeatHighMs: number
  /** Real time a CRITICAL alert may stay unacknowledged before the sound escalates. */
  escalateAfterMs: number
  /** Minimum real time between two sounds. */
  minGapMs: number
}

/** Demo configuration, not an official limit. */
export const DEFAULT_ALARM_POLICY: AlarmPolicy = {
  includeHigh: false,
  repeatCriticalMs: 30_000,
  repeatEscalatedMs: 15_000,
  repeatHighMs: 120_000,
  escalateAfterMs: 120_000,
  minGapMs: 3_000,
}

export interface AlarmTracker {
  /** Identity of the running scenario (changes on scenario change or restart). */
  epoch: string
  /** Sim ms. Alerts created before this are replayed history and never ring. */
  ignoreBefore: number
  /** Alert key to the real time it was first seen ringing-eligible. */
  firstHeard: Record<string, number>
  lastPlayAt: number | null
  lastEarcon: Earcon | null
  /** A new alert or an escalation is waiting for the minimum gap to pass. */
  pending: boolean
}

export interface AlarmInput {
  alerts: readonly Alert[]
  nowReal: number
  simNow: number
  epoch: string
  enabled: boolean
  policy: AlarmPolicy
}

export interface AlarmStep {
  tracker: AlarmTracker
  /** Sound to play now, or null. */
  play: Earcon | null
  /** Open alerts currently ringing (or that would ring when sound is on). */
  ringing: number
  /** Most urgent sound among the ringing alerts, or null when nothing rings. */
  level: Earcon | null
}

export function createTracker(epoch: string, simNow: number): AlarmTracker {
  return { epoch, ignoreBefore: simNow, firstHeard: {}, lastPlayAt: null, lastEarcon: null, pending: false }
}

export const alertKey = (a: Pick<Alert, 'id' | 'createdAt'>) => `${a.id}@${a.createdAt}`

export const isOpen = (a: Alert) => a.acknowledgedAt == null && a.resolvedAt == null

/** Open alerts of the given severities created at or after `ignoreBefore` (sim ms). */
export function liveAlerts(alerts: readonly Alert[], ignoreBefore: number, severities: readonly RiskLevel[]): Alert[] {
  return alerts.filter((a) => isOpen(a) && severities.includes(a.severity) && a.createdAt >= ignoreBefore)
}

export function earconFor(a: Alert, heardForMs: number, policy: AlarmPolicy): Earcon {
  if (a.severity !== 'CRITICAL') return 'HIGH'
  return (a.escalationLevel ?? 0) > 0 || heardForMs >= policy.escalateAfterMs ? 'CRITICAL_ESCALATED' : 'CRITICAL'
}

export function repeatMs(e: Earcon, policy: AlarmPolicy): number {
  return e === 'CRITICAL_ESCALATED' ? policy.repeatEscalatedMs : e === 'CRITICAL' ? policy.repeatCriticalMs : policy.repeatHighMs
}

/** One scheduling step. Call it on every alert change and on a steady real-time interval (about 1 s). */
export function stepAlarm(prev: AlarmTracker, input: AlarmInput): AlarmStep {
  const { nowReal, policy } = input
  // A new or restarted scenario replays its own history: start over and ignore what is already there.
  const base = prev.epoch === input.epoch ? prev : createTracker(input.epoch, input.simNow)
  const severities: RiskLevel[] = policy.includeHigh ? ['CRITICAL', 'HIGH'] : ['CRITICAL']
  const eligible = liveAlerts(input.alerts, base.ignoreBefore, severities)

  const firstHeard: Record<string, number> = {}
  let hasNew = false
  for (const a of eligible) {
    const k = alertKey(a)
    const seen = base.firstHeard[k]
    if (seen == null) hasNew = true
    firstHeard[k] = seen ?? nowReal
  }

  let level: Earcon | null = null
  for (const a of eligible) {
    const e = earconFor(a, nowReal - firstHeard[alertKey(a)]!, policy)
    if (level == null || EARCON_RANK[e] > EARCON_RANK[level]) level = e
  }

  const tracker: AlarmTracker = { ...base, firstHeard }
  if (level == null) return { tracker: { ...tracker, pending: false, lastEarcon: null }, play: null, ringing: 0, level: null }
  if (!input.enabled) return { tracker: { ...tracker, pending: false }, play: null, ringing: eligible.length, level }

  const escalated = tracker.lastEarcon != null && EARCON_RANK[level] > EARCON_RANK[tracker.lastEarcon]
  const intervalDue = tracker.lastPlayAt == null || nowReal - tracker.lastPlayAt >= repeatMs(level, policy)
  const due = hasNew || escalated || tracker.pending || intervalDue
  if (!due) return { tracker, play: null, ringing: eligible.length, level }
  const gapOk = tracker.lastPlayAt == null || nowReal - tracker.lastPlayAt >= policy.minGapMs
  if (!gapOk) return { tracker: { ...tracker, pending: true }, play: null, ringing: eligible.length, level }
  return { tracker: { ...tracker, lastPlayAt: nowReal, lastEarcon: level, pending: false }, play: level, ringing: eligible.length, level }
}

/**
 * New alerts for announcements (aria-live and speech): open alerts of the given severities that
 * were not in `known` and are not replayed history. Returns them most urgent first, and the
 * updated set of known keys.
 */
export function freshAlerts(
  known: ReadonlySet<string>,
  alerts: readonly Alert[],
  ignoreBefore: number,
  severities: readonly RiskLevel[],
): { fresh: Alert[]; known: Set<string> } {
  const next = new Set<string>()
  const fresh: Alert[] = []
  for (const a of liveAlerts(alerts, ignoreBefore, severities)) {
    const k = alertKey(a)
    next.add(k)
    if (!known.has(k)) fresh.push(a)
  }
  const rank = (s: RiskLevel) => (s === 'CRITICAL' ? 3 : s === 'HIGH' ? 2 : s === 'MODERATE' ? 1 : 0)
  fresh.sort((a, b) => rank(b.severity) - rank(a.severity) || b.createdAt - a.createdAt)
  return { fresh, known: next }
}
