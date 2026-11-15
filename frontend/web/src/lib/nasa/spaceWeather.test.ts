import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import snapshotJson from '../../data/nasa/donki-snapshot.json'
import { loadBundledSnapshot, loadSpaceWeather, parseSnapshot, resetSpaceWeatherCache } from './spaceWeather'

const liveBody = {
  data_origin: 'REAL_PUBLIC',
  source: 'NASA DONKI (CCMC)',
  sourceUrl: 'https://ccmc.gsfc.nasa.gov/DONKI/',
  retrievedAt: '2026-11-15T04:00:00Z',
  window: { start: '2026-10-16T00:00:00Z', end: '2026-11-15T04:00:00Z' },
  events: [
    {
      id: '2026-11-14T21:16:00-FLR-001',
      kind: 'SOLAR_FLARE',
      startTime: '2026-11-14T21:16:00Z',
      peakTime: '2026-11-14T21:27:00Z',
      classType: 'C2.8',
      kpIndex: null,
      link: 'https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/49559/-1',
    },
  ],
  mode: 'live',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('bundled DONKI snapshot', () => {
  it('is a valid REAL_PUBLIC snapshot with real DONKI ids and links', async () => {
    const snap = await loadBundledSnapshot()
    expect(snap.mode).toBe('snapshot')
    expect(snap.data_origin).toBe('REAL_PUBLIC')
    expect(Number.isNaN(Date.parse(snap.retrievedAt))).toBe(false)
    expect(snap.events.length).toBe(snapshotJson.events.length)
    for (const e of snap.events) {
      expect(e.id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-(FLR|SEP|CME|GST)-\d{3}$/)
      expect(e.link).toMatch(/^https:\/\/(kauai\.)?ccmc\.gsfc\.nasa\.gov\/DONKI\/view\//)
      expect(Date.parse(e.startTime) >= Date.parse(snap.window.start)).toBe(true)
    }
  })
})

describe('parseSnapshot', () => {
  it('accepts the contract and rejects anything else', () => {
    expect(parseSnapshot(liveBody)?.events).toHaveLength(1)
    expect(parseSnapshot({ ...liveBody, data_origin: 'SIMULATED' })).toBeNull()
    expect(parseSnapshot({ ...liveBody, events: [{ id: 'x' }] })).toBeNull()
    expect(parseSnapshot({ ...liveBody, window: null })).toBeNull()
    expect(parseSnapshot(null)).toBeNull()
  })
})

describe('loadSpaceWeather', () => {
  beforeEach(() => resetSpaceWeatherCache())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('uses the backend when it answers', async () => {
    const fetchMock = vi.fn(async () => json(liveBody))
    vi.stubGlobal('fetch', fetchMock)
    const snap = await loadSpaceWeather()
    expect(snap.mode).toBe('live')
    expect(snap.events[0]!.classType).toBe('C2.8')
    const url = new URL(String((fetchMock.mock.calls[0] as unknown[])[0]))
    expect(url.pathname).toBe('/api/v1/space-weather')
    expect(url.searchParams.get('days')).toBe('30')
    // Cached: a second call does not hit the network.
    await loadSpaceWeather()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to the bundled snapshot when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    const snap = await loadSpaceWeather()
    expect(snap.mode).toBe('snapshot')
    expect(snap.retrievedAt).toBe(snapshotJson.retrievedAt)
  })

  it('falls back when DONKI is down behind the backend (HTTP 502)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'DONKI GST answered HTTP 503' }, 502)))
    expect((await loadSpaceWeather()).mode).toBe('snapshot')
  })

  it('falls back when the backend answers an unexpected payload', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ hello: 'world' })))
    expect((await loadSpaceWeather()).mode).toBe('snapshot')
  })

  it('falls back after the timeout when the backend hangs', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
          }),
      ),
    )
    const pending = loadSpaceWeather()
    await vi.advanceTimersByTimeAsync(5000)
    expect((await pending).mode).toBe('snapshot')
  })
})
