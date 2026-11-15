/**
 * Accent colors and HUD facts of the mission backdrops. Every number is read from the cited
 * mission profile table (src/engine/missions/profiles.ts); nothing here is a new reference value.
 * The ISS orbit period is derived (Kepler's third law on the cited 400 km altitude, with the
 * standard Earth radius and gravitational parameter) and labeled as such in the code.
 */
import type { MissionProfileId } from '../../../types/domain'
import { MISSION_PROFILES, SPEED_OF_LIGHT_KM_S } from '../../../engine/missions'
import { getLang, t } from '../../../i18n'

/** Accent per profile: platform ring, HUD border and scenery highlights. */
export const MISSION_ACCENT: Record<MissionProfileId, string> = {
  LAUNCH: '#ffb15c',
  ISS: '#5fd3ff',
  MOON: '#e4e7ee',
  MARS_TRANSIT: '#f0875a',
}

/** Mean Earth radius (km) and Earth gravitational parameter (km^3/s^2), standard constants. */
const EARTH_RADIUS_KM = 6371
const EARTH_GM = 398_600.4418

/** Derived: circular orbit period (minutes) at the cited ISS altitude. About 92 min. */
export function issOrbitMinutes(): number {
  const r = EARTH_RADIUS_KM + MISSION_PROFILES.ISS.distanceKm.value.max
  return (2 * Math.PI * Math.sqrt((r * r * r) / EARTH_GM)) / 60
}

const num = (v: number, digits = 0) => new Intl.NumberFormat(getLang(), { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v)

/** Two or three short facts for the HUD chip, in the current language. */
export function missionFacts(id: MissionProfileId): string[] {
  const p = MISSION_PROFILES[id]
  switch (id) {
    case 'LAUNCH':
      return [t('backdrop.fact.upToG', { g: num(p.gravity.value.g) }), t('backdrop.fact.poweredMin', { n: num(p.duration.value.days * 1440, 1) })]
    case 'ISS':
      return [
        t('backdrop.fact.altitude', { km: num(p.distanceKm.value.max) }),
        t('backdrop.fact.weightless'),
        t('backdrop.fact.dose', { v: num(p.radiation.doseEquivalentMSvPerDay?.value ?? 0, 2) }),
      ]
    case 'MOON': {
      const meanKm = (p.distanceKm.value.min + p.distanceKm.value.max) / 2
      return [
        t('backdrop.fact.gravity', { g: num(p.gravity.value.g, 3) }),
        t('backdrop.fact.distance', { km: num(Math.round(meanKm / 100) * 100) }),
        t('backdrop.fact.delaySec', { s: num(meanKm / SPEED_OF_LIGHT_KM_S, 1) }),
      ]
    }
    case 'MARS_TRANSIT':
      return [
        t('backdrop.fact.dose', { v: num(p.radiation.doseEquivalentMSvPerDay?.value ?? 0, 1) }),
        t('backdrop.fact.delayMin', { min: num(p.oneWayDelaySec.value.min / 60), max: num(p.oneWayDelaySec.value.max / 60) }),
      ]
  }
}

/** Days of the one way Mars transit (cited duration). */
export const marsTransitDays = (): number => MISSION_PROFILES.MARS_TRANSIT.duration.value.days

/** Peak ascent load (cited) for the launch g gauge. */
export const launchPeakG = (): number => MISSION_PROFILES.LAUNCH.gravity.value.g
