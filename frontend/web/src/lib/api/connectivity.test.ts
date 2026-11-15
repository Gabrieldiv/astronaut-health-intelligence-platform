import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet, getBackendStatus, resetBackendStatusCache } from './client'
import {
  CONNECTIVITY_STORAGE_KEY,
  chipState,
  getConnectivityMode,
  networkAllowed,
  parseMode,
  resolveMode,
  setConnectivityMode,
  useConnectivity,
  type ConnectivityMode,
} from './connectivity'
import { loadSpaceWeather, resetSpaceWeatherCache } from '../nasa/spaceWeather'
import type { BackendStatus } from './client'

const health = { status: 'ok', service: 'ahi-api', version: '0.1.0', database: 'ok', database_backend: 'sqlite', time: '2026-11-15T04:00:00Z' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const connected: BackendStatus = { kind: 'connected', baseUrl: 'http://localhost:8000', health: health as never, checkedAt: '' }
const down: BackendStatus = { kind: 'offline', baseUrl: 'http://localhost:8000', reason: 'API unreachable', checkedAt: '' }

function useMode(m: ConnectivityMode) {
  useConnectivity.setState({ chosen: m, backend: null })
}

describe('connectivity mode logic', () => {
  beforeEach(() => {
    resetBackendStatusCache()
    resetSpaceWeatherCache()
    useMode('auto')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    useMode('auto')
  })

  it('parses stored values and defaults to automatic', () => {
    expect(parseMode('online')).toBe('online')
    expect(parseMode('offline')).toBe('offline')
    expect(parseMode('auto')).toBe('auto')
    expect(parseMode('ONLINE')).toBe('auto')
    expect(parseMode(null)).toBe('auto')
    expect(parseMode(42)).toBe('auto')
  })

  it('lets VITE_API_URL=off force offline over any choice', () => {
    expect(resolveMode('online', true)).toEqual({ mode: 'offline', forced: true })
    expect(resolveMode('auto', false)).toEqual({ mode: 'auto', forced: false })
    useMode('online')
    vi.stubEnv('VITE_API_URL', 'off')
    expect(getConnectivityMode()).toBe('offline')
    expect(networkAllowed()).toBe(false)
  })

  it('maps mode and probe to the top bar chip', () => {
    expect(chipState('offline', connected)).toBe('offline-demo')
    expect(chipState('auto', null)).toBe('checking')
    expect(chipState('auto', connected)).toBe('live')
    expect(chipState('online', connected)).toBe('live')
    expect(chipState('auto', down)).toBe('offline-demo')
    expect(chipState('online', down)).toBe('unreachable')
  })

  it('persists the choice and survives blocked storage', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } })
    setConnectivityMode('offline')
    expect(store.get(CONNECTIVITY_STORAGE_KEY)).toBe('offline')
    expect(getConnectivityMode()).toBe('offline')

    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => {
          throw new Error('blocked')
        },
      },
    })
    expect(() => setConnectivityMode('online')).not.toThrow()
    expect(getConnectivityMode()).toBe('online')
  })

  it('offline mode never touches the network', async () => {
    const fetchMock = vi.fn(async () => json(health))
    vi.stubGlobal('fetch', fetchMock)
    useMode('offline')
    await expect(apiGet('/api/v1/health')).rejects.toBeInstanceOf(ApiError)
    const status = await getBackendStatus({ force: true })
    expect(status.kind).toBe('offline')
    const weather = await loadSpaceWeather()
    expect(weather.mode).toBe('snapshot')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(useConnectivity.getState().backend?.kind).toBe('offline')
  })

  it('online mode reports an unreachable API and still serves the bundled snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    useMode('online')
    const status = await getBackendStatus()
    expect(status.kind).toBe('offline')
    expect(chipState(getConnectivityMode(), useConnectivity.getState().backend)).toBe('unreachable')
    const weather = await loadSpaceWeather()
    expect(weather.mode).toBe('snapshot')
  })

  it('a mode change invalidates the cached backend status', async () => {
    const fetchMock = vi.fn(async () => json(health))
    vi.stubGlobal('fetch', fetchMock)
    useMode('offline')
    expect((await getBackendStatus()).kind).toBe('offline')
    setConnectivityMode('auto')
    expect(useConnectivity.getState().backend).toBeNull()
    expect((await getBackendStatus()).kind).toBe('connected')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(chipState(getConnectivityMode(), useConnectivity.getState().backend)).toBe('live')
  })
})
