import type { Device, MetricCode, MetricState } from '../../types/domain'

/**
 * Where the data of one metric stands, from the person's point of view:
 * - LIVE: a current reading.
 * - PAUSED: no reading because an operator paused the device that feeds it (a decision, not a fault).
 * - WAITING: the device that feeds it is online (for example just resumed) but no reading arrived yet.
 * - LOST: no reading and no healthy device behind it (the usual missing data case).
 * Missing data is never read as normal: only LIVE carries a value.
 */
export type FeedState = 'LIVE' | 'PAUSED' | 'WAITING' | 'LOST'

/** Devices that feed `metric` for this subject (an astronaut id, or "CABIN" for cabin devices). */
export function feedingDevices(devices: Device[], subjectId: string, metric: MetricCode): Device[] {
  return devices.filter((d) => d.metrics.includes(metric) && (d.assignedTo === subjectId || d.assignedTo == null))
}

export function metricFeedState(ms: MetricState | undefined, devices: Device[], subjectId: string, metric: MetricCode): FeedState {
  if (ms && ms.current != null && ms.status !== 'NO_DATA') return 'LIVE'
  const feeding = feedingDevices(devices, subjectId, metric)
  if (feeding.some((d) => d.state === 'PAUSED')) return 'PAUSED'
  if (feeding.some((d) => d.state === 'ONLINE')) return 'WAITING'
  return 'LOST'
}

/** The paused devices that feed any of these metrics (for the inline Resume button). */
export function pausedFeeders(devices: Device[], subjectId: string, metrics: MetricCode[]): Device[] {
  const wanted = new Set(metrics)
  return devices.filter((d) => d.state === 'PAUSED' && (d.assignedTo === subjectId || d.assignedTo == null) && d.metrics.some((m) => wanted.has(m)))
}
