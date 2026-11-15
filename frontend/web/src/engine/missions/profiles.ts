/**
 * Mission profiles: four mission contexts with different exposure.
 *
 * Every reference number below comes from a published source listed in sources.ts (the
 * `sources` of each Cited value). Numbers marked `derived` are simple arithmetic on cited
 * values (for example light time = distance / speed of light, or µGy/day / 24 = µGy/h), and
 * the note says how. Hazard levels (DOMINANT / PRESENT / MINOR) are a qualitative reading of
 * the NASA five hazards for this demo, not a NASA classification.
 *
 * Health risk grows with exposure time and distance: the dose is rate x time, and the farther
 * the crew is, the longer Earth needs to answer and the less help can reach them.
 */
import type { CommProfileId, MissionProfileId } from '../../types/domain'
import type { MissionSourceId } from './sources'

/** Speed of light in vacuum (exact SI definition), used for derived light times. */
export const SPEED_OF_LIGHT_KM_S = 299_792.458

export interface Cited<T> {
  value: T
  sources: MissionSourceId[]
  /** How the value was read or derived, in plain words. */
  note?: string
  /** True when the value is arithmetic on cited values (not printed as such in the source). */
  derived?: boolean
}

/** The NASA five hazards of human spaceflight plus the launch specific loads. */
export type HazardId = 'RADIATION' | 'ISOLATION' | 'DISTANCE' | 'GRAVITY' | 'CLOSED_ENV' | 'ACCELERATION' | 'VIBRATION_NOISE'

export type HazardLevel = 'DOMINANT' | 'PRESENT' | 'MINOR'

export interface HazardExposure {
  id: HazardId
  level: HazardLevel
  /** Plain language: what it means in this context. */
  why: string
}

export interface MissionProfile {
  id: MissionProfileId
  label: string
  shortLabel: string
  /** Vehicle or place, e.g. "Spacecraft in deep space". */
  vehicle: string
  /** One plain sentence. */
  summary: string
  /** What this environment does to the body, plain language first. */
  bodyEffects: string[]
  radiation: {
    /** Reference absorbed dose rate (µGy/h). null = negligible for this phase. */
    absorbedUGyPerHour: Cited<number> | null
    /** Reference dose equivalent rate (mSv/day), from the same measurement where possible. */
    doseEquivalentMSvPerDay: Cited<number> | null
    /** Published typical effective dose range (mSv/day), when available. */
    effectiveMSvPerDayRange?: Cited<[number, number]>
    /** Outside the protection of Earth's magnetic field (solar particle events reach the crew). */
    outsideMagnetosphere: boolean
    /** Where the reference was measured, plain words. */
    measuredWhere: string
    plain: string
  }
  gravity: Cited<{ g: number; label: string }>
  distanceKm: Cited<{ min: number; max: number; label: string }>
  /** One way light time from Earth (seconds). */
  oneWayDelaySec: Cited<{ min: number; max: number; label: string }>
  /** Earth link used by the comm model when this profile is selected. */
  defaultCommProfileId: CommProfileId
  duration: Cited<{ days: number; label: string }>
  hazards: HazardExposure[]
  /** Context countermeasures (non diagnostic, general practice for this environment). */
  countermeasures: string[]
  /** What the delay means for decisions, plain words. */
  autonomy: string
}

const lightSec = (km: number) => km / SPEED_OF_LIGHT_KM_S
const MILE_KM = 1.609344

export const MISSION_PROFILES: Record<MissionProfileId, MissionProfile> = {
  LAUNCH: {
    id: 'LAUNCH',
    label: 'Launch and ascent',
    shortLabel: 'Launch',
    vehicle: 'Crew vehicle on ascent (simulated)',
    summary: 'Minutes of powered flight: strong acceleration, vibration and noise, then the switch to weightlessness.',
    bodyEffects: [
      'Acceleration presses the body into the seat (chest to back), making breathing and reaching harder for a few minutes.',
      'Vibration and loud noise make it harder to read displays and talk.',
      'Right after engine cutoff the body becomes weightless: fluids move toward the head and many people feel space motion sickness in the first days.',
      'Radiation during the ascent itself is negligible: it lasts minutes.',
    ],
    radiation: {
      absorbedUGyPerHour: null,
      doseEquivalentMSvPerDay: null,
      outsideMagnetosphere: false,
      measuredWhere: 'Not measured separately: the powered flight lasts minutes.',
      plain: 'Negligible. Powered flight lasts minutes, so the dose of the ascent itself is tiny compared with the days in orbit that follow.',
    },
    gravity: {
      value: { g: 3, label: 'Up to about 3 g during ascent, then weightless' },
      sources: ['BAGIAN_1993_ASCENT_G'],
      note: 'Space Shuttle ascent accelerations range up to +3 Gx (chest to back).',
    },
    distanceKm: {
      value: { min: 0, max: 400, label: 'From the pad up to low Earth orbit (about 400 km)' },
      sources: ['NASA_ISS_ALTITUDE'],
      note: 'Upper end set to the ISS orbit altitude.',
    },
    oneWayDelaySec: {
      value: { min: 0, max: lightSec(400), label: 'Near zero' },
      sources: ['NASA_ISS_ALTITUDE'],
      derived: true,
      note: 'Light time over 400 km is about 1 ms. Relay networks add some latency.',
    },
    defaultCommProfileId: 'ISS',
    duration: {
      value: { days: 8.5 / 1440, label: 'About 8.5 minutes of powered flight' },
      sources: ['NASA_SHUTTLE_ENGINES'],
      note: 'Space Shuttle main engines ran for 8.5 minutes after launch.',
    },
    hazards: [
      { id: 'ACCELERATION', level: 'DOMINANT', why: 'Several g for minutes while seated and suited.' },
      { id: 'VIBRATION_NOISE', level: 'DOMINANT', why: 'Engines and air flow shake the cabin and make it loud.' },
      { id: 'GRAVITY', level: 'PRESENT', why: 'Sudden change from heavy load to weightlessness at engine cutoff.' },
      { id: 'CLOSED_ENV', level: 'PRESENT', why: 'Suited, strapped in a small cabin.' },
      { id: 'RADIATION', level: 'MINOR', why: 'Negligible during minutes of ascent.' },
      { id: 'ISOLATION', level: 'MINOR', why: 'Hours, not months.' },
      { id: 'DISTANCE', level: 'MINOR', why: 'Still close to Earth: abort and recovery teams are ready.' },
    ],
    countermeasures: [
      'Seat and suit fit checked before flight; follow the launch posture procedure.',
      'Check the space weather briefing before launch.',
      'Plan for motion sickness in the first days in orbit.',
    ],
    autonomy: 'Mission Control follows every second of the ascent in near real time.',
  },

  ISS: {
    id: 'ISS',
    label: 'ISS (low Earth orbit)',
    shortLabel: 'ISS',
    vehicle: 'Station in low Earth orbit (simulated ISS analog)',
    summary: 'Months in weightlessness about 400 km above Earth, still mostly shielded by the Earth magnetic field.',
    bodyEffects: [
      'Without gravity, bones and muscles lose strength unless the crew exercises every day.',
      'Body fluids move toward the head: puffy face, congestion, and changes in the eyes for some crew members.',
      'Radiation is higher than on Earth, mostly from cosmic rays and passes through the South Atlantic Anomaly; Earth magnetic field still blocks much of it.',
      'A small, closed cabin with a fixed crew: sleep, CO₂ and workload matter.',
    ],
    radiation: {
      absorbedUGyPerHour: {
        value: 286 / 24,
        sources: ['BERGER_2017_DOSIS'],
        derived: true,
        note: 'DOSIS 3D, Columbus module, end of May 2016: up to 286 µGy/day absorbed (silicon), divided by 24.',
      },
      doseEquivalentMSvPerDay: {
        value: 0.647,
        sources: ['BERGER_2017_DOSIS'],
        note: 'Same measurement: 647 µSv/day dose equivalent.',
      },
      effectiveMSvPerDayRange: {
        value: [0.2, 0.5],
        sources: ['SHAVERS_2024_ISS'],
        note: 'Effective doses usually accumulate at about 0.2 to 0.5 mSv or more per mission day.',
      },
      outsideMagnetosphere: false,
      measuredWhere: 'Inside the ISS Columbus module (DOSIS 3D).',
      plain: 'Higher than on Earth but partly shielded by Earth magnetic field. It varies with the orbit, the solar cycle and where you are inside the station.',
    },
    gravity: {
      value: { g: 0, label: 'Weightless (continuous free fall)' },
      sources: ['NASA_HRP_5_HAZARDS'],
      note: 'Gravity fields hazard: the body adapts to weightlessness in orbit.',
    },
    distanceKm: {
      value: { min: 400, max: 400, label: 'About 400 km above Earth' },
      sources: ['NASA_ISS_ALTITUDE'],
    },
    oneWayDelaySec: {
      value: { min: lightSec(400), max: lightSec(400), label: 'Near real time' },
      sources: ['NASA_ISS_ALTITUDE'],
      derived: true,
      note: 'Light time over 400 km is about 1 ms; relay satellites add latency (the demo link uses 0.5 s).',
    },
    defaultCommProfileId: 'ISS',
    duration: {
      value: { days: 182, label: 'About six months' },
      sources: ['NASA_ISS_MISSION_LENGTH'],
      note: 'A typical ISS mission lasts about six months (182 days used for projections).',
    },
    hazards: [
      { id: 'GRAVITY', level: 'DOMINANT', why: 'Months of weightlessness: bone, muscle and fluid shifts.' },
      { id: 'RADIATION', level: 'PRESENT', why: 'Above Earth levels, partly shielded by the magnetic field.' },
      { id: 'ISOLATION', level: 'PRESENT', why: 'Months with the same small crew.' },
      { id: 'CLOSED_ENV', level: 'PRESENT', why: 'Recycled air: CO₂, noise and temperature need constant control.' },
      { id: 'DISTANCE', level: 'MINOR', why: 'A return to Earth is possible within hours.' },
    ],
    countermeasures: [
      'Daily exercise on the cycle, treadmill and resistive device: in weightlessness it is the main countermeasure against bone and muscle loss.',
      'Keep a regular sleep schedule and light exposure.',
      'Watch cabin CO₂ and ventilation.',
    ],
    autonomy: 'Mission Control answers in near real time: the crew can ask before acting.',
  },

  MOON: {
    id: 'MOON',
    label: 'Moon (Artemis class)',
    shortLabel: 'Moon',
    vehicle: 'Lunar mission, transit and surface (simulated)',
    summary: 'Outside the Earth magnetic field, three days from home, one sixth of Earth gravity on the surface.',
    bodyEffects: [
      'No magnetic field protection: cosmic rays reach the crew and a solar particle event can raise the dose within hours.',
      'Partial gravity (about one sixth of Earth) on the surface, weightlessness in transit.',
      'Lunar dust is fine and sharp: it irritates eyes and lungs and gets into equipment.',
      'Help from Earth is about three days away.',
    ],
    radiation: {
      absorbedUGyPerHour: {
        value: 13.2,
        sources: ['ZHANG_2020_CHANGE4_LND'],
        note: "Chang'E 4 LND, lunar surface: average total absorbed dose rate in silicon 13.2 ± 1 µGy/h.",
      },
      doseEquivalentMSvPerDay: {
        value: 1.369,
        sources: ['ZHANG_2020_CHANGE4_LND'],
        note: 'Same instrument: average dose equivalent 1369 µSv/day on the lunar surface.',
      },
      outsideMagnetosphere: true,
      measuredWhere: "Lunar surface, Chang'E 4 lander (von Karman crater), 2019.",
      plain: 'About two to three times the ISS daily dose equivalent, because the Moon has no magnetic field and no thick atmosphere.',
    },
    gravity: {
      value: { g: 0.165, label: 'About one sixth of Earth (0.165 g) on the surface' },
      sources: ['NASA_MOON_FACT_SHEET'],
    },
    distanceKm: {
      value: { min: 363_300, max: 405_500, label: 'About 384,400 km (mean)' },
      sources: ['NASA_MOON_FACT_SHEET'],
      note: 'Mean perigee and apogee from the NSSDC fact sheet.',
    },
    oneWayDelaySec: {
      value: { min: lightSec(363_300), max: lightSec(405_500), label: 'About 1.3 s' },
      sources: ['NASA_MOON_FACT_SHEET'],
      derived: true,
      note: 'Distance divided by the speed of light (384,400 km gives 1.28 s).',
    },
    defaultCommProfileId: 'MOON',
    duration: {
      value: { days: 9 + 1 / 24 + 32 / 1440, label: 'About 9 days (Artemis II flyby)' },
      sources: ['NASA_ARTEMIS_II', 'NASA_HRP_5_HAZARDS'],
      note: 'Artemis II flew 9 days 1 h 32 min (April 2026). Surface missions planned after it are longer.',
    },
    hazards: [
      { id: 'RADIATION', level: 'DOMINANT', why: 'Outside the magnetic field: solar particle events are the main acute risk.' },
      { id: 'DISTANCE', level: 'PRESENT', why: 'About three days from Earth: no quick return.' },
      { id: 'GRAVITY', level: 'PRESENT', why: 'Weightless transit, then one sixth g, then Earth again.' },
      { id: 'CLOSED_ENV', level: 'PRESENT', why: 'Small cabin, suits and lunar dust.' },
      { id: 'ISOLATION', level: 'PRESENT', why: 'Small crew far from home.' },
    ],
    countermeasures: [
      'Know the radiation shelter location and procedure; check space weather before surface activity.',
      'Keep exercising: partial gravity alone does not protect bone and muscle.',
      'Limit dust brought into the cabin.',
    ],
    autonomy: 'A question and its answer take under 3 s: the ground can still support decisions, but help is days away.',
  },

  MARS_TRANSIT: {
    id: 'MARS_TRANSIT',
    label: 'Mars transit',
    shortLabel: 'Mars transit',
    vehicle: 'Spacecraft in deep space cruise (simulated)',
    summary: 'Many months in deep space, weightless, with a delay of minutes to Earth and no way home quickly.',
    bodyEffects: [
      'Constant cosmic ray exposure without magnetic field protection: the dose grows every day of the trip.',
      'Months of weightlessness: bone and muscle loss, fluid shifts and eye changes.',
      'A small crew, confined for months, with no real time contact with family or Mission Control.',
      'Medical care must happen on board: Earth can review, but cannot respond in time for urgent problems.',
    ],
    radiation: {
      absorbedUGyPerHour: {
        value: 481 / 24,
        sources: ['ZEITLIN_2013_MSL_RAD', 'GUO_2015_MSL_RAD'],
        derived: true,
        note: 'MSL RAD cruise (2011 to 2012), inside the spacecraft: 481 µGy/day absorbed, divided by 24.',
      },
      doseEquivalentMSvPerDay: {
        value: 1.8,
        sources: ['SWRI_2013_MSL_RAD', 'ZEITLIN_2013_MSL_RAD'],
        note: 'Average galactic cosmic ray dose equivalent rate of 1.8 mSv per day in cruise.',
      },
      outsideMagnetosphere: true,
      measuredWhere: 'Inside the Mars Science Laboratory spacecraft during its 253 day cruise (RAD instrument).',
      plain: 'About three times the ISS daily dose equivalent, every day of a months long trip. A round trip transit alone is about 0.66 Sv.',
    },
    gravity: {
      value: { g: 0, label: 'Weightless during cruise' },
      sources: ['NASA_HRP_5_HAZARDS'],
      note: 'Then about three eighths of Earth gravity on Mars.',
    },
    distanceKm: {
      value: { min: 35e6 * MILE_KM, max: 250e6 * MILE_KM, label: 'Up to about 400 million km' },
      sources: ['NASA_SPACE_COMMS_7_THINGS'],
      derived: true,
      note: 'Earth to Mars: about 35 million miles at closest approach, about 250 million miles at the greatest distance (converted to km).',
    },
    oneWayDelaySec: {
      value: { min: 4 * 60, max: 24 * 60, label: 'About 4 to 24 min' },
      sources: ['NASA_SPACE_COMMS_7_THINGS'],
      note: 'During transit the delay grows from seconds after departure to many minutes. The demo link uses the far Mars profile.',
    },
    defaultCommProfileId: 'MARS_FAR',
    duration: {
      value: { days: 253, label: 'About 8 months one way (253 days for MSL)' },
      sources: ['SWRI_2013_MSL_RAD', 'GUO_2015_MSL_RAD', 'NASA_HRP_5_HAZARDS'],
      note: 'MSL cruised 253 days to Mars. A crewed Mars mission keeps the crew away for roughly three years.',
    },
    hazards: [
      { id: 'RADIATION', level: 'DOMINANT', why: 'Deep space cosmic rays every day, plus solar particle events.' },
      { id: 'DISTANCE', level: 'DOMINANT', why: 'Minutes of delay and months from home: the crew handles problems on board.' },
      { id: 'ISOLATION', level: 'DOMINANT', why: 'Months confined with the same few people.' },
      { id: 'GRAVITY', level: 'DOMINANT', why: 'Months weightless before working in Mars gravity.' },
      { id: 'CLOSED_ENV', level: 'PRESENT', why: 'Life support must run for months without resupply.' },
    ],
    countermeasures: [
      'Daily exercise: in weightlessness it is the main countermeasure against bone and muscle loss.',
      'Know the radiation storm shelter and keep it ready; follow space weather alerts.',
      'Protect sleep, private time and contact with family to manage isolation.',
      'Crew medical officer leads on board care; send health packets for ground review.',
    ],
    autonomy: 'Every question to Earth costs at least twice the one way delay plus review time: the crew acts first, the ground reviews later.',
  },
}

export const MISSION_PROFILE_ORDER: MissionProfileId[] = ['LAUNCH', 'ISS', 'MOON', 'MARS_TRANSIT']

export const DEFAULT_MISSION_PROFILE: MissionProfileId = 'ISS'

export function missionProfile(id: MissionProfileId): MissionProfile {
  return MISSION_PROFILES[id] ?? MISSION_PROFILES[DEFAULT_MISSION_PROFILE]
}

export function isMissionProfileId(id: unknown): id is MissionProfileId {
  return typeof id === 'string' && id in MISSION_PROFILES
}

export const HAZARD_LABEL: Record<HazardId, { label: string; nasa: boolean }> = {
  RADIATION: { label: 'Space radiation', nasa: true },
  ISOLATION: { label: 'Isolation and confinement', nasa: true },
  DISTANCE: { label: 'Distance from Earth', nasa: true },
  GRAVITY: { label: 'Gravity fields', nasa: true },
  CLOSED_ENV: { label: 'Hostile closed environment', nasa: true },
  ACCELERATION: { label: 'Acceleration', nasa: false },
  VIBRATION_NOISE: { label: 'Vibration and noise', nasa: false },
}
