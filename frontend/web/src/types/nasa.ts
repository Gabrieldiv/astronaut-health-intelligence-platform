/**
 * Contract for public NASA data used as context (not astronaut measurements).
 * Space weather comes from NASA DONKI (Space Weather Database Of Notifications,
 * Knowledge, Information), published by the CCMC at NASA Goddard.
 */

export type SpaceWeatherEventKind = 'SOLAR_FLARE' | 'SEP' | 'CME' | 'GEOMAGNETIC_STORM'

export interface SpaceWeatherEvent {
  /** DONKI activity id, e.g. "2026-11-10T04:12:00-FLR-001". */
  id: string
  kind: SpaceWeatherEventKind
  /** ISO 8601 UTC. */
  startTime: string
  peakTime: string | null
  /** Flare class such as "X1.2" (flares only). */
  classType: string | null
  /** Highest Kp index reported (geomagnetic storms only). */
  kpIndex: number | null
  /** DONKI web page of the event. */
  link: string
}

export interface SpaceWeatherSnapshot {
  data_origin: 'REAL_PUBLIC'
  source: 'NASA DONKI (CCMC)'
  sourceUrl: string
  /** ISO 8601 UTC time the data was fetched from DONKI. */
  retrievedAt: string
  window: { start: string; end: string }
  events: SpaceWeatherEvent[]
  /** "live": fetched now through the backend; "snapshot": bundled copy for offline demos. */
  mode: 'live' | 'snapshot'
}
