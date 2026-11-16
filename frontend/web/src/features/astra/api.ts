/**
 * ASTRA transport: builds the request from the virtual crew history and calls the AHI API.
 * Every failure becomes an "offline" or "error" outcome: the app never depends on ASTRA.
 */
import { apiBaseUrl } from '../../lib/api/client'
import { networkAllowed } from '../../lib/api/connectivity'
import crewHistory from '../../data/astra/crewHistory.json'
import type { AstraDay, AstraOutcome, AstraResult } from './types'

interface HistoryRow {
  date: string
  phase: AstraDay['phase']
  rel_day: number
  values: Record<string, number | null>
}

const CREW = crewHistory.crew as unknown as Record<string, HistoryRow[]>
/** Days replaced by a scenario, per scenario id and astronaut (scenarios start at mission day 44, like the simulation). */
const OVERLAYS = crewHistory.scenario_changes as unknown as Record<string, Record<string, HistoryRow[]> | undefined>
/** Last mission day covered by the virtual history. */
export const ASTRA_LAST_DAY: number = crewHistory.last_day
const TIMEOUT_MS = 8000

/**
 * Days to send for one astronaut: the pre flight baseline plus the mission up to missionDay.
 * An active scenario replaces the days it changes (same dates) with its virtual values.
 * The virtual history ends at ASTRA_LAST_DAY; later mission days reuse it and report capped = true.
 * Only date, phase and values are sent: the API rejects extra fields.
 */
export function astraRequestDays(missionDay: number, astronautId: string, scenarioId = 'NOMINAL'): { days: AstraDay[]; capped: boolean } {
  const limit = Math.min(missionDay, ASTRA_LAST_DAY)
  const changed = new Map((OVERLAYS[scenarioId]?.[astronautId] ?? []).map((r) => [r.rel_day, r]))
  const rows = CREW[astronautId] ?? []
  const days = rows
    .filter((r) => r.rel_day <= limit)
    .map((r) => {
      const row = changed.get(r.rel_day) ?? r
      return { date: row.date, phase: row.phase, values: row.values }
    })
  return { days, capped: missionDay > ASTRA_LAST_DAY }
}

export async function fetchAstra(astronautId: string, missionDay: number, scenarioId: string, signal?: AbortSignal): Promise<AstraOutcome> {
  const base = apiBaseUrl()
  if (base === null || !networkAllowed()) return { kind: 'offline' }
  if (signal?.aborted) return { kind: 'offline' }
  const { days, capped } = astraRequestDays(missionDay, astronautId, scenarioId)
  if (days.length === 0) return { kind: 'error' }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort)
  try {
    const res = await fetch(`${base}/api/v1/analytics/deviation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ subject_id: astronautId, days }),
      signal: ctrl.signal,
    })
    if (!res.ok) return { kind: 'error' }
    const body = (await res.json()) as { results?: AstraResult[] }
    const last = body.results?.[body.results.length - 1]
    if (!last) return { kind: 'error' }
    return { kind: 'ok', result: last, dayCount: days.length, capped }
  } catch {
    return { kind: 'offline' }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
