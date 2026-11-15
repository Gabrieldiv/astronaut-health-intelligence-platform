import { METRIC_CATALOG } from '../../engine/catalog'
import type { BodyRegionId, MetricCode, MetricState, Status } from '../../types/domain'

export interface IndicatorSummary {
  /** Tracked indicators, worst first: flagged, then missing, then normal ones. */
  items: { metric: MetricCode; status: Status }[]
  total: number
  /** Within the personal normal range (status LOW with data). */
  ok: number
  /** Out of the normal range (watch, act soon, urgent). */
  flagged: number
  /** No data or stale data: never counted as normal. */
  missing: number
}

/** Order of the segments: urgent first, normal last; missing data sits between flagged and normal. */
const ORDER: Record<Status, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, NO_DATA: 3, LOW: 4 }

/**
 * Summary behind the compact status visual of the stage headline. A reading without a current
 * value counts as missing even when its last status was normal: missing data is never shown as normal.
 */
export function summarizeIndicators(metrics: Partial<Record<MetricCode, MetricState>> | undefined): IndicatorSummary {
  const items: IndicatorSummary['items'] = []
  for (const m of Object.values(metrics ?? {})) {
    if (!m) continue
    const status: Status = m.current == null ? 'NO_DATA' : m.status
    items.push({ metric: m.metric, status })
  }
  // stable: same status keeps the engine order of the metrics
  items.sort((a, b) => ORDER[a.status] - ORDER[b.status])
  const ok = items.filter((i) => i.status === 'LOW').length
  const missing = items.filter((i) => i.status === 'NO_DATA').length
  return { items, total: items.length, ok, missing, flagged: items.length - ok - missing }
}

export type IndicatorGroup = { key: BodyRegionId | 'environment'; items: { metric: MetricCode; status: Status }[] }

/**
 * Groups the tracked indicators by the body system they belong to, worst group first, so the
 * count on screen ("25/25") can be traced back to what it is made of. Pure and tested.
 */
export function groupIndicators(metrics: Partial<Record<MetricCode, MetricState>> | undefined): IndicatorGroup[] {
  const summary = summarizeIndicators(metrics)
  const groups = new Map<IndicatorGroup['key'], IndicatorGroup>()
  for (const item of summary.items) {
    const key = METRIC_CATALOG[item.metric]?.region ?? 'environment'
    const g = groups.get(key) ?? { key, items: [] }
    g.items.push(item)
    groups.set(key, g)
  }
  const rank = (g: IndicatorGroup) => Math.min(...g.items.map((i) => ['CRITICAL', 'HIGH', 'MODERATE', 'NO_DATA', 'LOW'].indexOf(i.status)))
  return [...groups.values()].sort((a, b) => rank(a) - rank(b))
}
