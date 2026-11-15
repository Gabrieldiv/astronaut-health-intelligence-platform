import clsx from 'clsx'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../state/store'
import { STATUS_META } from '../../lib/status'
import type { MetricCode, MetricState, Status } from '../../types/domain'
import { useT } from '../../i18n'
import { metricLabel, metricShort } from '../../i18n/catalog'
import { summarizeIndicators } from './indicators'

/** How many flagged indicators are named next to the bar (the rest is a "+n"). */
const NAMED = 2

/**
 * Compact visual of the tracked indicators of one astronaut: one segment per indicator colored by
 * status (worst first, missing data hollow and dashed, never green), a short count and the names
 * of the flagged ones. Replaces the plain-language status sentence on screen; the sentence stays
 * available to assistive technology (see the Headline).
 */
export function IndicatorStrip({ astronautId, sentence, className }: { astronautId: string; sentence: string; className?: string }) {
  const t = useT()
  // one primitive per indicator, so the strip only re-renders when a status or availability changes
  const keys = useAppStore(
    useShallow((s) => Object.values(s.health[astronautId]?.metrics ?? {}).map((m) => (m ? `${m.metric}|${m.status}|${m.current == null ? 0 : 1}` : ''))),
  )
  const sum = useMemo(() => {
    const metrics: Partial<Record<MetricCode, MetricState>> = {}
    for (const k of keys) {
      if (!k) continue
      const [metric, status, has] = k.split('|') as [MetricCode, Status, string]
      metrics[metric] = { metric, status, current: has === '1' ? 1 : null } as MetricState
    }
    return summarizeIndicators(metrics)
  }, [keys])
  if (sum.total === 0) return null
  const flagged = sum.items.filter((i) => i.status !== 'LOW' && i.status !== 'NO_DATA')
  const aria = t('stage.ind.aria', { ok: sum.ok, total: sum.total, flagged: sum.flagged, missing: sum.missing })
  return (
    <div className={clsx('flex min-w-0 flex-1 items-center gap-2', className)} title={sentence}>
      {/* segments share the bar: it shrinks with the header instead of pushing the buttons out */}
      <div role="img" aria-label={aria} className="flex h-3.5 max-w-[150px] min-w-[40px] flex-1 items-stretch gap-[2px]">
        {sum.items.map((i) => {
          const meta = STATUS_META[i.status]
          return (
            <span
              key={i.metric}
              title={`${metricLabel(i.metric)}: ${meta.crewLabel}`}
              className={clsx('block max-w-[6px] min-w-[1.5px] flex-1 rounded-[1.5px]', i.status === 'NO_DATA' && 'border border-dashed')}
              style={i.status === 'NO_DATA' ? { borderColor: meta.color } : { background: meta.color, boxShadow: i.status === 'LOW' ? undefined : `0 0 6px ${meta.glow}` }}
            />
          )
        })}
      </div>
      <span aria-hidden className="shrink-0 font-mono text-[12px] font-medium whitespace-nowrap text-ink-300 tabular-nums">
        {t('stage.ind.inRange', { ok: sum.ok, total: sum.total })}
      </span>
      {flagged.length > 0 && (
        <span aria-hidden className="hidden min-w-0 items-center gap-1 overflow-hidden @min-[640px]/stage:flex">
          {flagged.slice(0, NAMED).map((i) => (
            <span
              key={i.metric}
              className="truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
              style={{ color: STATUS_META[i.status].color, background: `color-mix(in srgb, ${STATUS_META[i.status].color} 14%, transparent)` }}
            >
              {metricShort(i.metric)}
            </span>
          ))}
          {flagged.length > NAMED && <span className="text-[11px] text-ink-400">+{flagged.length - NAMED}</span>}
        </span>
      )}
      {sum.missing > 0 && (
        <span aria-hidden className="shrink-0 rounded-md border border-dashed border-nodata/50 px-1.5 py-0.5 text-[11px] whitespace-nowrap text-ink-400">
          {t('stage.ind.noData', { n: sum.missing })}
        </span>
      )}
    </div>
  )
}
