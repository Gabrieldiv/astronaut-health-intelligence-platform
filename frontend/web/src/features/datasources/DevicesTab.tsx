import clsx from 'clsx'
import { ArrowRight, Cpu } from 'lucide-react'
import { useMemo } from 'react'
import { useAppStore } from '../../state/store'
import { METRIC_CATALOG } from '../../engine/catalog'
import type { Device, DeviceKind, DeviceState } from '../../types/domain'
import { DEVICE_KIND_LABEL } from '../topbar/ProvenancePopover'
import { OriginBadge } from './shared'
import { t, translatedRecord, useT } from '../../i18n'
import { tx } from '../../i18n/rich'
import { metricLabel } from '../../i18n/catalog'

/** Real world counterpart and the honest path to a real feed. No public live API is assumed. */
const KINDS = ['BIO_MONITOR', 'ACTIGRAPHY', 'BP_MONITOR', 'EXERCISE_CEVIS', 'EXERCISE_ARED', 'EXERCISE_T2', 'ENV_SENSOR', 'DOSIMETER'] as const satisfies readonly DeviceKind[]
const REAL_PATH: Record<DeviceKind, { counterpart: string; path: string }> = Object.fromEntries(
  KINDS.map((k) => [
    k,
    {
      get counterpart() {
        return t(`datasources.real.${k}.counterpart`)
      },
      get path() {
        return t(`datasources.real.${k}.path`)
      },
    },
  ]),
) as Record<DeviceKind, { counterpart: string; path: string }>

const STATE_LABEL: Record<DeviceState, string> = translatedRecord(['ONLINE', 'DEGRADED', 'DATA_STALE', 'OFFLINE', 'PAUSED'] as const, (s) => t(`devices.state.${s}`))
const DATA_PATH = ['step1', 'step2', 'step3', 'step4', 'step5'] as const

export function DevicesTab() {
  const devices = useAppStore((s) => s.devices)
  const crew = useAppStore((s) => s.crew)
  const groups = useMemo(() => {
    const m = new Map<DeviceKind, Device[]>()
    for (const d of devices) m.set(d.kind, [...(m.get(d.kind) ?? []), d])
    return [...m.entries()]
  }, [devices])
  const t = useT()
  const who = (id: string | null) => {
    if (!id) return t('devices.cabin')
    const a = crew.find((c) => c.id === id)
    return a ? `${a.callsign} (${a.id})` : id
  }

  return (
    <div className="space-y-4">
      <div role="note" className="flex gap-3 rounded-xl bg-violet-400/[0.06] px-4 py-3 ring-1 ring-violet-300/20">
        <Cpu size={18} className="mt-0.5 shrink-0 text-violet-200" aria-hidden />
        <div className="text-xs leading-relaxed text-ink-300">
          <p className="font-semibold text-ink-100">{t('datasources.devices.headline')}</p>
          <p className="mt-1">{tx('datasources.devices.body', { code: <span className="font-mono text-[11px]">data_origin</span> })}</p>
        </div>
      </div>

      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-300" aria-label={t('datasources.devices.pathAria')}>
        {DATA_PATH.map((k) => t(`datasources.devices.${k}`)).map((s, i, arr) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="rounded-lg bg-white/[0.04] px-2 py-1 ring-1 ring-white/[0.07]">{s}</span>
            {i < arr.length - 1 && <ArrowRight size={12} className="text-ink-500" aria-hidden />}
          </li>
        ))}
      </ol>

      <ul className="grid gap-3 md:grid-cols-2">
        {groups.map(([kind, list]) => {
          const metrics = [...new Set(list.flatMap((d) => d.metrics))]
          const path = REAL_PATH[kind]
          return (
            <li key={kind} className="rounded-2xl bg-white/[0.025] p-4 ring-1 ring-white/[0.08]">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink-100">{DEVICE_KIND_LABEL[kind]}</h3>
                <div className="flex shrink-0 items-center gap-1.5">
                  {[...new Set(list.map((d) => d.data_origin))].map((o) => (
                    <OriginBadge key={o} origin={o} />
                  ))}
                </div>
              </div>
              <p className="mt-1 text-[11px] text-ink-500">
                {metrics.map((m) => (METRIC_CATALOG[m] ? metricLabel(m) : m)).join(', ') || t('datasources.devices.noMetrics')}
              </p>
              <ul className="mt-2 space-y-1">
                {list.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-xs">
                    <span className="min-w-0 truncate text-ink-300" title={d.name}>
                      {who(d.assignedTo)}
                    </span>
                    <span className={clsx('tabular shrink-0 text-[11px]', d.state === 'ONLINE' ? 'text-ink-500' : 'text-ink-100')}>
                      {STATE_LABEL[d.state]}
                      {d.batteryPct != null && <span className="text-ink-500"> · {t('datasources.devices.battery', { n: Math.round(d.batteryPct) })}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              {path && (
                <dl className="mt-3 space-y-1 text-[11px] leading-relaxed">
                  <div>
                    <dt className="inline font-semibold text-ink-300">{t('datasources.devices.counterpart')} </dt>
                    <dd className="inline text-ink-500">{path.counterpart}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-ink-300">{t('datasources.devices.pathToReal')} </dt>
                    <dd className="inline text-ink-500">{path.path}</dd>
                  </div>
                </dl>
              )}
            </li>
          )
        })}
      </ul>
      {groups.length === 0 && <p className="text-xs text-ink-500">{t('datasources.devices.none')}</p>}
    </div>
  )
}
