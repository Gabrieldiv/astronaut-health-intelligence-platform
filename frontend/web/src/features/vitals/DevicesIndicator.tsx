import clsx from 'clsx'
import { Battery, BatteryLow, ChevronUp, Pause, Play, Signal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../../state/store'
import type { Device, DeviceState } from '../../types/domain'
import { Popover } from '../../components/ui'
import { ORIGIN_LABEL, relTime } from '../../components/format'
import { inlineLabel } from '../../engine/text'
import { DEVICE_KIND_LABEL } from '../topbar/ProvenancePopover'
import { DEVICE_STATE_META, devicesFor } from './deviceMeta'
import { getLang, useT } from '../../i18n'
import { metricLabel } from '../../i18n/catalog'

/**
 * Pause / resume control of one device. Pausing asks for a quick confirmation first (it hides
 * live readings); resuming does not. Both are written to the audit trail by the engine.
 */
function PauseControl({ d }: { d: Device }) {
  const setDevicePaused = useAppStore((s) => s.setDevicePaused)
  const [confirming, setConfirming] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const paused = d.state === 'PAUSED'
  const returnFocus = useRef(false)
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
    else if (returnFocus.current) {
      returnFocus.current = false
      toggleRef.current?.focus()
    }
  }, [confirming])
  const close = () => {
    returnFocus.current = true
    setConfirming(false)
  }
  const t = useT()
  if (confirming) {
    // English keeps the engine's inline labels ("heart rate, HRV"); other languages use the catalog labels.
    const list = d.metrics.map((m) => (getLang() === 'en' ? inlineLabel(m) : metricLabel(m))).join(', ')
    return (
      <div role="group" aria-label={t('devices.pause.confirmAria', { name: d.name })} className="mt-2 rounded-lg bg-white/[0.04] p-2.5 ring-1 ring-white/10">
        <p className="text-[12px] leading-snug text-ink-100">{t('devices.pause.question', { name: d.name })}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-ink-500">{t('devices.pause.consequence', { list })}</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            ref={confirmRef}
            type="button"
            onClick={() => {
              setDevicePaused(d.id, true, 'operator')
              close()
            }}
            className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-300/90 px-3 text-[12px] font-semibold text-space-950 hover:bg-indigo-200"
          >
            <Pause size={13} aria-hidden /> {t('devices.pause.pause')}
          </button>
          <button type="button" onClick={close} className="focus-ring inline-flex h-8 items-center rounded-lg px-3 text-[12px] font-semibold text-ink-300 ring-1 ring-white/15 hover:bg-white/[0.06]">
            {t('devices.pause.cancel')}
          </button>
        </div>
      </div>
    )
  }
  return (
    <button
      ref={toggleRef}
      type="button"
      onClick={() => (paused ? setDevicePaused(d.id, false, 'operator') : setConfirming(true))}
      aria-label={paused ? t('devices.pause.resumeAria', { name: d.name }) : t('devices.pause.pauseAria', { name: d.name })}
      className={clsx(
        'focus-ring inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition-colors',
        paused ? 'bg-accent/15 text-accent ring-1 ring-accent/35 hover:bg-accent/25' : 'text-ink-300 ring-1 ring-white/10 hover:bg-white/[0.06] hover:text-ink-100',
      )}
    >
      {paused ? <Play size={12} aria-hidden /> : <Pause size={12} aria-hidden />}
      {paused ? t('devices.pause.resume') : t('devices.pause.pause')}
    </button>
  )
}

function DeviceRow({ d, now }: { d: Device; now: number }) {
  const t = useT()
  const m = DEVICE_STATE_META[d.state]
  const Icon = m.icon
  const bad = d.state === 'OFFLINE' || d.state === 'DATA_STALE'
  const paused = d.state === 'PAUSED'
  const lowBattery = d.batteryPct != null && d.batteryPct < 20
  return (
    <li className={clsx('rounded-xl px-3 py-2.5', bad || paused ? 'border border-dashed' : 'bg-white/[0.03] ring-1 ring-white/[0.05]', bad && 'border-nodata/45', paused && 'border-indigo-300/40 bg-indigo-300/[0.03]')}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-ink-100">{d.name}</span>
          <span className="block truncate text-[11px] text-ink-500">
            {DEVICE_KIND_LABEL[d.kind]} {d.assignedTo ? '' : t('devices.row.cabin')}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold" style={{ color: m.color }}>
          <Icon size={13} aria-hidden /> {m.label}
        </span>
      </div>
      <div className="tabular mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
        <span className={clsx('flex items-center gap-1', lowBattery && 'text-watch')}>
          {lowBattery ? <BatteryLow size={12} aria-hidden /> : <Battery size={12} aria-hidden />}
          {d.batteryPct == null ? t('devices.na') : `${Math.round(d.batteryPct)}%`}
        </span>
        <span className="flex items-center gap-1">
          <Signal size={12} aria-hidden />
          {d.signalPct == null ? t('devices.na') : `${Math.round(d.signalPct)}%`}
        </span>
        <span>{t('devices.row.seen', { when: relTime(d.lastSeenAt, now) })}</span>
        <span className="rounded bg-violet-400/10 px-1 text-[9.5px] font-bold text-violet-200 uppercase">{ORIGIN_LABEL[d.data_origin]}</span>
        <span className="ml-auto">
          <PauseControl d={d} />
        </span>
      </div>
      {paused && d.detail && <div className="mt-1 text-[11px] text-indigo-200/80">{t('devices.row.pausedDetail', { detail: d.detail })}</div>}
    </li>
  )
}

export function DevicesIndicator({ astronautId }: { astronautId: string }) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const devices = useAppStore((s) => s.devices)
  const now = useAppStore((s) => Math.floor(s.clock.simNow / 30000) * 30000)
  const mine = useMemo(() => devicesFor(devices, astronautId), [devices, astronautId])
  const online = mine.filter((d) => d.state === 'ONLINE').length
  const pausedCount = mine.filter((d) => d.state === 'PAUSED').length
  const worst = mine.reduce<DeviceState>((w, d) => (DEVICE_STATE_META[d.state].rank > DEVICE_STATE_META[w].rank ? d.state : w), 'ONLINE')
  const wm = DEVICE_STATE_META[worst]
  const WIcon = wm.icon
  const minBattery = mine.reduce<number | null>((m, d) => (d.batteryPct == null ? m : m == null ? d.batteryPct : Math.min(m, d.batteryPct)), null)
  const problem = worst !== 'ONLINE'
  const t = useT()
  const headline = !problem ? t('devices.allOnline') : worst === 'PAUSED' ? t('devices.nPaused', { n: pausedCount }) : wm.label
  const aria = [
    t('devices.indicatorAria', { online, total: mine.length }),
    pausedCount ? ` ${t('devices.indicatorPausedAria', { n: pausedCount })}` : '',
    ' ',
    problem && worst !== 'PAUSED' ? t('devices.indicatorWorstAria', { label: wm.label }) : '',
    ' ',
    t('devices.indicatorOpenAria'),
  ].join('')
  return (
    <div className="relative flex flex-1">
      <button
        ref={btn}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        aria-label={aria}
        className={clsx(
          'focus-ring flex flex-1 flex-col justify-between rounded-xl px-2.5 py-2 text-left transition-colors short:py-1.5',
          problem && worst !== 'DEGRADED' && worst !== 'PAUSED' ? 'border border-dashed border-nodata/50 bg-white/[0.015]' : 'bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.06]',
        )}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: wm.color }}>
          <WIcon size={13} aria-hidden /> {headline}
        </span>
        <span className="tabular text-[22px] leading-none font-semibold text-ink-100">
          {online}
          <span className="text-sm text-ink-500">/{mine.length}</span>
        </span>
        <span className="flex items-center justify-between text-[10.5px] text-ink-500">
          <span className="tabular flex items-center gap-1">
            <Battery size={11} aria-hidden /> {minBattery == null ? t('devices.na') : t('devices.minBattery', { n: Math.round(minBattery) })}
          </span>
          <ChevronUp size={12} aria-hidden />
        </span>
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={btn} label={t('devices.title')} side="top" align="right" className="w-[360px] p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">{t('devices.title')}</span>
          <span className="text-[11px] text-ink-500">{t('devices.simulatedAdapters')}</span>
        </div>
        <ul className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto">
          {[...mine]
            .sort((a, b) => DEVICE_STATE_META[b.state].rank - DEVICE_STATE_META[a.state].rank)
            .map((d) => (
              <DeviceRow key={d.id} d={d} now={now} />
            ))}
        </ul>
        <p className="mt-2 px-1 text-[10.5px] leading-snug text-ink-500">{t('devices.pauseNote')}</p>
      </Popover>
    </div>
  )
}
