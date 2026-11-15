import clsx from 'clsx'
import { Info } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { FloatingPopover } from '../../components/ui'
import { METRIC_CATALOG } from '../../engine/catalog'
import { useT } from '../../i18n'
import { metricLabel, regionLabel } from '../../i18n/catalog'
import { STATUS_META } from '../../lib/status'
import { useAppStore } from '../../state/store'
import type { BodyRegionId, MetricCode, MetricState, Status } from '../../types/domain'
import { summarizeIndicators } from './indicators'

type Group = { key: BodyRegionId | 'environment'; items: { metric: MetricCode; status: Status }[] }

/**
 * Groups the tracked indicators by the body system they belong to, worst group first, so the
 * count on screen ("25/25") can be traced back to what it is made of. Pure and tested.
 */
export function groupIndicators(metrics: Partial<Record<MetricCode, MetricState>> | undefined): Group[] {
  const summary = summarizeIndicators(metrics)
  const groups = new Map<Group['key'], Group>()
  for (const item of summary.items) {
    const key = METRIC_CATALOG[item.metric]?.region ?? 'environment'
    const g = groups.get(key) ?? { key, items: [] }
    g.items.push(item)
    groups.set(key, g)
  }
  const rank = (g: Group) => Math.min(...g.items.map((i) => ['CRITICAL', 'HIGH', 'MODERATE', 'NO_DATA', 'LOW'].indexOf(i.status)))
  return [...groups.values()].sort((a, b) => rank(a) - rank(b))
}

function useIndicatorMetrics(astronautId: string) {
  return useAppStore(useShallow((s) => s.health[astronautId]?.metrics))
}

/**
 * Wraps the compact "in range" visual in a button that opens a breakdown: which indicators are
 * counted, grouped by body system, with the flagged and the missing ones named. Without this the
 * count alone does not say what it counts.
 */
export function IndicatorBreakdownTrigger({ astronautId, className, children }: { astronautId: string; className?: string; children: ReactNode }) {
  const t = useT()
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t('stage.ind.open')}
        onClick={() => setOpen((v) => !v)}
        className={clsx('focus-ring group flex min-w-0 items-center gap-2 rounded-lg text-left', className)}
      >
        {children}
        <Info size={13} className="shrink-0 text-ink-500 transition-colors group-hover:text-ink-200" aria-hidden />
      </button>
      <IndicatorBreakdown open={open} onClose={() => setOpen(false)} anchorRef={ref} astronautId={astronautId} />
    </>
  )
}

export function IndicatorBreakdown({ open, onClose, anchorRef, astronautId }: { open: boolean; onClose: () => void; anchorRef: RefObject<HTMLElement | null>; astronautId: string }) {
  const t = useT()
  const metrics = useIndicatorMetrics(astronautId)
  const name = useAppStore((s) => s.crew.find((a) => a.id === astronautId)?.callsign ?? astronautId)
  const selectRegion = useAppStore((s) => s.selectRegion)
  const sum = useMemo(() => summarizeIndicators(metrics), [metrics])
  const groups = useMemo(() => groupIndicators(metrics), [metrics])
  return (
    <FloatingPopover open={open} onClose={onClose} anchorRef={anchorRef} label={t('stage.ind.title', { name })} width={340} className="p-3.5">
      <div className="text-[13px] font-semibold text-ink-100">{t('stage.ind.title', { name })}</div>
      <p className="mt-1 text-[12px] leading-snug text-ink-300">{t('stage.ind.explain', { name })}</p>
      <div className="mt-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-ink-100">{t('stage.ind.summary', { ok: sum.ok, total: sum.total })}</div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {groups.map((g) => {
          const ok = g.items.filter((i) => i.status === 'LOW').length
          const named = g.items.filter((i) => i.status !== 'LOW')
          const clickable = g.key !== 'environment'
          const label = g.key === 'environment' ? t('stage.ind.environment') : regionLabel(g.key)
          const body = (
            <>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink-100">{label}</span>
              <span className="flex h-2 w-14 shrink-0 gap-[2px]" aria-hidden>
                {g.items.map((i) => (
                  <span
                    key={i.metric}
                    className={clsx('h-full flex-1 rounded-[1.5px]', i.status === 'NO_DATA' && 'border border-dashed')}
                    style={i.status === 'NO_DATA' ? { borderColor: STATUS_META.NO_DATA.color } : { background: STATUS_META[i.status].color }}
                  />
                ))}
              </span>
              <span className="w-9 shrink-0 text-right font-mono text-[11px] text-ink-300 tabular-nums">{ok}/{g.items.length}</span>
            </>
          )
          return (
            <li key={g.key}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => {
                    selectRegion(g.key as BodyRegionId)
                    onClose()
                  }}
                  title={t('stage.ind.showOnBody')}
                  className="focus-ring flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-white/[0.05]"
                >
                  {body}
                </button>
              ) : (
                <div className="flex w-full items-center gap-2 px-1.5 py-1">{body}</div>
              )}
              {named.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-1 pl-1.5">
                  {named.map((i) => (
                    <span
                      key={i.metric}
                      className={clsx('rounded px-1.5 py-0.5 text-[10.5px] font-semibold', i.status === 'NO_DATA' && 'border border-dashed')}
                      style={i.status === 'NO_DATA' ? { color: STATUS_META.NO_DATA.color, borderColor: STATUS_META.NO_DATA.color } : { color: STATUS_META[i.status].color, background: `color-mix(in srgb, ${STATUS_META[i.status].color} 14%, transparent)` }}
                    >
                      {metricLabel(i.metric)}
                    </span>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-[11px] leading-snug text-ink-400">{t('stage.ind.missingNote')}</p>
    </FloatingPopover>
  )
}
