/**
 * Space weather advisory: real public NASA DONKI events (REAL_PUBLIC) read in the context of the
 * active mission profile. Pure function, no I/O: the UI loads the snapshot with
 * loadSpaceWeather() (src/lib/nasa/spaceWeather.ts) and passes it here.
 *
 * Significant events: a solar energetic particle event (DONKI SEP), or a strong flare (NOAA SWPC
 * class letter X, peak 0.1 to 0.8 nm flux of 1e-4 W/m2 or more), that started at most
 * SPACE_WEATHER.recentHours (demo configuration) before the data was retrieved.
 *
 * What it recommends (non diagnostic, follows the crew procedures):
 *  - outside the magnetosphere (Moon, Mars transit): move to the radiation storm shelter;
 *  - ISS: a monitoring note (Earth magnetic field shields most of it; follow flight control);
 *  - launch: a pre launch space weather note for the launch team.
 * With no significant event the advisory is calm. With no data yet it says so (missing data is
 * never shown as "all clear").
 */
import type { EngineMsg } from '../../types/domain'
import { msg, said } from '../msg'
import type { MissionProfileId, RiskLevel } from '../../types/domain'
import type { SpaceWeatherEvent, SpaceWeatherSnapshot } from '../../types/nasa'
import { SPACE_WEATHER } from '../config'
import { HOUR_MS } from '../text'
import { missionProfile } from './profiles'

export type SpaceWeatherAdvisoryKind = 'SHELTER' | 'MONITOR' | 'PRE_LAUNCH' | 'QUIET' | 'NO_DATA'

export interface SpaceWeatherAdvisory {
  kind: SpaceWeatherAdvisoryKind
  /** Operational attention level of the advisory (prototype, not a medical level). */
  level: RiskLevel | 'NO_DATA'
  profileId: MissionProfileId
  title: string
  body: string
  /** Who can act. Shelter is an onboard action that does not wait for Earth. */
  autonomy: 'ONBOARD' | 'GROUND_REVIEW' | null
  /** Significant recent events (most recent first). */
  triggers: SpaceWeatherEvent[]
  /** Link to the most recent triggering DONKI event (or the DONKI home when none). */
  link: string
  data_origin: 'REAL_PUBLIC'
  source: string
  sourceUrl: string
  retrievedAt: string | null
  mode: SpaceWeatherSnapshot['mode'] | null
  /** Number of events of any kind in the snapshot window. */
  eventCount: number
}

const DONKI_HOME = 'https://ccmc.gsfc.nasa.gov/DONKI/'

function isStrongFlare(e: SpaceWeatherEvent): boolean {
  if (e.kind !== 'SOLAR_FLARE' || !e.classType) return false
  const letter = e.classType.trim().charAt(0).toUpperCase()
  return SPACE_WEATHER.strongFlareClasses.includes(letter)
}

export function isSignificantEvent(e: SpaceWeatherEvent): boolean {
  return e.kind === 'SEP' || isStrongFlare(e)
}

/** Plain label of one event, e.g. "X1.2 solar flare" or "Solar energetic particle event". */
export function eventLabel(e: SpaceWeatherEvent): string {
  switch (e.kind) {
    case 'SOLAR_FLARE':
      return e.classType ? `${e.classType} solar flare` : 'Solar flare'
    case 'SEP':
      return 'Solar energetic particle event'
    case 'CME':
      return 'Coronal mass ejection'
    case 'GEOMAGNETIC_STORM':
      return e.kpIndex != null ? `Geomagnetic storm (Kp ${e.kpIndex})` : 'Geomagnetic storm'
  }
}

function retrievedMs(s: SpaceWeatherSnapshot): number | null {
  const t = Date.parse(s.retrievedAt)
  // The placeholder client returns the Unix epoch: treat it as "not loaded yet".
  return Number.isFinite(t) && t > 0 ? t : null
}

/** Significant events that started within the recent window before retrieval, newest first. */
export function recentSignificantEvents(s: SpaceWeatherSnapshot): SpaceWeatherEvent[] {
  const ref = retrievedMs(s)
  if (ref === null) return []
  const from = ref - SPACE_WEATHER.recentHours * HOUR_MS
  return s.events
    .filter((e) => {
      const t = Date.parse(e.startTime)
      return Number.isFinite(t) && t >= from && t <= ref + HOUR_MS && isSignificantEvent(e)
    })
    .sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime))
}

/** Structured twin of eventLabel (engine/msg.ts). */
function eventLabelMsg(e: SpaceWeatherEvent): EngineMsg {
  switch (e.kind) {
    case 'SOLAR_FLARE':
      return e.classType ? msg('sw.event.flareClass', { cls: e.classType }) : msg('sw.event.flare')
    case 'SEP':
      return msg('sw.event.sep')
    case 'CME':
      return msg('sw.event.cme')
    case 'GEOMAGNETIC_STORM':
      return e.kpIndex != null ? msg('sw.event.stormKp', { kp: String(e.kpIndex) }) : msg('sw.event.storm')
  }
}

function listEventsMsg(events: SpaceWeatherEvent[]): EngineMsg {
  const shown = events.slice(0, 2).map(eventLabelMsg)
  const list = shown.length === 2 ? msg('sw.two', { a: shown[0]!, b: shown[1]! }) : shown[0]!
  return events.length > 2 ? msg('sw.more', { list, n: events.length - 2 }) : list
}

function listEvents(events: SpaceWeatherEvent[]): string {
  const shown = events.slice(0, 2).map(eventLabel)
  const more = events.length > 2 ? ` and ${events.length - 2} more` : ''
  return `${shown.join(' and ')}${more}`
}

export function assessSpaceWeather(snapshot: SpaceWeatherSnapshot | null, profileId: MissionProfileId): SpaceWeatherAdvisory {
  const p = missionProfile(profileId)
  const base = {
    profileId,
    data_origin: 'REAL_PUBLIC' as const,
    source: snapshot?.source ?? 'NASA DONKI (CCMC)',
    sourceUrl: snapshot?.sourceUrl ?? DONKI_HOME,
    retrievedAt: snapshot && retrievedMs(snapshot) !== null ? snapshot.retrievedAt : null,
    mode: snapshot?.mode ?? null,
    eventCount: snapshot?.events.length ?? 0,
  }
  if (!snapshot || retrievedMs(snapshot) === null) {
    return {
      ...base,
      kind: 'NO_DATA',
      level: 'NO_DATA',
      title: said('Space weather not available yet', msg('sw.noData.title')),
      body: said(
        'No NASA DONKI data has been loaded. This is unknown, not "all clear": follow the space weather briefing from mission control.',
        msg('sw.noData.body'),
      ),
      autonomy: null,
      triggers: [],
      link: base.sourceUrl,
    }
  }
  const triggers = recentSignificantEvents(snapshot)
  if (triggers.length === 0) {
    return {
      ...base,
      kind: 'QUIET',
      level: 'LOW',
      title: said(`No major solar event in the last ${SPACE_WEATHER.recentHours} hours`, msg('sw.quiet.title', { h: SPACE_WEATHER.recentHours })),
      body: said(
        `No solar energetic particle event or X class flare in NASA DONKI in the ${SPACE_WEATHER.recentHours} h before the data was retrieved.`,
        msg('sw.quiet.body', { h: SPACE_WEATHER.recentHours }),
      ),
      autonomy: null,
      triggers: [],
      link: base.sourceUrl,
    }
  }
  const what = listEvents(triggers)
  const whatMsg = listEventsMsg(triggers)
  const link = triggers[0]!.link || base.sourceUrl
  if (p.radiation.outsideMagnetosphere) {
    return {
      ...base,
      kind: 'SHELTER',
      level: 'HIGH',
      title: said('Move to the radiation storm shelter', msg('sw.shelter.title')),
      body: said(
        `NASA DONKI reports a recent ${what}. ${p.shortLabel === 'Moon' ? 'On the Moon' : 'In deep space'} there is no Earth magnetic field to stop solar particles. ` +
          'Follow the shelter procedure now: move to the most shielded area, stop surface or extravehicular activity, and keep personal dosimeters on. ' +
          'Do not wait for Earth to confirm; report to mission control when you can.',
        msg(p.shortLabel === 'Moon' ? 'sw.shelter.bodyMoon' : 'sw.shelter.bodyDeep', { what: whatMsg }),
      ),
      autonomy: 'ONBOARD',
      triggers,
      link,
    }
  }
  if (profileId === 'LAUNCH') {
    return {
      ...base,
      kind: 'PRE_LAUNCH',
      level: 'MODERATE',
      title: said('Pre launch space weather note', msg('sw.launch.title')),
      body: said(
        `NASA DONKI reports a recent ${what}. The ascent dose is negligible, but the launch team should include space weather in the go or no go briefing and in the plan for the first days in orbit.`,
        msg('sw.launch.body', { what: whatMsg }),
      ),
      autonomy: 'GROUND_REVIEW',
      triggers,
      link,
    }
  }
  return {
    ...base,
    kind: 'MONITOR',
    level: 'MODERATE',
    title: said('Monitor radiation: solar event reported', msg('sw.monitor.title')),
    body: said(
      `NASA DONKI reports a recent ${what}. In low Earth orbit the magnetic field shields most of it. Keep monitoring the dosimeters and follow flight control guidance about shielded areas and spacewalks.`,
      msg('sw.monitor.body', { what: whatMsg }),
    ),
    autonomy: 'GROUND_REVIEW',
    triggers,
    link,
  }
}
