import { CircleCheck, CircleDashed, CirclePause, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useAppStore } from '../../state/store'
import type { Device, DeviceState, MetricCode } from '../../types/domain'

/** Device state: plain label, color, icon and how much it needs attention (rank). */
export const DEVICE_STATE_META: Record<DeviceState, { label: string; color: string; icon: LucideIcon; rank: number }> = {
  ONLINE: { label: 'Online', color: '#34d399', icon: CircleCheck, rank: 0 },
  // A pause is an operator decision, not a fault: calm color, ranked under real problems.
  PAUSED: { label: 'Paused by operator', color: '#a5b4fc', icon: CirclePause, rank: 1 },
  DEGRADED: { label: 'Degraded', color: '#fbbf24', icon: TriangleAlert, rank: 2 },
  DATA_STALE: { label: 'Data stale', color: '#94a3b8', icon: CircleDashed, rank: 3 },
  OFFLINE: { label: 'Offline', color: '#94a3b8', icon: WifiOff, rank: 4 },
}

/** Devices an astronaut sees: the ones worn by them plus the shared and cabin devices. */
export function devicesFor(devices: Device[], astronautId: string): Device[] {
  return devices.filter((d) => d.assignedTo === astronautId || d.assignedTo == null)
}

/** Devices that feed at least one of `metrics` for this astronaut (personal devices first). */
export function devicesForMetrics(devices: Device[], astronautId: string, metrics: MetricCode[]): Device[] {
  const wanted = new Set(metrics)
  return devicesFor(devices, astronautId)
    .filter((d) => d.metrics.some((m) => wanted.has(m)))
    .sort((a, b) => Number(a.assignedTo == null) - Number(b.assignedTo == null))
}

export function useDevicesForMetrics(astronautId: string, metrics: MetricCode[]): Device[] {
  const devices = useAppStore((s) => s.devices)
  const key = metrics.join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key stands for the metrics list
  return useMemo(() => devicesForMetrics(devices, astronautId, metrics), [devices, astronautId, key])
}

/** Headline when the core wearable vitals are missing: a pause is said as such, never as a sensor fault. */
export const WEARABLE_PAUSED_HEADLINE = 'Wearable monitoring is paused by an operator. Missing data is never treated as normal: resume it to see live readings.'

/** True when this astronaut's Bio-Monitor (the core vitals wearable) is paused by an operator. */
export function useWearablePaused(astronautId: string): boolean {
  return useAppStore((s) => s.devices.some((d) => d.kind === 'BIO_MONITOR' && d.assignedTo === astronautId && d.state === 'PAUSED'))
}

/**
 * True when this metric has no data because the device feeding it is paused by an operator
 * (subject: an astronaut id or "CABIN"). The UI then says "Paused", never "Signal lost".
 */
export function useMetricPaused(subjectId: string, metric: MetricCode): boolean {
  return useAppStore((s) => {
    const ms = subjectId === 'CABIN' ? s.environment.metrics[metric] : s.health[subjectId]?.metrics[metric]
    if (ms && ms.current != null && ms.status !== 'NO_DATA') return false
    return s.devices.some((d) => d.state === 'PAUSED' && (d.assignedTo === subjectId || d.assignedTo == null) && d.metrics.includes(metric))
  })
}
