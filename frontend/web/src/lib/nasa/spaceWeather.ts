import type { SpaceWeatherSnapshot } from '../../types/nasa'

/**
 * Loads recent space weather from NASA DONKI.
 * Placeholder: the backend wave replaces this with the API call and the bundled snapshot fallback.
 */
export async function loadSpaceWeather(): Promise<SpaceWeatherSnapshot> {
  return {
    data_origin: 'REAL_PUBLIC',
    source: 'NASA DONKI (CCMC)',
    sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    retrievedAt: new Date(0).toISOString(),
    window: { start: new Date(0).toISOString(), end: new Date(0).toISOString() },
    events: [],
    mode: 'snapshot',
  }
}
