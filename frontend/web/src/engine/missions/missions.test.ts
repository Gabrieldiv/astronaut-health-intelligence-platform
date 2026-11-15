import { describe, expect, it } from 'vitest'
import type { MissionProfileId } from '../../types/domain'
import type { SpaceWeatherEvent, SpaceWeatherSnapshot } from '../../types/nasa'
import { autonomyGuidance } from '../comms'
import { HealthEngine } from '../engine'
import { PROFILE_CONTEXT, withProfileContext } from '../recommendations'
import { CabinModel } from '../sim/cabin'
import { HOUR_MS, MIN_MS } from '../text'
import {
  ISS_ORBITAL_MODEL_MEAN_UGY_H,
  MISSION_PROFILES,
  MISSION_PROFILE_ORDER,
  MISSION_SOURCES,
  NASA_CAREER_EFFECTIVE_DOSE_LIMIT,
  assessSpaceWeather,
  meanSimDoseRate,
  missionDoseExposure,
  missionDoseRate,
  qualityRatio,
  recentSignificantEvents,
  referenceMissionDose,
  type Cited,
} from '.'

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`)

function citedValues(id: MissionProfileId): Cited<unknown>[] {
  const p = MISSION_PROFILES[id]
  const r = p.radiation
  const all: Array<Cited<unknown> | null | undefined> = [p.gravity, p.distanceKm, p.oneWayDelaySec, p.duration, r.absorbedUGyPerHour, r.doseEquivalentMSvPerDay, r.effectiveMSvPerDayRange]
  return all.filter((x): x is Cited<unknown> => !!x)
}

describe('mission profile table', () => {
  it('has the four profiles, each value with a known https source', () => {
    expect(MISSION_PROFILE_ORDER).toEqual(['LAUNCH', 'ISS', 'MOON', 'MARS_TRANSIT'])
    for (const id of MISSION_PROFILE_ORDER) {
      const vals = citedValues(id)
      expect(vals.length).toBeGreaterThanOrEqual(4)
      for (const v of vals) {
        expect(v.sources.length).toBeGreaterThan(0)
        for (const s of v.sources) expect(MISSION_SOURCES[s]?.url).toMatch(/^https:\/\//)
      }
    }
  })

  it('keeps the published reference values', () => {
    expect(MISSION_PROFILES.MARS_TRANSIT.radiation.doseEquivalentMSvPerDay!.value).toBe(1.8)
    expect(MISSION_PROFILES.MARS_TRANSIT.radiation.absorbedUGyPerHour!.value).toBeCloseTo(481 / 24, 6)
    expect(MISSION_PROFILES.MOON.radiation.absorbedUGyPerHour!.value).toBe(13.2)
    expect(MISSION_PROFILES.MOON.radiation.doseEquivalentMSvPerDay!.value).toBe(1.369)
    expect(MISSION_PROFILES.ISS.radiation.absorbedUGyPerHour!.value).toBeCloseTo(286 / 24, 6)
    expect(MISSION_PROFILES.ISS.radiation.effectiveMSvPerDayRange!.value).toEqual([0.2, 0.5])
    expect(MISSION_PROFILES.LAUNCH.radiation.absorbedUGyPerHour).toBeNull()
    expect(MISSION_PROFILES.MOON.gravity.value.g).toBe(0.165)
    expect(MISSION_PROFILES.MOON.oneWayDelaySec.value.min).toBeCloseTo(1.21, 2)
    expect(MISSION_PROFILES.MARS_TRANSIT.oneWayDelaySec.value).toMatchObject({ min: 240, max: 1440 })
  })

  it('maps each profile to an Earth link and marks deep space profiles', () => {
    expect(MISSION_PROFILES.ISS.defaultCommProfileId).toBe('ISS')
    expect(MISSION_PROFILES.MOON.defaultCommProfileId).toBe('MOON')
    expect(MISSION_PROFILES.MARS_TRANSIT.defaultCommProfileId).toBe('MARS_FAR')
    expect(MISSION_PROFILES.MOON.radiation.outsideMagnetosphere).toBe(true)
    expect(MISSION_PROFILES.MARS_TRANSIT.radiation.outsideMagnetosphere).toBe(true)
    expect(MISSION_PROFILES.ISS.radiation.outsideMagnetosphere).toBe(false)
  })

  it('launch is dominated by acceleration, vibration and noise, with minor radiation', () => {
    const h = Object.fromEntries(MISSION_PROFILES.LAUNCH.hazards.map((x) => [x.id, x.level]))
    expect(h.ACCELERATION).toBe('DOMINANT')
    expect(h.VIBRATION_NOISE).toBe('DOMINANT')
    expect(h.RADIATION).toBe('MINOR')
  })

  it('contains no em dash or en dash in any text', () => {
    expect(JSON.stringify(MISSION_PROFILES)).not.toMatch(DASHES)
    expect(JSON.stringify(MISSION_SOURCES)).not.toMatch(DASHES)
    expect(JSON.stringify(PROFILE_CONTEXT)).not.toMatch(DASHES)
  })
})

describe('mission dose', () => {
  it('ISS orbital model mean matches the cabin model', () => {
    const cabin = new CabinModel(7)
    let sum = 0
    let n = 0
    for (let t = 0; t < 30 * 24 * HOUR_MS; t += MIN_MS) {
      sum += cabin.doseRateAt(t, 0)
      n++
    }
    expect(sum / n).toBeCloseTo(ISS_ORBITAL_MODEL_MEAN_UGY_H, 0)
  })

  it('simulated rates follow the profile reference mean', () => {
    const cabin = new CabinModel(11)
    for (const id of MISSION_PROFILE_ORDER) {
      let sum = 0
      let n = 0
      for (let t = 0; t < 30 * 24 * HOUR_MS; t += 5 * MIN_MS) {
        sum += missionDoseRate(id, t, cabin.doseRateAt(t, 0), 11)
        n++
      }
      expect(Math.abs(sum / n - meanSimDoseRate(id)) / meanSimDoseRate(id)).toBeLessThan(0.05)
    }
    expect(meanSimDoseRate('LAUNCH')).toBeLessThan(1)
  })

  it('NASA career limit is 600 mSv from NASA-STD-3001 Volume 1 Rev C', () => {
    expect(NASA_CAREER_EFFECTIVE_DOSE_LIMIT.value).toBe(600)
    expect(NASA_CAREER_EFFECTIVE_DOSE_LIMIT.standard).toMatch(/NASA-STD-3001 Volume 1 Revision C/)
    expect(MISSION_SOURCES.NASA_STD_3001_V1_REVC.officialStandard).toBe(true)
  })

  it('longer and farther missions get more dose', () => {
    expect(qualityRatio('LAUNCH')).toBeNull()
    expect(qualityRatio('ISS')).toBeCloseTo(647 / 286, 2)
    expect(qualityRatio('MARS_TRANSIT')).toBeCloseTo(1.8 / 0.481, 2)
    const perDay = MISSION_PROFILE_ORDER.map((id) => MISSION_PROFILES[id].radiation.doseEquivalentMSvPerDay?.value ?? 0)
    expect(perDay[0]).toBe(0)
    expect(perDay[3]!).toBeGreaterThan(perDay[2]!)
    expect(perDay[2]!).toBeGreaterThan(perDay[1]!)
    const mars = referenceMissionDose('MARS_TRANSIT').mSv!
    const iss = referenceMissionDose('ISS').mSv!
    expect(mars).toBeCloseTo(1.8 * 253, 6)
    expect(mars).toBeGreaterThan(iss)
    expect(referenceMissionDose('LAUNCH').mSv).toBeNull()
  })

  it('cumulative exposure vs the career limit', () => {
    const e = missionDoseExposure('MARS_TRANSIT', 48.1)
    expect(e.effectiveMSv).toBeCloseTo(180, 0)
    expect(e.careerFraction).toBeCloseTo(0.3, 2)
    expect(e.summary).toMatch(/of the 600 mSv NASA career limit/)
    const l = missionDoseExposure('LAUNCH', 0.01)
    expect(l.effectiveMSv).toBeNull()
    expect(l.summary).toMatch(/negligible/)
  })
})

const NOW = '2026-11-14T12:00:00Z'
const ev = (o: Partial<SpaceWeatherEvent>): SpaceWeatherEvent => ({
  id: 'X',
  kind: 'SOLAR_FLARE',
  startTime: '2026-11-13T04:00:00Z',
  peakTime: null,
  classType: null,
  kpIndex: null,
  link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/1/',
  ...o,
})
const snap = (events: SpaceWeatherEvent[], retrievedAt = NOW): SpaceWeatherSnapshot => ({
  data_origin: 'REAL_PUBLIC',
  source: 'NASA DONKI (CCMC)',
  sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  retrievedAt,
  window: { start: '2026-11-07T00:00:00Z', end: NOW },
  events,
  mode: 'snapshot',
})

describe('space weather advisory', () => {
  const sep = ev({ id: '2026-11-13T06:00:00-SEP-001', kind: 'SEP', startTime: '2026-11-13T06:00:00Z', link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/SEP/42/' })
  const xFlare = ev({ id: '2026-11-14T01:00:00-FLR-001', classType: 'X1.2', startTime: '2026-11-14T01:00:00Z', link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/43/' })
  const mFlare = ev({ id: 'M', classType: 'M5.0' })
  const oldSep = ev({ id: 'OLD', kind: 'SEP', startTime: '2026-11-01T00:00:00Z' })
  const cme = ev({ id: 'CME', kind: 'CME' })

  it('outside the magnetosphere a recent SEP or X flare means shelter, with the event link', () => {
    for (const id of ['MOON', 'MARS_TRANSIT'] as const) {
      const a = assessSpaceWeather(snap([sep, xFlare, mFlare]), id)
      expect(a.kind).toBe('SHELTER')
      expect(a.level).toBe('HIGH')
      expect(a.autonomy).toBe('ONBOARD')
      expect(a.data_origin).toBe('REAL_PUBLIC')
      expect(a.title).toMatch(/radiation storm shelter/)
      expect(a.triggers.map((e) => e.id)).toEqual([xFlare.id, sep.id])
      expect(a.link).toBe(xFlare.link)
      expect(a.retrievedAt).toBe(NOW)
    }
  })

  it('ISS gets a monitoring note and launch a pre launch note', () => {
    expect(assessSpaceWeather(snap([sep]), 'ISS').kind).toBe('MONITOR')
    const l = assessSpaceWeather(snap([xFlare]), 'LAUNCH')
    expect(l.kind).toBe('PRE_LAUNCH')
    expect(l.body).toMatch(/launch team/)
  })

  it('M flares, CMEs and old events stay calm', () => {
    expect(recentSignificantEvents(snap([mFlare, cme, oldSep]))).toEqual([])
    const a = assessSpaceWeather(snap([mFlare, cme, oldSep]), 'MARS_TRANSIT')
    expect(a.kind).toBe('QUIET')
    expect(a.level).toBe('LOW')
    expect(a.eventCount).toBe(3)
  })

  it('no data is not all clear', () => {
    expect(assessSpaceWeather(null, 'MOON').kind).toBe('NO_DATA')
    // The placeholder client returns the Unix epoch and no events.
    const placeholder = snap([], new Date(0).toISOString())
    const a = assessSpaceWeather(placeholder, 'MARS_TRANSIT')
    expect(a.kind).toBe('NO_DATA')
    expect(a.level).toBe('NO_DATA')
    expect(a.body).toMatch(/unknown/)
  })

  it('an empty live window is calm', () => {
    expect(assessSpaceWeather(snap([]), 'MOON').kind).toBe('QUIET')
  })
})

describe('autonomy and recommendations by profile', () => {
  it('delay drives who decides', () => {
    expect(autonomyGuidance(0.5).mode).toBe('NEAR_REAL_TIME')
    expect(autonomyGuidance(1.3).mode).toBe('DELAYED')
    const mars = autonomyGuidance(22 * 60)
    expect(mars.mode).toBe('CREW_FIRST')
    expect(mars.body).toMatch(/without waiting/)
    expect(mars.earliestReplyMs).toBe((2 * 22 * 60 + 4 * 60) * 1000)
  })

  it('adds context only where the environment justifies it', () => {
    expect(withProfileContext('Base.', 'R-EX-01', 'MARS_TRANSIT')).toMatch(/weightlessness, daily exercise/)
    expect(withProfileContext('Base.', 'R-EX-01', 'ISS')).toMatch(/weightlessness/)
    expect(withProfileContext('Base.', 'R-HR-01', 'ISS')).toBe('Base.')
    expect(withProfileContext('Base.', 'R-EX-01', undefined)).toBe('Base.')
    for (const ctx of Object.values(PROFILE_CONTEXT)) for (const s of Object.values(ctx ?? {})) expect(s).not.toMatch(/diagnos|medication|prescri/i)
  })
})

describe('engine integration', () => {
  it('dosimeters follow the profile and the vehicle label changes', () => {
    const mars = new HealthEngine({ scenarioId: 'NOMINAL', missionProfileId: 'MARS_TRANSIT', historyDays: 1, dailyHistoryDays: 1, timelinePregenHours: 1 })
    expect(mars.missionProfileId).toBe('MARS_TRANSIT')
    expect(mars.mission.vehicle).toMatch(/deep space/)
    const rate = mars.environment.metrics.RADIATION_DOSE_RATE?.current
    expect(rate).not.toBeNull()
    expect(Math.abs(rate! - 481 / 24)).toBeLessThan(3)
    expect(mars.devices.find((d) => d.kind === 'DOSIMETER')!.data_origin).toBe('SIMULATED')

    const launch = new HealthEngine({ scenarioId: 'NOMINAL', missionProfileId: 'LAUNCH', historyDays: 1, dailyHistoryDays: 1, timelinePregenHours: 1 })
    expect(launch.environment.metrics.RADIATION_DOSE_RATE!.current!).toBeLessThan(1)
    expect(launch.personalDose('AST-01')).toBeLessThan(mars.personalDose('AST-01'))
  })
})
