import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiBaseUrl, apiGet, getBackendStatus, resetBackendStatusCache } from './client'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const health = { status: 'ok', service: 'ahi-api', version: '0.1.0', database: 'ok', database_backend: 'sqlite', time: '2026-11-15T04:00:00Z' }

describe('api client', () => {
  beforeEach(() => resetBackendStatusCache())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('defaults to localhost:8000 and can be disabled', () => {
    expect(apiBaseUrl()).toBe('http://localhost:8000')
    vi.stubEnv('VITE_API_URL', 'https://api.example.org/')
    expect(apiBaseUrl()).toBe('https://api.example.org')
    vi.stubEnv('VITE_API_URL', 'off')
    expect(apiBaseUrl()).toBeNull()
  })

  it('builds the query string and returns JSON', async () => {
    const fetchMock = vi.fn(async () => json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    await apiGet('/api/v1/nasa/osdr/studies', { query: { q: 'sleep', size: 3 } })
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]))
    expect(url.pathname).toBe('/api/v1/nasa/osdr/studies')
    expect(url.searchParams.get('q')).toBe('sleep')
    expect(url.searchParams.get('size')).toBe('3')
  })

  it('turns HTTP errors into ApiError with the server detail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'OSDR answered HTTP 500' }, 502)))
    const err = await apiGet('/api/v1/nasa/osdr/studies').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(502)
    expect((err as ApiError).message).toContain('OSDR answered HTTP 500')
  })

  it('reports connected when /health answers as the AHI API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(health)))
    const s = await getBackendStatus()
    expect(s.kind).toBe('connected')
  })

  it('reports offline (never throws) when unreachable, foreign or disabled', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    expect((await getBackendStatus()).kind).toBe('offline')

    vi.stubGlobal('fetch', vi.fn(async () => json({ hello: 'world' })))
    const foreign = await getBackendStatus({ force: true })
    expect(foreign.kind === 'offline' && foreign.reason).toContain('not the AHI API')

    const fetchMock = vi.fn(async () => json(health))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('VITE_API_URL', 'off')
    expect((await getBackendStatus({ force: true })).kind).toBe('offline')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reuses a recent status', async () => {
    const fetchMock = vi.fn(async () => json(health))
    vi.stubGlobal('fetch', fetchMock)
    await getBackendStatus()
    await getBackendStatus()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
