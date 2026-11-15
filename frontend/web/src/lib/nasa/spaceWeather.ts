import type { SpaceWeatherEvent, SpaceWeatherEventKind, SpaceWeatherSnapshot } from '../../types/nasa'
import { apiGet } from '../api/client'

/**
 * Loads recent space weather from NASA DONKI (REAL_PUBLIC context, not crew measurements).
 *
 * 1. Live: the AHI API (GET /api/v1/space-weather?days=30), which fetches DONKI and caches it.
 * 2. Offline demo mode: the bundled snapshot src/data/nasa/donki-snapshot.json, a real DONKI
 *    download written by `python -m app.cli donki-snapshot` (mode "snapshot", real retrievedAt).
 *
 * Never throws for a missing backend, and never invents events: either source is real DONKI data.
 */
export async function loadSpaceWeather(): Promise<SpaceWeatherSnapshot> {
  const now = Date.now()
  if (cache && now < cache.expires) return cache.value
  const value = loadUncached()
  // A live answer is reused for 5 minutes; the snapshot only for 1 minute so a backend started later is picked up.
  cache = { value, expires: now + 60_000 }
  value.then(
    (s) => {
      if (cache?.value === value) cache.expires = Date.now() + (s.mode === 'live' ? 5 * 60_000 : 60_000)
    },
    () => {
      if (cache?.value === value) cache = null
    },
  )
  return value
}

let cache: { value: Promise<SpaceWeatherSnapshot>; expires: number } | null = null

/** Test helper. */
export function resetSpaceWeatherCache(): void {
  cache = null
}

export const LIVE_TIMEOUT_MS = 4000

async function loadUncached(): Promise<SpaceWeatherSnapshot> {
  try {
    const live: unknown = await apiGet('/api/v1/space-weather', { query: { days: 30 }, timeoutMs: LIVE_TIMEOUT_MS })
    const snap = parseSnapshot(live)
    if (snap) return { ...snap, mode: 'live' }
  } catch {
    // Backend not running, disabled, timed out or DONKI unreachable from it: offline demo mode.
  }
  return loadBundledSnapshot()
}

/** The bundled real DONKI snapshot (loaded on demand, so it never weighs on the main bundle). */
export async function loadBundledSnapshot(): Promise<SpaceWeatherSnapshot> {
  const mod = await import('../../data/nasa/donki-snapshot.json')
  const snap = parseSnapshot(mod.default)
  if (!snap) throw new Error('Bundled DONKI snapshot is malformed')
  return { ...snap, mode: 'snapshot' }
}

const KINDS: ReadonlySet<SpaceWeatherEventKind> = new Set(['SOLAR_FLARE', 'SEP', 'CME', 'GEOMAGNETIC_STORM'])

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const strOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string'

function parseEvent(v: unknown): SpaceWeatherEvent | null {
  const e = v as Record<string, unknown> | null
  if (!e || typeof e !== 'object') return null
  if (!isStr(e.id) || !KINDS.has(e.kind as SpaceWeatherEventKind) || !isStr(e.startTime) || !isStr(e.link)) return null
  if (!strOrNull(e.peakTime ?? null) || !strOrNull(e.classType ?? null)) return null
  const kp = e.kpIndex ?? null
  if (kp !== null && (typeof kp !== 'number' || !Number.isFinite(kp))) return null
  return {
    id: e.id,
    kind: e.kind as SpaceWeatherEventKind,
    startTime: e.startTime,
    peakTime: (e.peakTime as string | null | undefined) ?? null,
    classType: (e.classType as string | null | undefined) ?? null,
    kpIndex: kp as number | null,
    link: e.link,
  }
}

/** Shape check of a SpaceWeatherSnapshot coming from the network or a file. Returns null when invalid. */
export function parseSnapshot(v: unknown): SpaceWeatherSnapshot | null {
  const s = v as Record<string, unknown> | null
  if (!s || typeof s !== 'object') return null
  if (s.data_origin !== 'REAL_PUBLIC' || s.source !== 'NASA DONKI (CCMC)') return null
  if (!isStr(s.sourceUrl) || !isStr(s.retrievedAt) || !Array.isArray(s.events)) return null
  const w = s.window as Record<string, unknown> | null
  if (!w || !isStr(w.start) || !isStr(w.end)) return null
  if (s.mode !== 'live' && s.mode !== 'snapshot') return null
  const events: SpaceWeatherEvent[] = []
  for (const raw of s.events) {
    const e = parseEvent(raw)
    if (!e) return null // one bad record means the payload is not what DONKI and the API promise
    events.push(e)
  }
  return {
    data_origin: 'REAL_PUBLIC',
    source: 'NASA DONKI (CCMC)',
    sourceUrl: s.sourceUrl,
    retrievedAt: s.retrievedAt,
    window: { start: w.start, end: w.end },
    events,
    mode: s.mode,
  }
}
