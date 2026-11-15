/**
 * Builds the grounded context snapshot sent with every assistant question. Pure: reads a store
 * snapshot, never writes it. Only engine outputs go in (no raw history), bounded to the API limits.
 */
import type { AppState, DataOrigin, MetricCode, MetricState, Status } from '../../types/domain'
import { COMM_PROFILES, ENV_METRICS, METRIC_CATALOG } from '../../engine/catalog'
import { missionProfile } from '../../engine/missions'
import { LIMITS, type AssistantContext, type MetricReading } from './types'

export type ContextSource = Pick<
  AppState,
  | 'crew'
  | 'health'
  | 'environment'
  | 'alerts'
  | 'recommendations'
  | 'scenarios'
  | 'clock'
  | 'commProfileId'
  | 'missionProfileId'
  | 'selectedAstronautId'
>

const CATALOG_ORDER = Object.keys(METRIC_CATALOG) as MetricCode[]
const ENV = new Set<MetricCode>(ENV_METRICS)

export function clip(s: string | null | undefined, max: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`
}

function round(v: number | null | undefined, decimals: number): number | null {
  if (v == null || !Number.isFinite(v)) return null
  const f = 10 ** decimals
  return Math.round(v * f) / f
}

export function metricReading(m: MetricState): MetricReading {
  const def = METRIC_CATALOG[m.metric]
  const ready = m.baseline?.status === 'READY'
  // A reading the engine does not trust (no data, stale) is sent as null, never as a number.
  const value = m.status === 'NO_DATA' ? null : round(m.current, def.decimals)
  return {
    code: m.metric,
    label: clip(def.label, LIMITS.short),
    value,
    unit: clip(m.unit || def.unit, LIMITS.short),
    status: m.status,
    normal_low: ready ? round(m.baseline!.low, def.decimals) : null,
    normal_high: ready ? round(m.baseline!.high, def.decimals) : null,
    baseline_ready: ready,
    trend_per_hour: round(m.trendPerHour, Math.max(1, def.decimals)),
    explanation: m.explanation ? clip(m.explanation, LIMITS.text) : null,
    quality: m.quality,
    data_origin: m.data_origin,
  }
}

function readings(metrics: Partial<Record<MetricCode, MetricState>>, include: (c: MetricCode) => boolean, max: number): MetricReading[] {
  const out: MetricReading[] = []
  for (const code of CATALOG_ORDER) {
    const m = metrics[code]
    if (m && include(code)) out.push(metricReading(m))
  }
  // Keep what matters if the list must be cut: anything not nominal first, catalog order otherwise.
  if (out.length <= max) return out
  const rank = (r: MetricReading) => (r.status === 'LOW' ? 1 : 0)
  return [...out].sort((a, b) => rank(a) - rank(b)).slice(0, max)
}

/** SIMULATED as soon as any reading is simulated: the answer must say so. */
function overallOrigin(lists: MetricReading[][]): DataOrigin {
  const all = lists.flat()
  if (all.length === 0 || all.some((r) => r.data_origin === 'SIMULATED')) return 'SIMULATED'
  return all[0]!.data_origin
}

export function buildAssistantContext(s: ContextSource): AssistantContext {
  const astro = s.crew.find((c) => c.id === s.selectedAstronautId) ?? s.crew[0]
  if (!astro) throw new Error('No crew member to describe')
  const health = s.health[astro.id]
  const now = s.clock.simNow

  const metrics = health ? readings(health.metrics, (c) => !ENV.has(c), LIMITS.metrics) : []
  const cabinMetrics = readings(s.environment.metrics, (c) => ENV.has(c), LIMITS.cabinMetrics)

  const openAlerts = s.alerts
    .filter((a) => a.acknowledgedAt == null && a.resolvedAt == null && (a.astronautId === astro.id || a.astronautId === null))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, LIMITS.alerts)
    .map((a) => ({
      severity: a.severity as Status,
      title: clip(a.title, LIMITS.text),
      detail: clip(a.detail, LIMITS.text),
      metric: a.metric,
      minutes_open: Math.max(0, Math.round((now - a.createdAt) / 60000)),
      escalated: (a.escalationLevel ?? 0) > 0,
    }))

  const recommendations = s.recommendations
    .filter((r) => r.astronautId === astro.id && r.status === 'PENDING' && r.active !== false)
    .slice(0, LIMITS.recommendations)
    .map((r) => ({
      title: clip(r.title, LIMITS.text),
      rationale: clip(r.rationale, LIMITS.text),
      priority: r.priority as Status,
      audience: r.audience,
      autonomy: r.autonomy ?? null,
      requires_human_review: r.requiresHumanReview,
    }))

  const profile = missionProfile(s.missionProfileId)
  const comm = COMM_PROFILES.find((c) => c.id === s.commProfileId)
  const scenario = s.scenarios.find((x) => x.id === s.clock.scenarioId)
  const risk = health?.risk

  return {
    schema_version: '1',
    data_origin: overallOrigin([metrics, cabinMetrics]),
    sim_time_utc: Number.isFinite(now) ? new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z') : '',
    astronaut: { id: clip(astro.id, LIMITS.short), callsign: clip(astro.callsign, LIMITS.short), role: clip(astro.role, LIMITS.short) },
    overall: {
      status: risk ? risk.risk_level : 'NO_DATA',
      risk_score: risk ? Math.round(risk.risk_score) : null,
      headline: clip(risk?.headline, LIMITS.text),
      confidence: risk ? round(risk.confidence, 2) : null,
      contributing_factors: (risk?.contributing_factors ?? []).slice(0, LIMITS.factors).map((f) => clip(f.label, LIMITS.text)),
      limitations: (risk?.limitations ?? []).slice(0, LIMITS.factors).map((l) => clip(l, LIMITS.text)),
    },
    metrics,
    open_alerts: openAlerts,
    recommendations,
    mission: {
      profile: clip(profile.label, LIMITS.short),
      vehicle: clip(profile.vehicle, LIMITS.short),
      mission_day: astro.missionDay ?? null,
      scenario: clip(scenario?.name, LIMITS.short),
      earth_link: clip(comm?.label, LIMITS.short),
      one_way_delay_seconds: comm ? comm.oneWayDelaySec : null,
    },
    cabin: { status: s.environment.status, headline: clip(s.environment.headline, LIMITS.text), metrics: cabinMetrics },
    crew_overview: s.crew.slice(0, LIMITS.crew).map((c) => ({ callsign: c.callsign, status: s.health[c.id]?.risk.risk_level ?? 'NO_DATA' })),
  }
}
