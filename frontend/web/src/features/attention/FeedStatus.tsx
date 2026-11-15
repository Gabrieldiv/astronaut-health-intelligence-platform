import clsx from 'clsx'
import { CircleDashed, CirclePause, Play, WifiOff } from 'lucide-react'
import { useMemo } from 'react'
import { useAppStore } from '../../state/store'
import type { MetricCode, Status } from '../../types/domain'
import { useT } from '../../i18n'
import { StatusPill } from '../../components/Status'
import { STATUS_META } from '../../lib/status'
import { DEVICE_STATE_META } from '../vitals/deviceMeta'
import { metricFeedState, pausedFeeders, type FeedState } from './feedState'

/** Neutral color of an operator pause (a decision, not a fault), shared with the device list. */
export const PAUSED_COLOR = DEVICE_STATE_META.PAUSED.color

export function useFeedState(astronautId: string, metric: MetricCode): FeedState {
  return useAppStore((s) => metricFeedState(s.health[astronautId]?.metrics[metric], s.devices, astronautId, metric))
}

/** Feed state of a whole region: PAUSED or WAITING only when every metric without data says so. */
export function useRegionFeedState(astronautId: string, metrics: MetricCode[]): FeedState {
  const key = metrics.join(',')
  return useAppStore((s) => {
    const states = key ? key.split(',').map((m) => metricFeedState(s.health[astronautId]?.metrics[m as MetricCode], s.devices, astronautId, m as MetricCode)) : []
    const missing = states.filter((x) => x !== 'LIVE')
    if (missing.length === 0) return 'LIVE'
    if (missing.every((x) => x === 'PAUSED')) return 'PAUSED'
    if (missing.every((x) => x === 'PAUSED' || x === 'WAITING')) return 'WAITING'
    return 'LOST'
  })
}

const FEED_ICON = { PAUSED: CirclePause, WAITING: CircleDashed, LOST: WifiOff } as const
const feedColor = (f: Exclude<FeedState, 'LIVE'>) => (f === 'PAUSED' ? PAUSED_COLOR : STATUS_META.NO_DATA.color)

/** "Paused by operator" / "Waiting for data" / "Signal lost" with its icon, in a neutral color. */
export function FeedLabel({ feed, size = 13, className }: { feed: Exclude<FeedState, 'LIVE'>; size?: number; className?: string }) {
  const t = useT()
  const Icon = FEED_ICON[feed]
  return (
    <span className={clsx('inline-flex items-center gap-1 font-semibold', className)} style={{ color: feedColor(feed) }}>
      <Icon size={size} aria-hidden className={clsx('shrink-0', feed === 'WAITING' && 'animate-pulse')} />
      {t(`visual.feed.${feed}`)}
    </span>
  )
}

/** Region status pill that says a pause or a resume as such, never "Signal lost". */
export function FeedAwareStatusPill({ astronautId, metrics, status, size }: { astronautId: string; metrics: MetricCode[]; status: Status; size?: 'sm' | 'md' }) {
  const feed = useRegionFeedState(astronautId, metrics)
  if (status !== 'NO_DATA' || feed === 'LIVE' || feed === 'LOST') return <StatusPill status={status} size={size} />
  return (
    <span
      className={clsx('inline-flex shrink-0 items-center rounded-full border border-dashed whitespace-nowrap', size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs')}
      style={{ borderColor: `color-mix(in srgb, ${feedColor(feed)} 50%, transparent)` }}
    >
      <FeedLabel feed={feed} size={12} />
    </span>
  )
}

/**
 * Inline notice when a device feeding these metrics is paused by an operator, with the Resume
 * action right there. After Resume the rows show "Waiting for data" until the first reading.
 */
export function PausedNotice({ astronautId, metrics, className }: { astronautId: string; metrics: MetricCode[]; className?: string }) {
  const devices = useAppStore((s) => s.devices)
  const setDevicePaused = useAppStore((s) => s.setDevicePaused)
  const key = metrics.join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key stands for the metrics list
  const paused = useMemo(() => pausedFeeders(devices, astronautId, metrics), [devices, astronautId, key])
  const t = useT()
  if (paused.length === 0) return null
  return (
    <ul className={clsx('flex flex-col gap-1.5', className)} aria-label={t('visual.feed.PAUSED')}>
      {paused.map((d) => (
        <li
          key={d.id}
          className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2"
          style={{ borderColor: `color-mix(in srgb, ${PAUSED_COLOR} 45%, transparent)`, background: `color-mix(in srgb, ${PAUSED_COLOR} 6%, transparent)` }}
        >
          <span className="min-w-0 flex-1">
            <FeedLabel feed="PAUSED" className="text-[12px]" />
            <span className="block truncate text-[11px] text-ink-500">{d.name}</span>
            <span className="sr-only">{t('visual.feed.pausedHint')}</span>
          </span>
          <button
            type="button"
            onClick={() => setDevicePaused(d.id, false, 'operator')}
            aria-label={t('visual.resumeAria', { device: d.name })}
            className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/[0.07] px-2.5 py-1 text-[12px] font-semibold text-ink-100 ring-1 ring-white/10 hover:bg-white/[0.12]"
          >
            <Play size={12} aria-hidden /> {t('visual.resume')}
          </button>
        </li>
      ))}
    </ul>
  )
}
