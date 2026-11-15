import clsx from 'clsx'
import { ChevronDown, ChevronLeft, FlaskConical, Signal } from 'lucide-react'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../state/store'
import { STATUS_META } from '../../lib/status'
import type { BodyRegionId, MetricCode, Status } from '../../types/domain'
import { METRIC_CATALOG } from '../../engine/catalog'
import { useT } from '../../i18n'
import { tx } from '../../i18n/rich'
import { metricLabel, metricPlain, regionDescription, regionLabel, regionSystem } from '../../i18n/catalog'
import { MetricValue } from '../../components/MetricValue'
import { StatusDot, StatusIcon, StatusPill } from '../../components/Status'
import { EventLegend, TrendChart } from '../../components/TrendChart'
import { BaselineInfo } from '../../components/BaselineInfo'
import { Badge, IconButton } from '../../components/ui'
import { ORIGIN_LABEL, QUALITY_LABEL, deltaVsNormal, fmtMetric } from '../../components/format'
import { REGION_ICON } from '../stage/CenterStage'
import { regionMetricsFromCatalog, useActions, useChartEvents } from '../shared/hooks'
import { RegionAlertsJump, RegionEvents } from './RegionEvents'
import { MeasuredBy } from './MeasuredBy'
import { forHorizon, historyNote, useForecastHorizon } from './forecastHorizon'
import { HorizonPicker } from './HorizonPicker'
import { ExamHistory } from './ExamHistory'

const WINDOWS = [6, 24, 72] as const

function MetricRow({ astronautId, metric, expanded, onToggle }: { astronautId: string; metric: MetricCode; expanded: boolean; onToggle: () => void }) {
  const ms = useAppStore((s) => s.health[astronautId]?.metrics[metric])
  const history = useAppStore((s) => s.history[astronautId]?.[metric])
  const basePrediction = useAppStore((s) => s.health[astronautId]?.predictions[metric])
  const horizon = useForecastHorizon((s) => s.hours)
  const prediction = forHorizon(basePrediction, horizon)
  const [win, setWin] = useState<(typeof WINDOWS)[number]>(24)
  const def = METRIC_CATALOG[metric]
  const region = def.region === 'environment' ? null : def.region
  const events = useChartEvents(astronautId, metric, region)
  const status: Status = !ms || ms.current == null ? 'NO_DATA' : ms.status
  const meta = STATUS_META[status]
  const noData = status === 'NO_DATA'
  const delta = deltaVsNormal(ms, status)
  const b = ms?.baseline
  const t = useT()
  const bandText = b && b.status === 'READY' ? t('attention.range', { low: fmtMetric(metric, b.low), high: fmtMetric(metric, b.high), unit: def.unit }) : t('attention.stillLearningNormal')
  const id = `metric-${metric}`
  return (
    <li
      className={clsx('rounded-xl ring-1 transition-colors', expanded ? 'bg-white/[0.05] ring-white/15' : 'bg-white/[0.025] ring-white/[0.06]', noData && 'border border-dashed border-nodata/40 ring-0')}
    >
      <button type="button" aria-expanded={expanded} aria-controls={id} onClick={onToggle} className="focus-ring flex w-full items-start gap-3 rounded-xl px-3 pt-3 pb-1 text-left">
        <span className="mt-1.5">
          <StatusDot status={status} size={9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[13px] font-semibold text-ink-100">{metricLabel(metric)}</span>
            <span className="flex shrink-0 items-baseline gap-1">
              {noData ? (
                <span className="text-sm font-semibold text-nodata">{t('attention.signalLost')}</span>
              ) : (
                <>
                  <MetricValue value={ms?.current} decimals={def.decimals} className="text-[20px] leading-none font-semibold text-ink-100" />
                  <span className="text-[11px] text-ink-500">{def.unit}</span>
                </>
              )}
            </span>
          </span>
          <span className="mt-1 flex items-center justify-between gap-2 text-xs">
            <span className={clsx('flex items-center gap-1 font-medium')} style={{ color: delta.tone === 'in' ? '#a9b6cf' : meta.color }}>
              <StatusIcon status={status} size={12} />
              {delta.text}
            </span>
            <span className="text-[11px] text-ink-500">{meta.crewLabel}</span>
          </span>
        </span>
        <ChevronDown size={14} className={clsx('mt-1 shrink-0 text-ink-500 transition-transform', expanded && 'rotate-180')} aria-hidden />
      </button>
      <div className="flex items-center gap-1 pr-3 pb-2.5 pl-[33px] text-[11px] text-ink-500">
        <span>
          {tx('attention.yourNormal', { band: <span className="tabular text-ink-300">{bandText}</span> })}
          {ms?.zScore != null && !noData && <span className="tabular present:hidden"> · z {ms.zScore.toFixed(1)}</span>}
        </span>
        <BaselineInfo metric={metric} baseline={b} />
      </div>
      {expanded && (
        <div id={id} className="px-3 pb-3">
          <p className="mb-2 text-xs leading-relaxed text-ink-300">{metricPlain(metric)}</p>
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 present:invisible">
              <Badge tone={ms?.quality === 'VALID' ? 'neutral' : 'warn'} icon={<Signal size={10} aria-hidden />} title={t('attention.dataQuality')}>
                {QUALITY_LABEL[ms?.quality ?? 'MISSING']}
              </Badge>
              <Badge tone="sim" icon={<FlaskConical size={10} aria-hidden />} title={t('attention.dataOrigin')}>
                {ORIGIN_LABEL[ms?.data_origin ?? 'SIMULATED']}
              </Badge>
            </div>
            <div className="flex rounded-lg bg-white/[0.04] p-0.5 ring-1 ring-white/[0.06]" role="group" aria-label={t('attention.chartWindow')}>
              {WINDOWS.map((w) => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={win === w}
                  onClick={() => setWin(w)}
                  className={clsx('focus-ring tabular rounded-md px-2 py-0.5 text-[10px] font-semibold', win === w ? 'bg-white/10 text-ink-100' : 'text-ink-500 hover:text-ink-300')}
                >
                  {t('attention.hours', { n: w })}
                </button>
              ))}
            </div>
          </div>
          <TrendChart metric={metric} history={history ?? []} baseline={b ?? null} prediction={prediction ?? null} color={noData ? '#94a3b8' : meta.color === STATUS_META.LOW.color ? '#5eead4' : meta.color} windowHours={win} height={170} events={events} />
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-500 present:hidden">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-accent/20 ring-1 ring-accent/40" aria-hidden /> {t('attention.legend.band')}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: '#5eead4' }} aria-hidden /> {t('attention.legend.measured')}
            </span>
            {prediction?.eligible && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm bg-white/15" aria-hidden /> {t('attention.legend.forecast', { interval: prediction.intervalLabel })}
              </span>
            )}
            <EventLegend events={events} />
            <span>{t('attention.legend.gaps')}</span>
          </div>
          {basePrediction && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">{t('attention.forecast')}</span>
              <HorizonPicker size="xs" />
            </div>
          )}
          {prediction && !prediction.eligible && (
            <p className="mt-1 text-[11px] text-ink-300" role="status">
              {prediction.ineligibleReason === 'HISTORY_TOO_SHORT' ? t('attention.historyShortNote', { note: historyNote(prediction) }) : t('attention.notEnoughData')}
            </p>
          )}
          {prediction?.eligible && <p className="mt-1 text-[10px] text-ink-500 present:hidden">{prediction.method}. {prediction.disclaimer}</p>}
        </div>
      )}
    </li>
  )
}

/**
 * Detail of one body region: status, plain summary, metrics (value, personal normal, chart,
 * forecast, data quality and origin) and the alerts and flags of the region.
 * `embedded` drops the back row and the region header: the structure panel renders its own on
 * top (selected structure, the region it is monitored with and its status).
 */
export function RegionDetail({ astronautId, region, embedded = false }: { astronautId: string; region: BodyRegionId; embedded?: boolean }) {
  const { status, summary, metricsKey } = useAppStore(
    useShallow((s) => {
      const r = s.health[astronautId]?.regions[region]
      return { status: (r?.status ?? 'NO_DATA') as Status, summary: r?.summary ?? '', metricsKey: (r?.metrics ?? []).join(',') }
    }),
  )
  const selectedMetric = useAppStore((s) => s.selectedMetric)
  const { selectRegion, selectMetric } = useActions()
  const t = useT()
  const label = { label: regionLabel(region), system: regionSystem(region), description: regionDescription(region) }
  const Icon = REGION_ICON[region]
  const fromState = metricsKey ? (metricsKey.split(',') as MetricCode[]) : []
  const metrics = fromState.length ? fromState : regionMetricsFromCatalog(region)
  const [collapsed, setCollapsed] = useState(false)
  const open = selectedMetric && metrics.includes(selectedMetric) ? selectedMetric : collapsed ? null : metrics[0]

  return (
    <div className="flex flex-col gap-4">
      {!embedded && (
        <div className="flex items-center gap-2">
          <IconButton
            label={t('attention.backToOverview')}
            size="sm"
            onClick={() => {
              selectRegion(null)
              selectMetric(null)
            }}
          >
            <ChevronLeft size={16} />
          </IconButton>
          <span className="text-xs text-ink-500">{t('attention.overview')}</span>
        </div>
      )}
      {!embedded && (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
                <Icon size={19} className="text-accent" aria-hidden />
              </span>
              <div>
                <div className="text-lg leading-tight font-semibold text-ink-100">{label.label}</div>
                <div className="text-xs text-ink-500">{label.system}</div>
              </div>
            </div>
            <StatusPill status={status} />
          </div>
          {summary && <p className="mt-3 text-[14px] leading-snug text-ink-100">{summary}</p>}
          <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{label.description}</p>
        </div>
      )}
      <RegionAlertsJump astronautId={astronautId} region={region} />
      {region === 'eyes' || region === 'ears' ? (
        // periodic exams: a session history instead of live trend charts
        <ExamHistory astronautId={astronautId} region={region} />
      ) : metrics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-xs text-ink-500">{t('attention.noSensor')}</div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label={t('attention.regionMetrics', { region: label.label })}>
          {metrics.map((m) => (
            <MetricRow key={m} astronautId={astronautId} metric={m} expanded={m === open} onToggle={() => {
                setCollapsed(m === open)
                selectMetric(m === open ? null : m)
              }} />
          ))}
        </ul>
      )}
      {region !== 'eyes' && region !== 'ears' && <MeasuredBy astronautId={astronautId} metrics={metrics} />}
      <RegionEvents astronautId={astronautId} region={region} />
    </div>
  )
}
