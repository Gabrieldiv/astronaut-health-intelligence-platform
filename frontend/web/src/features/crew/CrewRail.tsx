import clsx from 'clsx'
import { Users } from 'lucide-react'
import { useAppStore } from '../../state/store'
import { STATUS_META } from '../../lib/status'
import type { Astronaut, MetricCode, Status } from '../../types/domain'
import { METRIC_CATALOG } from '../../engine/catalog'
import { MetricValue } from '../../components/MetricValue'
import { Sparkline } from '../../components/Sparkline'
import { StatusPill, isUrgent } from '../../components/Status'
import { Panel } from '../../components/ui'
import { lastHours } from '../../components/format'
import { useHistory, useMetric, useSignalLost } from '../shared/hooks'

function MiniVital({ astronautId, metric, className }: { astronautId: string; metric: MetricCode; className?: string }) {
  const ms = useMetric(astronautId, metric)
  const def = METRIC_CATALOG[metric]
  const status: Status = ms?.current == null ? 'NO_DATA' : (ms.status ?? 'LOW')
  const noData = status === 'NO_DATA'
  return (
    <div className={clsx('min-w-0', className)} aria-label={`${def.label} ${noData ? 'no data' : `${ms?.current?.toFixed(def.decimals)} ${def.unit}`}`}>
      <div className="text-[9px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{def.shortLabel}</div>
      <div className="flex items-baseline gap-0.5">
        {noData ? (
          <span className="text-[13px] font-semibold text-nodata">--</span>
        ) : (
          <MetricValue value={ms?.current} decimals={def.decimals} className="text-[15px] font-semibold" />
        )}
        <span className="text-[10px] text-ink-500">{def.unit}</span>
        {!noData && status !== 'LOW' && <span className="ml-0.5 h-1.5 w-1.5 self-center rounded-full" style={{ background: STATUS_META[status].color }} aria-hidden />}
      </div>
    </div>
  )
}

/** One line vital for compact crew rows (short screens): "HR 62 bpm". */
function InlineVital({ astronautId, metric }: { astronautId: string; metric: MetricCode }) {
  const ms = useMetric(astronautId, metric)
  const def = METRIC_CATALOG[metric]
  const status: Status = ms?.current == null ? 'NO_DATA' : (ms.status ?? 'LOW')
  const noData = status === 'NO_DATA'
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap" title={def.label}>
      <span className="text-[10px] font-semibold text-ink-500">{def.shortLabel}</span>
      {noData ? <span className="text-[13px] font-semibold text-nodata">--</span> : <MetricValue value={ms?.current} decimals={def.decimals} className="text-[13px] font-semibold" />}
      <span className="text-[10px] text-ink-500">{def.unit}</span>
      {!noData && status !== 'LOW' && <span className="h-1.5 w-1.5 self-center rounded-full" style={{ background: STATUS_META[status].color }} aria-hidden />}
    </span>
  )
}

function CrewTrend({ astronautId, color }: { astronautId: string; color: string }) {
  const hist = useHistory(astronautId, 'HEART_RATE')
  return <Sparkline points={lastHours(hist, 6)} color={color} height={26} className="w-full" maxPoints={60} />
}

function Avatar({ astronaut, status, className }: { astronaut: Astronaut; status: Status; className?: string }) {
  const meta = STATUS_META[status]
  const noData = status === 'NO_DATA'
  return (
    <span className={clsx('relative inline-flex size-[38px] shrink-0', className)}>
      <span
        className={clsx('absolute inset-0 rounded-full', status === 'CRITICAL' && 'animate-pulse-ring-fast', status === 'HIGH' && 'animate-pulse-ring')}
        style={{
          border: `2px ${noData ? 'dashed' : 'solid'} ${meta.color}`,
          ['--ring-color' as string]: meta.glow,
          boxShadow: isUrgent(status) ? undefined : `0 0 12px -2px ${meta.glow}`,
        }}
        aria-hidden
      />
      <span
        className="absolute inset-[4px] flex items-center justify-center rounded-full text-[11px] font-bold tracking-wide"
        style={{ background: `color-mix(in srgb, ${astronaut.color} 18%, #0a1120)`, color: astronaut.color, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${astronaut.color} 35%, transparent)` }}
        aria-hidden
      >
        {astronaut.callsign.slice(0, 2)}
      </span>
    </span>
  )
}

function CrewCard({ astronaut, selected, index }: { astronaut: Astronaut; selected: boolean; index: number }) {
  const level = useAppStore((s) => s.health[astronaut.id]?.risk.risk_level)
  const signalLost = useSignalLost(astronaut.id)
  const status: Status = level == null ? 'NO_DATA' : signalLost && level === 'LOW' ? 'NO_DATA' : level
  const selectAstronaut = useAppStore((s) => s.selectAstronaut)
  const meta = STATUS_META[status]
  const urgent = isUrgent(status)
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${astronaut.callsign}, ${astronaut.role}. Status: ${meta.crewLabel}${signalLost ? ', signal lost' : ''}`}
      onClick={() => selectAstronaut(astronaut.id)}
      aria-keyshortcuts={String(index + 1)}
      title={`${astronaut.callsign}, ${astronaut.role} (key ${index + 1})`}
      className={clsx(
        'focus-ring group relative w-full overflow-hidden rounded-xl p-2.5 text-left transition-all duration-200 short:py-2',
        selected ? 'bg-white/[0.07] ring-1 ring-white/20' : 'bg-white/[0.02] ring-1 ring-white/[0.05] hover:bg-white/[0.05]',
      )}
      style={urgent ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${meta.color} 45%, transparent), 0 0 24px -10px ${meta.glow}` } : undefined}
    >
      {selected && <span className="absolute top-3 bottom-3 left-0 w-[3px] rounded-r-full bg-accent" aria-hidden />}
      {urgent && <span className="pointer-events-none absolute inset-0 opacity-60" style={{ background: `radial-gradient(120% 80% at 0% 0%, ${meta.glow} 0%, transparent 55%)` }} aria-hidden />}
      <div className="relative flex items-center gap-2.5">
        <Avatar astronaut={astronaut} status={status} className="short:size-8" />
        <div className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-bold tracking-wide text-ink-100">{astronaut.callsign}</span>
            {/* compact rows: the pill moves up next to the callsign */}
            <span className="hidden shrink-0 short:flex">
              <StatusPill status={status} size="sm" />
            </span>
          </span>
          <span className="block truncate text-[11px] text-ink-500 short:hidden" title={astronaut.role}>
            {astronaut.roleShort}
          </span>
          <span className="mt-1 hidden items-baseline gap-3 short:flex">
            <InlineVital astronautId={astronaut.id} metric="HEART_RATE" />
            <InlineVital astronautId={astronaut.id} metric="SPO2" />
          </span>
        </div>
        <span className="flex shrink-0 short:hidden">
          <StatusPill status={status} size="sm" />
        </span>
      </div>
      <div className="relative mt-2 grid grid-cols-[auto_auto_1fr] items-end gap-3 short:hidden roomy:grid-cols-[auto_auto_auto_1fr]">
        <MiniVital astronautId={astronaut.id} metric="HEART_RATE" />
        <MiniVital astronautId={astronaut.id} metric="SPO2" />
        <MiniVital astronautId={astronaut.id} metric="RESPIRATORY_RATE" className="hidden roomy:block" />
        <div className="min-w-0 pb-0.5" title="Heart rate, last 6 hours">
          <CrewTrend astronautId={astronaut.id} color={astronaut.color} />
        </div>
      </div>
    </button>
  )
}

export function CrewRail({ className }: { className?: string }) {
  const crew = useAppStore((s) => s.crew)
  const selectedId = useAppStore((s) => s.selectedAstronautId)
  return (
    <Panel as="nav" ariaLabel="Crew" tourId="crew" title="Crew" icon={<Users size={12} aria-hidden />} className={className} bodyClassName="flex flex-col overflow-y-auto px-3 pb-3">
      <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 short:gap-1.5">
        {crew.map((a, i) => (
          <CrewCard key={a.id} astronaut={a} index={i} selected={a.id === selectedId} />
        ))}
      </div>
    </Panel>
  )
}
