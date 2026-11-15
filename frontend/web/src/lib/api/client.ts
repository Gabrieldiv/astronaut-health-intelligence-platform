/**
 * Typed client for the optional AHI API (backend/). Types come from the OpenAPI schema
 * (src/types/api.gen.ts, regenerated with `npm run api:types`).
 *
 * The app never depends on the API: every caller has an offline path. Configure the base URL with
 * VITE_API_URL (default http://localhost:8000); set VITE_API_URL=off for static hosting so the app
 * goes straight to offline demo mode without any network attempt.
 */
import type { components, paths } from '../../types/api.gen'

export type ApiSchemas = components['schemas']
export type ApiHealth = ApiSchemas['HealthStatus']
export type ApiOsdrStudyList = ApiSchemas['OsdrStudyList']
export type ApiOsdrStudy = ApiSchemas['OsdrStudy']

const DEFAULT_API_URL = 'http://localhost:8000'
export const DEFAULT_TIMEOUT_MS = 3500

/** Base URL of the API, or null when the API is disabled for this build. */
export function apiBaseUrl(): string | null {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (raw && ['off', 'none', 'false', '0'].includes(raw.toLowerCase())) return null
  return (raw || DEFAULT_API_URL).replace(/\/+$/, '')
}

export class ApiError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type GetPaths = { [P in keyof paths]: paths[P] extends { get: object } ? P : never }[keyof paths]
type GetOp<P extends GetPaths> = paths[P]['get']
type QueryOf<P extends GetPaths> = GetOp<P> extends { parameters: { query?: infer Q } } ? Q : never
export type GetResponse<P extends GetPaths> = GetOp<P> extends { responses: { 200: { content: { 'application/json': infer R } } } } ? R : never

export interface GetOptions<P extends GetPaths> {
  query?: QueryOf<P>
  timeoutMs?: number
  signal?: AbortSignal
}

/** GET a path of the API with a hard timeout. Throws ApiError on network failure, timeout or non 2xx. */
export async function apiGet<P extends GetPaths>(path: P, opts: GetOptions<P> = {}): Promise<GetResponse<P>> {
  const base = apiBaseUrl()
  if (base === null) throw new ApiError('API disabled for this build (VITE_API_URL=off)')
  const url = new URL(base + path)
  for (const [k, v] of Object.entries((opts.query ?? {}) as Record<string, unknown>)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const onAbort = () => ctrl.abort()
  opts.signal?.addEventListener('abort', onAbort, { once: true })
  try {
    let res: Response
    try {
      res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    } catch (e) {
      throw new ApiError(ctrl.signal.aborted ? 'API request timed out' : `API unreachable (${e instanceof Error ? e.message : String(e)})`)
    }
    if (!res.ok) {
      let detail = ''
      try {
        const body = (await res.json()) as { detail?: unknown }
        if (typeof body.detail === 'string') detail = `: ${body.detail}`
      } catch {
        /* body is not JSON */
      }
      throw new ApiError(`API answered HTTP ${res.status}${detail}`, res.status)
    }
    try {
      return (await res.json()) as GetResponse<P>
    } catch {
      throw new ApiError('API answered with invalid JSON', res.status)
    }
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', onAbort)
  }
}

export type BackendStatus =
  | { kind: 'connected'; baseUrl: string; health: ApiHealth; checkedAt: string }
  | { kind: 'offline'; baseUrl: string | null; reason: string; checkedAt: string }

function isHealth(v: unknown): v is ApiHealth {
  const h = v as Partial<ApiHealth> | null
  return !!h && h.service === 'ahi-api' && (h.status === 'ok' || h.status === 'degraded')
}

const STATUS_TTL_MS = 30_000
let statusCache: { at: number; value: Promise<BackendStatus> } | null = null

/**
 * Detects whether the AHI API is reachable. Never throws: an unreachable API is "offline demo mode".
 * The answer is reused for 30 s so several panels do not probe at once.
 */
export function getBackendStatus(opts: { force?: boolean; timeoutMs?: number } = {}): Promise<BackendStatus> {
  const now = Date.now()
  if (!opts.force && statusCache && now - statusCache.at < STATUS_TTL_MS) return statusCache.value
  const value = probe(opts.timeoutMs ?? 2500)
  statusCache = { at: now, value }
  return value
}

async function probe(timeoutMs: number): Promise<BackendStatus> {
  const baseUrl = apiBaseUrl()
  const checkedAt = new Date().toISOString()
  if (baseUrl === null) return { kind: 'offline', baseUrl, reason: 'API disabled for this build', checkedAt }
  try {
    const health = await apiGet('/api/v1/health', { timeoutMs })
    if (!isHealth(health)) return { kind: 'offline', baseUrl, reason: 'The server at this address is not the AHI API', checkedAt }
    return { kind: 'connected', baseUrl, health, checkedAt }
  } catch (e) {
    return { kind: 'offline', baseUrl, reason: e instanceof Error ? e.message : String(e), checkedAt }
  }
}

/** Test helper: forget the cached backend status. */
export function resetBackendStatusCache(): void {
  statusCache = null
}

/** Human studies from NASA OSDR through the API (REAL_PUBLIC context). Throws ApiError when unavailable. */
export function fetchOsdrStudies(q = 'astronaut', size = 8, signal?: AbortSignal): Promise<ApiOsdrStudyList> {
  return apiGet('/api/v1/nasa/osdr/studies', { query: { q, size }, timeoutMs: 8000, signal })
}
