import { afterEach, describe, expect, it } from 'vitest'
import type { Alert, AuditEvent, Baseline, CheckIn, Device, Intervention, MetricCode, MetricState, MissionDaySummary } from '../../types/domain'
import { NASA_CAREER_EFFECTIVE_DOSE_LIMIT } from '../../engine/missions'
import { setLanguage } from '../../i18n'
import {
  PROFILE_DOMAINS,
  auditMentions,
  baselineRow,
  checkInRows,
  domainOf,
  doseFor,
  groupBaselines,
  latestCheckIn,
  openAlertCount,
  profileDevices,
  recentEvents,
  symptomWords,
} from './profileData'
import { useProfileStore } from './profileStore'

afterEach(async () => {
  await setLanguage('en', { persist: false })
  useProfileStore.getState().close()
})

const READY: Baseline = { metric: 'HEART_RATE', status: 'READY', n: 120, mean: 62, median: 61, sd: 4, mad: 3, p05: 55, p95: 70, low: 55, high: 70, windowLabel: 'Mission days 1 to 5, rest context', version: 'v1' }

function ms(metric: MetricCode, current: number | null, over: Partial<MetricState> = {}): MetricState {
  return { metric, current, unit: '', status: 'LOW', zScore: 0, ewma: null, trendPerHour: null, baseline: { ...READY, metric }, lastUpdated: 0, quality: 'VALID', data_origin: 'SIMULATED', ...over }
}

describe('domains', () => {
  it('puts every metric in at most one domain and keeps exam measures out', () => {
    const all = PROFILE_DOMAINS.flatMap((d) => d.metrics)
    expect(new Set(all).size).toBe(all.length)
    expect(domainOf('HEART_RATE')).toBe('heart')
    expect(domainOf('SPO2')).toBe('breathing')
    expect(domainOf('SLEEP_DURATION')).toBe('sleep')
    expect(domainOf('EXERCISE_LOAD')).toBe('activity')
    expect(domainOf('STRESS')).toBe('mind')
    expect(domainOf('RADIATION_DOSE')).toBe('environment')
    expect(domainOf('RETINAL_THICKNESS')).toBeNull()
  })

  it('groups the rows by domain in display order and leaves empty domains out', () => {
    const groups = groupBaselines({
      SPO2: ms('SPO2', 98),
      HEART_RATE: ms('HEART_RATE', 60),
      HRV_RMSSD: ms('HRV_RMSSD', 50),
      RADIATION_DOSE: ms('RADIATION_DOSE', 4),
      RETINAL_THICKNESS: ms('RETINAL_THICKNESS', 330),
    })
    expect(groups.map((g) => g.id)).toEqual(['heart', 'breathing', 'environment'])
    expect(groups[0]!.rows.map((r) => r.metric)).toEqual(['HEART_RATE', 'HRV_RMSSD'])
    expect(groups.flatMap((g) => g.rows).some((r) => r.metric === 'RETINAL_THICKNESS')).toBe(false)
  })

  it('returns nothing without metrics (no invented rows)', () => {
    expect(groupBaselines(undefined)).toEqual([])
    expect(groupBaselines({})).toEqual([])
  })
})

describe('baselineRow', () => {
  it('places the marker inside the track and says within the band', () => {
    const r = baselineRow(ms('HEART_RATE', 62))
    expect(r.hasBand).toBe(true)
    expect(r.side).toBe('within')
    expect(r.marker).toBeGreaterThan(0)
    expect(r.marker).toBeLessThan(1)
    expect([r.low, r.high, r.median, r.readings]).toEqual([55, 70, 61, 120])
    expect(r.windowLabel).toBe('Mission days 1 to 5, rest context')
  })

  it('reads above and below the personal band', () => {
    expect(baselineRow(ms('HEART_RATE', 90, { status: 'HIGH' })).side).toBe('above')
    expect(baselineRow(ms('HEART_RATE', 40, { status: 'MODERATE' })).side).toBe('below')
  })

  it('treats a missing value as NO_DATA, never as normal, whatever the last status was', () => {
    const r = baselineRow(ms('HEART_RATE', null, { status: 'LOW' }))
    expect(r.status).toBe('NO_DATA')
    expect(r.current).toBeNull()
    expect(r.marker).toBeNull()
    expect(r.side).toBeNull()
  })

  it('has no band and no marker while the baseline is still being learned', () => {
    const r = baselineRow(ms('HEART_RATE', 62, { baseline: { ...READY, status: 'INSUFFICIENT_DATA', n: 8 } }))
    expect(r.hasBand).toBe(false)
    expect([r.low, r.high, r.median, r.marker, r.side, r.windowLabel]).toEqual([null, null, null, null, null, null])
    expect(r.readings).toBe(8)
    expect(baselineRow(ms('HEART_RATE', 62, { baseline: null })).readings).toBeNull()
  })
})

const checkIn = (over: Partial<CheckIn>): CheckIn => ({ id: 'c', astronautId: 'AST-01', at: 1000, mood: 4, fatigue: 2, stress: 1, sleepQuality: 5, symptoms: [], note: '', data_origin: 'SIMULATED', ...over })

describe('check-in in plain language', () => {
  it('names each answer with its plain word', () => {
    const rows = checkInRows(checkIn({}))
    expect(rows.map((r) => r.key)).toEqual(['mood', 'fatigue', 'stress', 'sleepQuality'])
    expect(rows.map((r) => r.word)).toEqual(['Good', 'Slightly tired', 'Calm', 'Very well'])
    expect(rows.map((r) => r.value)).toEqual([4, 2, 1, 5])
  })

  it('keeps answers on the 1 to 5 scale', () => {
    const rows = checkInRows(checkIn({ mood: 9, fatigue: 0 }))
    expect(rows[0]!.value).toBe(5)
    expect(rows[1]!.value).toBe(1)
  })

  it('writes symptoms in the current language and drops "none"', async () => {
    expect(symptomWords(['headache', 'back pain', 'none'])).toEqual(['headache', 'back pain'])
    expect(symptomWords(['something unusual'])).toEqual(['something unusual'])
    await setLanguage('pt-BR', { persist: false })
    expect(symptomWords(['headache'])).not.toEqual(['headache'])
  })

  it('finds the newest check-in of that astronaut, never one from the future', () => {
    const list = [checkIn({ id: 'future', at: 9000 }), checkIn({ id: 'other', astronautId: 'AST-02', at: 5000 }), checkIn({ id: 'new', at: 4000 }), checkIn({ id: 'old', at: 1000 })]
    expect(latestCheckIn(list, 'AST-01', 5000)?.id).toBe('new')
    expect(latestCheckIn(list, 'AST-03', 5000)).toBeNull()
    expect(latestCheckIn([], 'AST-01', 5000)).toBeNull()
    expect(latestCheckIn(list, 'AST-01', 500)).toBeNull()
  })
})

describe('radiation dose', () => {
  const day = (cumulativeDoseMgy: number): MissionDaySummary => ({
    astronautId: 'AST-01', missionDay: 1, date: '2026-10-01', sleepHours: 7, exerciseMinutes: 60, exercisePlannedMinutes: 60, restingHr: 58, hrv: 50, radiationDoseMgy: 0.1, cumulativeDoseMgy, riskLevel: 'LOW', data_origin: 'SIMULATED',
  })

  it('is null, never zero, when there is no dose at all', () => {
    expect(doseFor('ISS', null, undefined)).toBeNull()
    expect(doseFor('ISS', undefined, [])).toBeNull()
    expect(doseFor('ISS', Number.NaN, undefined)).toBeNull()
  })

  it('prefers the current dosimeter value, falls back to the last mission day', () => {
    expect(doseFor('ISS', 5, [day(2)])?.absorbedMGy).toBe(5)
    expect(doseFor('ISS', null, [day(1), day(2)])?.absorbedMGy).toBe(2)
  })

  it('compares with the NASA career limit', () => {
    const e = doseFor('ISS', 10, undefined)!
    expect(e.limitMSv).toBe(NASA_CAREER_EFFECTIVE_DOSE_LIMIT.value)
    expect(e.careerFraction).not.toBeNull()
    expect(e.careerFraction!).toBeGreaterThan(0)
    expect(e.careerFraction!).toBeLessThan(1)
  })
})

const alert = (over: Partial<Alert>): Alert => ({
  id: 'a1', astronautId: 'AST-01', severity: 'HIGH', title: 'Heart rate above your normal', detail: '', region: 'heart', metric: 'HEART_RATE', ruleId: 'R', createdAt: 100, acknowledgedAt: null, acknowledgedBy: null, ...over,
})

describe('alerts and events', () => {
  it('counts only the open alerts of that astronaut', () => {
    const list = [alert({}), alert({ id: 'a2', acknowledgedAt: 5 }), alert({ id: 'a3', resolvedAt: 7 }), alert({ id: 'a4', astronautId: 'AST-02' }), alert({ id: 'a5', astronautId: null })]
    expect(openAlertCount(list, 'AST-01')).toBe(1)
    expect(openAlertCount([], 'AST-01')).toBe(0)
  })

  const audit = (over: Partial<AuditEvent>): AuditEvent => ({ id: 'x', at: 50, actor: 'crew', action: 'DEVICE_PAUSED', detail: 'ORION paused the Bio-Monitor shirt', ...over })
  const action = (over: Partial<Intervention>): Intervention => ({ id: 'i1', astronautId: 'AST-01', kind: 'HYDRATION', recommendationId: null, loggedAt: 200, actor: 'crew', note: 'Drank water', ...over })
  const orion = { id: 'AST-01', callsign: 'ORION' }

  it('matches audit lines that name the astronaut by callsign or id, whole words only', () => {
    expect(auditMentions(audit({}), orion)).toBe(true)
    expect(auditMentions(audit({ detail: 'AST-01 reply received' }), orion)).toBe(true)
    expect(auditMentions(audit({ detail: 'LYRA paused a device' }), orion)).toBe(false)
    expect(auditMentions(audit({ detail: 'ORIONS belt' }), orion)).toBe(false)
  })

  it('merges alerts, logged actions and audit lines of one astronaut, newest first', () => {
    const events = recentEvents({
      astronaut: orion,
      alerts: [alert({ createdAt: 100 }), alert({ id: 'other', astronautId: 'AST-02', createdAt: 999 })],
      interventions: [action({}), action({ id: 'i2', astronautId: 'AST-03', loggedAt: 998 })],
      audit: [audit({ at: 50 }), audit({ id: 'y', at: 300, action: 'RULE_EVALUATED' }), audit({ id: 'z', at: 400, detail: 'VEGA resumed', action: 'DEVICE_RESUMED' })],
    })
    expect(events.map((e) => e.kind)).toEqual(['action', 'alert', 'audit'])
    expect(events[0]!.title).toBe('Hydration')
    expect(events[1]!.title).toBe('Heart rate above your normal')
    expect(events[1]!.severity).toBe('HIGH')
    expect(events[2]!.title).toBe('Device paused')
  })

  it('honors the limit and returns an empty list for no events', () => {
    const many = Array.from({ length: 9 }, (_, i) => alert({ id: `a${i}`, createdAt: i }))
    expect(recentEvents({ astronaut: orion, alerts: many, interventions: [], audit: [], limit: 3 }).map((e) => e.at)).toEqual([8, 7, 6])
    expect(recentEvents({ astronaut: orion, alerts: [], interventions: [], audit: [] })).toEqual([])
  })
})

describe('devices', () => {
  const dev = (over: Partial<Device>): Device => ({ id: 'd', kind: 'BIO_MONITOR', name: 'Bio-Monitor shirt', assignedTo: 'AST-01', state: 'ONLINE', batteryPct: 80, signalPct: 90, lastSeenAt: 0, data_origin: 'SIMULATED', metrics: ['HEART_RATE'], ...over })
  it('lists only the worn devices, the ones needing attention first', () => {
    const list = profileDevices([dev({ id: 'a', name: 'B watch' }), dev({ id: 'b', name: 'A shirt', state: 'OFFLINE' }), dev({ id: 'c', assignedTo: null }), dev({ id: 'd', assignedTo: 'AST-02' })], 'AST-01')
    expect(list.map((d) => d.id)).toEqual(['b', 'a'])
  })
})

describe('profile store', () => {
  it('opens, switches and closes', () => {
    const s = useProfileStore.getState()
    expect(s.openId).toBeNull()
    s.open('AST-01')
    expect(useProfileStore.getState().openId).toBe('AST-01')
    useProfileStore.getState().open('AST-02')
    expect(useProfileStore.getState().openId).toBe('AST-02')
    useProfileStore.getState().toggle('AST-02')
    expect(useProfileStore.getState().openId).toBeNull()
    useProfileStore.getState().toggle('AST-03')
    expect(useProfileStore.getState().openId).toBe('AST-03')
    useProfileStore.getState().close()
    expect(useProfileStore.getState().openId).toBeNull()
  })
})
