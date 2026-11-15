import clsx from 'clsx'
import { Activity, CirclePause, Cpu, WifiOff, Wind } from 'lucide-react'
import { useAppStore } from '../../state/store'
import { STATUS_META } from '../../lib/status'
import type { MetricCode, Status } from '../../types/domain'
import { ENV_METRICS, METRIC_CATALOG, VITAL_METRICS } from '../../engine/catalog'
import { MetricValue } from '../../components/MetricValue'
import { Sparkline } from '../../components/Sparkline'
import { StatusIcon } from '../../components/Status'
import { deltaVsNormal, lastHours } from '../../components/format'
import { focusTarget } from '../shared/hooks'
import { BaselineInfo } from '../../components/BaselineInfo'
import { DevicesIndicator } from './DevicesIndicator'
import { useMetricPaused } from './deviceMeta'
import { formatFixed, t, translatedRecord, useT } from '../../i18n'
import { metricLabel, metricPlain, metricShort } from '../../i18n/catalog'

const TILE_LABEL: Partial<Record<MetricCode, string>> = translatedRecord(['SYSTOLIC_BP', 'HRV_RMSSD'] as const, (m) => t(`devices.tile.${m}`))
/** Short tile labels used below 1440 px wide and on short screens (see .vl-short in index.css). */
const TILE_SHORT: Partial<Record<MetricCode, string>> = translatedRecord(['SYSTOLIC_BP'] as const, () => t('devices.tileShort.SYSTOLIC_BP'))
const num = (v: number | null | undefined, d: number) => (v == null ? String(v) : formatFixed(v, d))

function VitalTile({ astronautId, metric }: { astronautId: string; metric: MetricCode }) {
  const ms = useAppStore((s) => s.health[astronautId]?.metrics[metric])
  const hist = useAppStore((s) => s.history[astronautId]?.[metric])
  const selected = useAppStore((s) => s.selectedMetric === metric)
  const paused = useMetricPaused(astronautId, metric)
  const def = METRIC_CATALOG[metric]
  const status: Status = !ms || ms.current == null ? 'NO_DATA' : ms.status
  const meta = STATUS_META[status]
  const noData = status === 'NO_DATA'
  const delta = deltaVsNormal(ms, status)
  const band = ms?.baseline?.status === 'READY' ? { low: ms.baseline.low, high: ms.baseline.high } : null
  const lineColor = noData ? '#94a3b8' : status === 'LOW' ? '#5eead4' : meta.color
  return (
    <div className="relative flex min-w-0">
    <button
      type="button"
      onClick={() => focusTarget({ astronautId, metric })}
      aria-label={t('devices.vitalAria', {
        label: metricLabel(metric),
        value: noData ? (paused ? t('devices.vitalPausedAria') : t('devices.signalLostLower')) : `${num(ms?.current, def.decimals)} ${def.unit}, ${delta.text}`,
        status: paused && noData ? t('devices.pausedLower') : meta.crewLabel,
      })}
      className={clsx(
        'focus-ring group relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl px-3 pt-2.5 pb-2 text-left transition-colors short:justify-center short:pt-2',
        noData ? 'border border-dashed border-nodata/45 bg-white/[0.015]' : 'bg-white/[0.03] ring-1 ring-white/[0.06] hover:bg-white/[0.06]',
        selected && 'ring-1 ring-accent/50',
      )}
    >
      {!noData && <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: meta.color, opacity: status === 'LOW' ? 0.55 : 1 }} aria-hidden />}
      <span className="flex items-center justify-between gap-1 short:pr-5">
        <span className="truncate text-[11px] font-semibold text-ink-300" title={`${metricLabel(metric)}. ${metricPlain(metric)}`}>
          <span className="vl-full">{TILE_LABEL[metric] ?? metricLabel(metric)}</span>
          <span className="vl-short">{TILE_SHORT[metric] ?? metricShort(metric)}</span>
        </span>
        <StatusIcon status={status} size={12} className={clsx('shrink-0', status === 'CRITICAL' && 'animate-breathe')} />
      </span>
      <span className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
        {noData ? (
          <span className="flex items-center gap-1.5 text-[15px] leading-[32px] font-semibold text-nodata xl:text-[17px] short:text-[14px] short:leading-[28px]">
            {paused ? <CirclePause size={16} aria-hidden className="shrink-0" /> : <WifiOff size={16} aria-hidden className="shrink-0" />} {paused ? t('devices.paused') : t('devices.signalLost')}
          </span>
        ) : (
          <>
            <MetricValue value={ms?.current} decimals={def.decimals} className="text-[25px] leading-[32px] font-semibold tracking-tight text-ink-100 short:leading-[28px]" />
            <span className="text-[11px] text-ink-500">{def.unit}</span>
          </>
        )}
      </span>
      <Sparkline points={lastHours(hist, 6)} color={lineColor} band={band} height={18} className="mt-0.5 w-full short:hidden" maxPoints={72} />
      <span className={clsx('mt-1 truncate pr-5 text-[10.5px] font-medium short:hidden', noData ? 'text-nodata' : delta.tone === 'in' ? 'text-ink-500' : '')} style={!noData && delta.tone !== 'in' ? { color: meta.color } : undefined}>
        {noData ? (paused ? t('devices.state.PAUSED') : t('devices.checkSensor')) : delta.tone === 'in' ? t('devices.normalForYou') : delta.text}
      </span>
    </button>
    {/* Outside the tile button (no nested buttons). Short screens: top right, next to the status icon. */}
    <BaselineInfo metric={metric} baseline={ms?.baseline} prefer="top" className="absolute right-1.5 bottom-1.5 short:top-[7px] short:right-[26px] short:bottom-auto" />
    </div>
  )
}

function EnvTile({ metric }: { metric: MetricCode }) {
  const ms = useAppStore((s) => s.environment.metrics[metric])
  const def = METRIC_CATALOG[metric]
  const status: Status = !ms || ms.current == null ? 'NO_DATA' : ms.status
  const meta = STATUS_META[status]
  const noData = status === 'NO_DATA'
  return (
    <div
      className={clsx('flex min-w-0 flex-col justify-center rounded-lg px-2.5 py-1.5 short:py-[3px]', noData ? 'border border-dashed border-nodata/45' : 'bg-white/[0.03] ring-1 ring-white/[0.05]')}
      title={t('devices.envTitle', { label: metricLabel(metric), plain: metricPlain(metric), status: meta.crewLabel })}
      role="group"
      aria-label={`${metricLabel(metric)}: ${noData ? t('devices.signalLostLower') : `${num(ms?.current, def.decimals)} ${def.unit}`}, ${meta.crewLabel}`}
    >
      <span className="flex items-center justify-between gap-1 leading-tight">
        <span className="truncate text-[10px] text-ink-500">{metricShort(metric)}</span>
        <StatusIcon status={status} size={11} className="shrink-0" />
      </span>
      <span className="flex items-baseline gap-0.5 leading-tight whitespace-nowrap">
        {noData ? <span className="text-[13px] font-semibold text-nodata">--</span> : <MetricValue value={ms?.current} decimals={def.decimals} className="text-[14px] font-semibold text-ink-100" />}
        <span className="text-[9.5px] text-ink-500">{def.unit}</span>
      </span>
    </div>
  )
}

const SECTION = 'glass flex min-w-0 flex-col rounded-2xl px-3 pt-2.5 pb-3 short:pt-2 short:pb-2'
const SECTION_TITLE = 'mb-1.5 flex shrink-0 items-center gap-2 px-1 text-[11px] leading-4 font-semibold tracking-[0.14em] whitespace-nowrap text-ink-500 uppercase short:mb-1'

export function VitalsStrip({ className }: { className?: string }) {
  const astronautId = useAppStore((s) => s.selectedAstronautId)
  const callsign = useAppStore((s) => s.crew.find((c) => c.id === s.selectedAstronautId)?.callsign)
  const envStatus = useAppStore((s) => s.environment.status)
  const t = useT()
  return (
    <div className={clsx('flex min-h-0 gap-3', className)}>
      <section data-tour="vitals" aria-label={t('devices.liveVitalsAria', { callsign: String(callsign) })} className={clsx(SECTION, 'flex-1')}>
        <h2 className={SECTION_TITLE}>
          <Activity size={12} aria-hidden /> {t('devices.liveVitals')} <span className="tracking-wide text-ink-300 normal-case">{callsign}</span>
          <span className="ml-auto font-normal tracking-normal normal-case present:hidden">{t('devices.last6h')}</span>
        </h2>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {VITAL_METRICS.map((m) => (
            <VitalTile key={m} astronautId={astronautId} metric={m} />
          ))}
        </div>
      </section>
      <section aria-label={t('devices.cabinEnvAria')} className={clsx(SECTION, 'hidden w-[220px] shrink-0 lg:flex xl:w-[276px]')}>
        <h2 className={SECTION_TITLE}>
          <Wind size={12} aria-hidden /> {t('devices.cabin')}
          <span className="ml-auto flex items-center gap-1 tracking-normal normal-case">
            <StatusIcon status={envStatus} size={11} />
            <span style={{ color: STATUS_META[envStatus].color }}>{STATUS_META[envStatus].crewLabel}</span>
          </span>
        </h2>
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5 short:gap-1">
          {ENV_METRICS.map((m) => (
            <EnvTile key={m} metric={m} />
          ))}
        </div>
      </section>
      <section aria-label={t('devices.title')} className={clsx(SECTION, 'hidden w-[132px] shrink-0 lg:flex xl:w-[150px]')}>
        <h2 className={SECTION_TITLE}>
          <Cpu size={12} aria-hidden /> {t('devices.title')}
        </h2>
        <DevicesIndicator astronautId={astronautId} />
      </section>
    </div>
  )
}
