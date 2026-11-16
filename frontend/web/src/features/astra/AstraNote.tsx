import { Activity } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppStore } from '../../state/store'
import { useT } from '../../i18n'
import { Badge } from '../../components/ui'
import { ASTRA_LAST_DAY, fetchAstra } from './api'
import type { AstraLevel, AstraOutcome } from './types'

const TONE: Record<AstraLevel, 'neutral' | 'warn' | 'muted'> = { LOW: 'neutral', MODERATE: 'warn', HIGH: 'warn', NO_DATA: 'muted' }

/** Successful answers per scenario, astronaut and mission day, so switching astronauts never repeats a call. */
const cache = new Map<string, AstraOutcome>()

/**
 * Deviation from the personal baseline (ASTRA), computed by the AHI API from the virtual crew history.
 * Shown only when the API answers: offline mode, an unreachable API or any error render nothing.
 * Neutral styling on purpose: it never changes the status shown elsewhere.
 */
export function AstraNote({ astronautId }: { astronautId: string }) {
  const t = useT()
  const missionDay = useAppStore((s) => s.missionDays[astronautId]?.at(-1)?.missionDay)
  const scenarioId = useAppStore((s) => s.clock.scenarioId)
  const [fetched, setFetched] = useState<{ key: string; outcome: AstraOutcome } | null>(null)
  const key = `${scenarioId}:${astronautId}:${missionDay}`

  useEffect(() => {
    if (missionDay === undefined || cache.has(key)) return
    const ctrl = new AbortController()
    void fetchAstra(astronautId, missionDay, scenarioId, ctrl.signal).then((result) => {
      if (ctrl.signal.aborted) return
      if (result.kind === 'ok') cache.set(key, result)
      setFetched({ key, outcome: result })
    })
    return () => ctrl.abort()
  }, [astronautId, missionDay, scenarioId, key])

  const outcome = cache.get(key) ?? (fetched?.key === key ? fetched.outcome : null)
  if (outcome?.kind !== 'ok') return null
  const { result, dayCount, capped } = outcome
  return (
    <div role="note" aria-label={t('attention.astra.aria')} className="mt-2 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-accent/25">
      <div className="flex flex-wrap items-center gap-1.5">
        <Activity size={14} className="shrink-0 text-accent" aria-hidden />
        <span className="text-[13px] font-semibold text-ink-100">{t('attention.astra.title')}</span>
        <Badge tone={TONE[result.level]}>{t(`attention.astra.level.${result.level}`)}</Badge>
      </div>
      {result.message && <p className="mt-1.5 text-[13px] leading-snug text-ink-300">{result.message}</p>}
      {result.multivariate_flag && <p className="mt-1.5 text-[11px] leading-snug text-ink-300">{t('attention.astra.unusual')}</p>}
      {capped && <p className="mt-1.5 text-[11px] leading-snug text-ink-300">{t('attention.astra.capped', { day: ASTRA_LAST_DAY })}</p>}
      <p className="mt-2 text-[10px] leading-snug text-ink-500">{t('attention.astra.virtual')}</p>
      <p className="text-[10px] leading-snug text-ink-500">{t('attention.astra.note', { n: dayCount })}</p>
    </div>
  )
}
