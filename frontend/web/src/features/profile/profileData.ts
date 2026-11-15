/**
 * Pure helpers behind the crew profile: grouping the personal baselines by domain, the band
 * position of the current value, the plain language check-in, the dose versus the NASA career
 * limit and the recent events of one astronaut. Missing data stays missing: a reading without a
 * current value is NO_DATA (never normal) and a missing dose or check-in is null (never zero).
 */
import type { Alert, Astronaut, AuditEvent, CheckIn, Device, Intervention, MetricCode, MetricState, MissionDaySummary, MissionProfileId, RiskLevel, Status } from '../../types/domain'
import { EXAM_METRICS } from '../../engine/exams'
import { missionDoseExposure, type MissionDoseExposure } from '../../engine/missions'
import { gaugeScale } from '../../components/viz/scale'
import { RISK_ORDER } from '../../lib/status'
import { t, tOr, type MessageKey } from '../../i18n'
import { alertTitle } from '../../i18n/engineText'
import { INTERVENTION_LABEL } from '../timeline/labels'
import { DEVICE_STATE_META } from '../vitals/deviceMeta'

// ---------------------------------------------------------------------------
// Baselines by domain
// ---------------------------------------------------------------------------

export type ProfileDomainId = 'heart' | 'breathing' | 'sleep' | 'activity' | 'mind' | 'environment'

/** Display order of the domains and the metrics of each (exam measures live in their own section). */
export const PROFILE_DOMAINS: { id: ProfileDomainId; metrics: MetricCode[] }[] = [
  { id: 'heart', metrics: ['HEART_RATE', 'HRV_RMSSD', 'SYSTOLIC_BP', 'DIASTOLIC_BP'] },
  { id: 'breathing', metrics: ['SPO2', 'RESPIRATORY_RATE'] },
  { id: 'sleep', metrics: ['SLEEP_DURATION', 'SLEEP_EFFICIENCY', 'HYDRATION', 'SKIN_TEMPERATURE'] },
  { id: 'activity', metrics: ['ACTIVITY_LEVEL', 'EXERCISE_LOAD'] },
  { id: 'mind', metrics: ['REACTION_TIME', 'MOOD', 'PERCEIVED_FATIGUE', 'STRESS'] },
  { id: 'environment', metrics: ['RADIATION_DOSE', 'RADIATION_DOSE_RATE', 'CO2', 'CABIN_TEMPERATURE', 'RELATIVE_HUMIDITY'] },
]

/** Domain of a metric, null for exam measures (own section) and anything unknown. */
export function domainOf(metric: MetricCode): ProfileDomainId | null {
  return PROFILE_DOMAINS.find((d) => d.metrics.includes(metric))?.id ?? null
}

export type BandSide = 'below' | 'within' | 'above'

export interface BaselineRow {
  metric: MetricCode
  /** NO_DATA when there is no current value, whatever the last status was. */
  status: Status
  current: number | null
  /** True when the personal band is learned (baseline READY). */
  hasBand: boolean
  low: number | null
  high: number | null
  median: number | null
  /** Readings behind the baseline (the engine's sample count), null without a baseline. */
  readings: number | null
  /** English window description from the engine, for the details text. */
  windowLabel: string | null
  /** Marker position 0..1 on the gauge track, null without a value or a band. */
  marker: number | null
  side: BandSide | null
}

/** One baseline row from the engine metric state. Only real engine fields are read. */
export function baselineRow(ms: MetricState): BaselineRow {
  const b = ms.baseline
  const ready = b != null && b.status === 'READY'
  const current = ms.current != null && Number.isFinite(ms.current) ? ms.current : null
  const g = ready ? gaugeScale(current, b.low, b.high) : null
  return {
    metric: ms.metric,
    status: current == null ? 'NO_DATA' : ms.status,
    current,
    hasBand: ready,
    low: ready ? b.low : null,
    high: ready ? b.high : null,
    median: ready ? b.median : null,
    readings: b ? b.n : null,
    windowLabel: ready ? b.windowLabel : null,
    marker: g?.marker ?? null,
    side: g?.side ?? null,
  }
}

export interface DomainGroup {
  id: ProfileDomainId
  rows: BaselineRow[]
}

/** Baseline rows grouped by domain, in display order. Empty domains are left out. */
export function groupBaselines(metrics: Partial<Record<MetricCode, MetricState>> | undefined): DomainGroup[] {
  if (!metrics) return []
  const out: DomainGroup[] = []
  for (const d of PROFILE_DOMAINS) {
    const rows = d.metrics.flatMap((m) => {
      const ms = metrics[m]
      return ms && !EXAM_METRICS.includes(m) ? [baselineRow(ms)] : []
    })
    if (rows.length > 0) out.push({ id: d.id, rows })
  }
  return out
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

const isOpenAlert = (a: Alert) => a.acknowledgedAt == null && a.resolvedAt == null

/** Open (not acknowledged, not resolved) alerts of one astronaut. */
export function openAlertCount(alerts: Alert[], astronautId: string): number {
  return alerts.filter((a) => a.astronautId === astronautId && isOpenAlert(a)).length
}

// ---------------------------------------------------------------------------
// Check-in in plain language
// ---------------------------------------------------------------------------

export type CheckInKey = 'mood' | 'fatigue' | 'stress' | 'sleepQuality'

export interface CheckInRow {
  key: CheckInKey
  label: string
  /** 1..5 answer. */
  value: number
  /** Plain word of the answer ("Slightly tired"). */
  word: string
}

const clampAnswer = (v: number) => Math.min(5, Math.max(1, Math.round(v)))

/** The four self reported answers of a check-in with their plain words. */
export function checkInRows(c: CheckIn): CheckInRow[] {
  const keys: CheckInKey[] = ['mood', 'fatigue', 'stress', 'sleepQuality']
  return keys.map((key) => {
    const value = clampAnswer(c[key])
    return { key, label: t(`checkin.${key}.short` as MessageKey), value, word: t(`checkin.${key}.${value}` as MessageKey) }
  })
}

/** Symptom tags in the current language ("none" entries dropped). */
export function symptomWords(symptoms: string[]): string[] {
  return symptoms.filter((s) => s !== 'none').map((s) => tOr(`checkin.symptomInline.${s.replace(/ /g, '_')}`, s))
}

/** Newest check-in of one astronaut that is not in the simulated future, null when there is none. */
export function latestCheckIn(list: CheckIn[], astronautId: string, now: number): CheckIn | null {
  let best: CheckIn | null = null
  for (const c of list) {
    if (c.astronautId !== astronautId || c.at > now) continue
    if (!best || c.at > best.at) best = c
  }
  return best
}

// ---------------------------------------------------------------------------
// Radiation
// ---------------------------------------------------------------------------

/**
 * Mission dose of one astronaut versus the NASA career limit. The current dosimeter value wins;
 * the last mission day summary is the fallback. null (never zero) when neither exists.
 */
export function doseFor(profileId: MissionProfileId, current: number | null | undefined, days: MissionDaySummary[] | undefined): MissionDoseExposure | null {
  const dose = current ?? days?.at(-1)?.cumulativeDoseMgy ?? null
  return dose == null || !Number.isFinite(dose) ? null : missionDoseExposure(profileId, dose)
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

/** Devices worn by one astronaut, the ones needing attention first. */
export function profileDevices(devices: Device[], astronautId: string): Device[] {
  return devices
    .filter((d) => d.assignedTo === astronautId)
    .sort((a, b) => DEVICE_STATE_META[b.state].rank - DEVICE_STATE_META[a.state].rank || a.name.localeCompare(b.name))
}

// ---------------------------------------------------------------------------
// Recent events
// ---------------------------------------------------------------------------

export interface ProfileEvent {
  id: string
  at: number
  kind: 'alert' | 'action' | 'audit'
  severity: RiskLevel | null
  title: string
  detail: string | null
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** True when an audit line names the astronaut (callsign or pseudonymized id). Audit events carry no id field. */
export function auditMentions(a: AuditEvent, astronaut: Pick<Astronaut, 'id' | 'callsign'>): boolean {
  return new RegExp(`\\b(${escapeRe(astronaut.callsign)}|${escapeRe(astronaut.id)})\\b`, 'i').test(a.detail)
}

/** Last alerts, logged actions and audit lines of one astronaut, newest first. */
export function recentEvents(input: { astronaut: Pick<Astronaut, 'id' | 'callsign'>; alerts: Alert[]; interventions: Intervention[]; audit: AuditEvent[]; limit?: number }): ProfileEvent[] {
  const { astronaut, alerts, interventions, audit, limit = 6 } = input
  const out: ProfileEvent[] = []
  for (const a of alerts) {
    if (a.astronautId !== astronaut.id) continue
    out.push({ id: `alert-${a.id}`, at: a.createdAt, kind: 'alert', severity: a.severity, title: alertTitle(a), detail: null })
  }
  for (const i of interventions) {
    if (i.astronautId !== astronaut.id) continue
    out.push({ id: `action-${i.id}`, at: i.loggedAt, kind: 'action', severity: null, title: INTERVENTION_LABEL[i.kind], detail: i.note || null })
  }
  for (const a of audit) {
    if (a.action === 'RULE_EVALUATED' || !auditMentions(a, astronaut)) continue
    out.push({ id: `audit-${a.id}`, at: a.at, kind: 'audit', severity: null, title: t(`alerts.audit.${a.action}`), detail: a.detail || null })
  }
  return out.sort((x, y) => y.at - x.at || RISK_ORDER.indexOf(y.severity ?? 'LOW') - RISK_ORDER.indexOf(x.severity ?? 'LOW')).slice(0, limit)
}
