import clsx from 'clsx'
import { Battery, BatteryLow, Cpu, FlaskConical, Info } from 'lucide-react'
import { useAppStore } from '../../state/store'
import type { Device, MetricCode } from '../../types/domain'
import { METRIC_CATALOG } from '../../engine/catalog'
import { Badge, SectionLabel } from '../../components/ui'
import { ORIGIN_LABEL, relTime } from '../../components/format'
import { DEVICE_KIND_LABEL } from '../topbar/ProvenancePopover'
import { DEVICE_STATE_META, useDevicesForMetrics } from '../vitals/deviceMeta'

function DeviceCard({ d, metrics, now }: { d: Device; metrics: MetricCode[]; now: number }) {
  const meta = DEVICE_STATE_META[d.state]
  const Icon = meta.icon
  const feeds = d.metrics.filter((m) => metrics.includes(m))
  const lowBattery = d.batteryPct != null && d.batteryPct < 20
  const attention = d.state !== 'ONLINE'
  return (
    <li className={clsx('rounded-xl px-3 py-2.5', attention ? 'border border-dashed border-white/15' : 'bg-white/[0.03] ring-1 ring-white/[0.06]')}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-ink-100">{d.name}</span>
          <span className="block truncate text-[11px] text-ink-500">
            {DEVICE_KIND_LABEL[d.kind]}
            {d.assignedTo ? '' : ' · shared'}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold" style={{ color: meta.color }}>
          <Icon size={13} aria-hidden /> {meta.label}
        </span>
      </div>
      <div className="tabular mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
        <span className={clsx('flex items-center gap-1', lowBattery && 'text-watch')} title="Battery">
          {lowBattery ? <BatteryLow size={12} aria-hidden /> : <Battery size={12} aria-hidden />}
          <span className="sr-only">Battery</span>
          {d.batteryPct == null ? 'n/a' : `${Math.round(d.batteryPct)}%`}
        </span>
        <span>Last seen {relTime(d.lastSeenAt, now)}</span>
        <Badge tone="sim" icon={<FlaskConical size={10} aria-hidden />} title="Data origin">
          {ORIGIN_LABEL[d.data_origin]}
        </Badge>
      </div>
      {feeds.length > 0 && <div className="mt-1 text-[11px] text-ink-500">Here: {feeds.map((m) => METRIC_CATALOG[m].label.toLowerCase()).join(', ')}</div>}
      {d.state !== 'ONLINE' && d.detail && <div className="mt-1 text-[11px] text-ink-300">{d.detail}</div>}
    </li>
  )
}

/**
 * "Measured by": the devices that feed the metrics of a body region (or of the region a selected
 * structure is monitored with), with their state, battery, last contact and data origin.
 * Metrics that come from the crew app (check-ins, self tests, intake log) are named as such.
 */
export function MeasuredBy({ astronautId, metrics }: { astronautId: string; metrics: MetricCode[] }) {
  const devices = useDevicesForMetrics(astronautId, metrics)
  const now = useAppStore((s) => Math.floor(s.clock.simNow / 30000) * 30000)
  if (metrics.length === 0) return null
  const covered = new Set(devices.flatMap((d) => d.metrics))
  const fromApp = metrics.filter((m) => !covered.has(m))
  return (
    <section aria-label="Measured by">
      <SectionLabel right={<span className="tabular text-[11px] text-ink-500">{devices.length === 1 ? '1 device' : `${devices.length} devices`}</span>}>Measured by</SectionLabel>
      {devices.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {devices.map((d) => (
            <DeviceCard key={d.id} d={d} metrics={metrics} now={now} />
          ))}
        </ul>
      ) : (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5 text-[12px] text-ink-300 ring-1 ring-white/[0.05]">
          <Cpu size={14} className="shrink-0 text-ink-500" aria-hidden /> No device feeds these readings directly.
        </div>
      )}
      {fromApp.length > 0 && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-500">
          <Info size={12} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            {fromApp.map((m) => METRIC_CATALOG[m].label).join(', ')}: from the crew app (daily check-in, self test or intake log), not a worn device.
          </span>
        </p>
      )}
    </section>
  )
}
