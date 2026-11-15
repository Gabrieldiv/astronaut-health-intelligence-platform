/**
 * Mission radiation dose: the simulated dosimeter rate per profile, and the cumulative mission
 * dose versus the NASA career limit.
 *
 * Simulation (SIMULATED data): the cabin model (sim/cabin.ts) produces an ISS-like orbital dose
 * rate shape (latitude modulation plus South Atlantic Anomaly passes). For each profile the
 * engine replaces it with missionDoseRate():
 *  - ISS: the same orbital shape, scaled so its long run mean equals the ISS reference.
 *  - MOON, MARS_TRANSIT: deep space galactic cosmic rays are steady, so the rate is the
 *    reference mean with a slow wobble and a little noise (demo configuration).
 *  - LAUNCH: an order of magnitude ground background (demo configuration).
 *
 * Career limit (official standard): NASA-STD-3001 Volume 1 Revision C, [V1 4030]: total career
 * effective dose below 600 mSv, universal for all ages and sexes.
 *
 * Effective dose estimate: absorbed dose (mGy) x the profile mean quality ratio, where the ratio
 * is dose equivalent / absorbed dose from the same published measurement. This is an
 * approximation for decision support, not the NASA effective dose calculation (which uses the
 * NASA Q model and a 35 year old female phantom).
 */
import type { MissionProfileId } from '../../types/domain'
import { MISSION_PROFILE_SIM } from '../config'
import { hashNormal } from '../random'
import { HOUR_MS, MIN_MS } from '../text'
import { missionProfile, type Cited } from './profiles'

/** NASA-STD-3001 Vol. 1 Rev. C [V1 4030]: career effective dose limit. Official NASA standard. */
export const NASA_CAREER_EFFECTIVE_DOSE_LIMIT: Cited<number> & { unit: 'mSv'; standard: string } = {
  value: 600,
  unit: 'mSv',
  standard: 'NASA-STD-3001 Volume 1 Revision C (2023), requirement [V1 4030]',
  sources: ['NASA_STD_3001_V1_REVC', 'NASA_OCHMO_TB_RADIATION'],
  note: 'Total career effective radiation dose due to spaceflight shall be less than 600 mSv; universal for all ages and sexes.',
}

/** NASA-STD-3001 Vol. 1 Rev. C [V1 4031]: solar particle event limit per event. Official NASA standard. */
export const NASA_SPE_EFFECTIVE_DOSE_LIMIT: Cited<number> & { unit: 'mSv' } = {
  value: 250,
  unit: 'mSv',
  sources: ['NASA_OCHMO_TB_RADIATION'],
  note: 'Short term limit for solar particle events: effective dose below 250 mSv per event.',
}

/**
 * Long run mean (µGy/h) of the orbital dose rate shape in sim/cabin.ts:
 * 13 + 5 x mean|sin| (= 2/pi) + SAA bump: 40% of orbits, 26 µGy/h Gaussian of width 4 min over a
 * 92.7 min orbit (area 26 x 4 x sqrt(pi)). Kept in sync by missions.test.ts.
 */
export const ISS_ORBITAL_MODEL_MEAN_UGY_H = 13 + (5 * 2) / Math.PI + (0.4 * 26 * 4 * Math.sqrt(Math.PI)) / 92.7

/** Mean simulated absorbed dose rate (µGy/h) for a profile. */
export function meanSimDoseRate(id: MissionProfileId): number {
  const ref = missionProfile(id).radiation.absorbedUGyPerHour
  return ref ? ref.value : MISSION_PROFILE_SIM.launchBackgroundUGyPerHour
}

/** Factor that maps the ISS orbital model mean to the profile mean (used for the prior mission dose). */
export function doseScaleVsOrbitalModel(id: MissionProfileId): number {
  return meanSimDoseRate(id) / ISS_ORBITAL_MODEL_MEAN_UGY_H
}

/**
 * Simulated area dose rate (µGy/h) at sim time t for the profile.
 * `orbitalRate` is the cabin model rate at t (ISS orbital shape, used by the ISS profile).
 */
export function missionDoseRate(id: MissionProfileId, t: number, orbitalRate: number, seed: number): number {
  const mean = meanSimDoseRate(id)
  if (id === 'ISS') return Math.max(0, orbitalRate * (mean / ISS_ORBITAL_MODEL_MEAN_UGY_H))
  const C = MISSION_PROFILE_SIM
  const bin = Math.floor(t / (C.deepSpaceNoiseBinMin * MIN_MS))
  const noise = C.deepSpaceNoise * hashNormal(seed, 'mission-dose', id, bin)
  if (id === 'LAUNCH') return Math.max(0, mean * (1 + noise))
  const wobble = C.deepSpaceSlowWobble * Math.sin((2 * Math.PI * t) / (C.deepSpaceSlowPeriodHours * HOUR_MS))
  return Math.max(0, mean * (1 + wobble + noise))
}

/**
 * Mean quality ratio (dose equivalent / absorbed dose, Sv per Gy) of the profile reference
 * measurement. null when the profile has no reference (launch).
 */
export function qualityRatio(id: MissionProfileId): number | null {
  const r = missionProfile(id).radiation
  if (!r.absorbedUGyPerHour || !r.doseEquivalentMSvPerDay) return null
  const absorbedMGyPerDay = (r.absorbedUGyPerHour.value * 24) / 1000
  return absorbedMGyPerDay > 0 ? r.doseEquivalentMSvPerDay.value / absorbedMGyPerDay : null
}

export interface MissionDoseExposure {
  profileId: MissionProfileId
  /** Cumulative simulated absorbed dose (mGy). */
  absorbedMGy: number
  /** Effective dose estimate (mSv), null when no quality ratio is available. */
  effectiveMSv: number | null
  /** Share of the career limit used by this mission so far (0..1+). */
  careerFraction: number | null
  /** Reference dose equivalent per day for the profile (mSv/day). */
  referenceMSvPerDay: number | null
  /** Projection at the typical profile duration from the reference rate (mSv). */
  projectedMissionMSv: number | null
  projectedCareerFraction: number | null
  typicalDays: number
  limitMSv: number
  /** Plain one line summary. */
  summary: string
}

/** Projection from published reference values only: reference mSv/day x typical duration. */
export function referenceMissionDose(id: MissionProfileId): { mSv: number | null; days: number } {
  const p = missionProfile(id)
  const rate = p.radiation.doseEquivalentMSvPerDay?.value ?? null
  return { mSv: rate === null ? null : rate * p.duration.value.days, days: p.duration.value.days }
}

function pct(x: number): string {
  const v = x * 100
  return v < 1 ? `${v.toFixed(1)}%` : `${Math.round(v)}%`
}

/** Cumulative mission dose vs the NASA career limit (simulated absorbed dose in, estimate out). */
export function missionDoseExposure(id: MissionProfileId, absorbedMGy: number): MissionDoseExposure {
  const q = qualityRatio(id)
  const limit = NASA_CAREER_EFFECTIVE_DOSE_LIMIT.value
  const absorbed = Math.max(0, Number.isFinite(absorbedMGy) ? absorbedMGy : 0)
  const effective = q === null ? null : absorbed * q
  const ref = referenceMissionDose(id)
  const p = missionProfile(id)
  const summary =
    effective === null
      ? `Radiation is negligible for this phase (${p.duration.value.label.toLowerCase()}).`
      : `About ${effective.toFixed(effective < 10 ? 1 : 0)} mSv so far, ${pct(effective / limit)} of the ${limit} mSv NASA career limit.`
  return {
    profileId: id,
    absorbedMGy: absorbed,
    effectiveMSv: effective,
    careerFraction: effective === null ? null : effective / limit,
    referenceMSvPerDay: p.radiation.doseEquivalentMSvPerDay?.value ?? null,
    projectedMissionMSv: ref.mSv,
    projectedCareerFraction: ref.mSv === null ? null : ref.mSv / limit,
    typicalDays: ref.days,
    limitMSv: limit,
    summary,
  }
}
