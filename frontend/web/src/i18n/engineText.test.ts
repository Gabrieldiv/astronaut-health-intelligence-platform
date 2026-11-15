import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { EngineMsg, MetricCode, ScenarioId } from '../types/domain'
import { HealthEngine } from '../engine/engine'
import { MIN_MS } from '../engine/text'
import { msgForEnglish } from '../engine/msg'
import { assessSpaceWeather } from '../engine/missions/spaceWeather'
import { EXAM_RULE_TITLES, assessMeasure } from '../engine/exams/assess'
import type { SpaceWeatherEvent, SpaceWeatherSnapshot } from '../types/nasa'
import { HAZARD_LABEL, MISSION_PROFILE_ORDER, missionProfile } from '../engine/missions/profiles'
import { LOCAL_HAZARD_LABEL, alertDetail, alertTitle, engineText, localMissionProfile, recRationale, recTitle, renderEngineMsg } from './engineText'
import { setLanguage, type Lang } from '.'
import { en } from './locales/en'

/** Every Unicode dash punctuation except the plain hyphen, built from char codes so this file stays free of them. */
const DASHES = new RegExp('[' + [0x2012, 0x2013, 0x2014, 0x2015, 0x2e3a, 0x2e3b, 0xfe58, 0xfe63, 0xff0d].map((c) => String.fromCharCode(c)).join('') + ']')

interface Sample {
  english: string
  msg: EngineMsg
  where: string
}

/** Runs a few scenarios and collects every engine sentence that carries a structured message. */
function collect(): Sample[] {
  const out: Sample[] = []
  const runs: { scenarioId: ScenarioId; commProfileId?: 'MARS_FAR'; missionProfileId?: 'MARS_TRANSIT' | 'ISS'; minutes: number }[] = [
    { scenarioId: 'NOMINAL', minutes: 60 },
    { scenarioId: 'SANS_PROGRESSION', minutes: 2 * 24 * 60 },
    { scenarioId: 'ACUTE_CARDIO', minutes: 120 },
    { scenarioId: 'PROGRESSIVE_FATIGUE', minutes: 3 * 24 * 60 },
    { scenarioId: 'SENSOR_FAILURE', minutes: 180 },
    { scenarioId: 'PERFORMANCE_DECLINE', minutes: 3 * 24 * 60, missionProfileId: 'ISS' },
    { scenarioId: 'ACUTE_CARDIO', minutes: 120, commProfileId: 'MARS_FAR', missionProfileId: 'MARS_TRANSIT' },
  ]
  for (const r of runs) {
    const e = new HealthEngine({ scenarioId: r.scenarioId, commProfileId: r.commProfileId, missionProfileId: r.missionProfileId })
    const end = e.simTime + r.minutes * MIN_MS
    const step = r.minutes > 600 ? 60 : 5
    while (e.simTime < end) {
      e.advanceTo(Math.min(end, e.simTime + step * MIN_MS))
      e.evaluate()
      for (const h of Object.values(e.health)) {
        if (h.risk.headlineMsg) out.push({ english: h.risk.headline, msg: h.risk.headlineMsg, where: `${r.scenarioId} headline` })
        for (const f of h.risk.contributing_factors) if (f.msg) out.push({ english: f.label, msg: f.msg, where: `${r.scenarioId} factor` })
        for (const reg of Object.values(h.regions)) if (reg.summaryMsg) out.push({ english: reg.summary, msg: reg.summaryMsg, where: `${r.scenarioId} region` })
        // Exams (notes, session labels, summaries, method) and forecast notes.
        for (const ex of Object.values(h.exams ?? {})) {
          if (ex.summaryMsg) out.push({ english: ex.summary, msg: ex.summaryMsg, where: `${r.scenarioId} exam summary` })
          if (ex.methodMsg) out.push({ english: ex.method, msg: ex.methodMsg, where: `${r.scenarioId} exam method` })
          if (ex.nextDue?.labelMsg) out.push({ english: ex.nextDue.label, msg: ex.nextDue.labelMsg, where: `${r.scenarioId} exam next` })
          for (const s of [...ex.baselineSessions, ...ex.sessions]) {
            if (s.labelMsg) out.push({ english: s.label, msg: s.labelMsg, where: `${r.scenarioId} exam label` })
            for (const res of s.results) if (res.noteMsg) out.push({ english: res.note, msg: res.noteMsg, where: `${r.scenarioId} exam note` })
          }
        }
        for (const p0 of Object.values(h.predictions)) {
          for (const p of [p0, ...Object.values(p0.byHorizon ?? {})]) {
            if (p.methodMsg) out.push({ english: p.method, msg: p.methodMsg, where: `${r.scenarioId} forecast method` })
            if (p.intervalLabelMsg) out.push({ english: p.intervalLabel, msg: p.intervalLabelMsg, where: `${r.scenarioId} forecast interval` })
            if (p.disclaimerMsg) out.push({ english: p.disclaimer, msg: p.disclaimerMsg, where: `${r.scenarioId} forecast note` })
          }
        }
        // Sentences localized through the registry only (no field on the type).
        for (const english of [...h.risk.limitations, h.risk.data_window, h.multivariate?.explanation ?? '']) {
          const m = msgForEnglish(english)
          if (m) out.push({ english, msg: m, where: `${r.scenarioId} registry` })
        }
      }
    }
    for (const a of e.alerts) {
      if (a.titleMsg) out.push({ english: a.title, msg: a.titleMsg, where: `${r.scenarioId} alert title` })
      if (a.detailMsg) out.push({ english: a.detail, msg: a.detailMsg, where: `${r.scenarioId} alert detail` })
    }
    for (const rec of e.recommendations) {
      if (rec.titleMsg) out.push({ english: rec.title, msg: rec.titleMsg, where: `${r.scenarioId} rec title` })
      if (rec.rationaleMsg) out.push({ english: rec.rationale, msg: rec.rationaleMsg, where: `${r.scenarioId} rec rationale` })
    }
  }
  // Every exam measure branch (eyes and ears, both sides, missing values and baselines).
  const cases: [MetricCode, number | null, number | null][] = [
    ['RETINAL_THICKNESS', 330, 300], ['RETINAL_THICKNESS', 302, 300], ['CHOROIDAL_FOLDS', 1, 0], ['CHOROIDAL_FOLDS', 1, 1], ['CHOROIDAL_FOLDS', 0, 0],
    ['OPTIC_NERVE_SHEATH_DIAMETER', 5.9, 5.2], ['OPTIC_NERVE_SHEATH_DIAMETER', 5.3, 5.2], ['VISUAL_ACUITY', 0.2, 0], ['VISUAL_ACUITY', 0.05, 0],
    ['HEARING_THRESHOLD_HIGH', 45, 10], ['HEARING_THRESHOLD_HIGH', 25, 10], ['HEARING_THRESHOLD_HIGH', 12, 10],
    ['HEARING_THRESHOLD_LOW', 45, 10], ['HEARING_THRESHOLD_LOW', 25, 10], ['HEARING_THRESHOLD_LOW', 8, 10],
    ['RETINAL_THICKNESS', null, 300], ['HEARING_THRESHOLD_LOW', 20, null],
  ]
  for (const side of ['RIGHT', 'LEFT'] as const)
    for (const [metric, value, baseline] of cases) {
      const r = assessMeasure(metric, side, value, baseline)
      if (r.noteMsg) out.push({ english: r.note, msg: r.noteMsg, where: `exam measure ${metric}` })
    }
  // Device paused, then resumed, by an operator.
  {
    const e = new HealthEngine({ scenarioId: 'NOMINAL' })
    const step = (min: number) => {
      const end = e.simTime + min * MIN_MS
      while (e.simTime < end) {
        e.advanceTo(Math.min(end, e.simTime + MIN_MS))
        e.evaluate()
        for (const h of Object.values(e.health))
          for (const m of Object.values(h.metrics)) {
            const english = m?.explanation
            const found = english ? msgForEnglish(english) : undefined
            if (english && found && /^(pause|resume)\./.test(found.id)) out.push({ english, msg: found, where: 'device pause' })
          }
      }
    }
    e.setDevicePaused('DEV-BIO-AST-01', true)
    step(5)
    e.setDevicePaused('DEV-BIO-AST-01', false)
    step(1)
  }
  // Space weather advisories for every branch.
  const ev = (kind: SpaceWeatherEvent['kind'], extra: Partial<SpaceWeatherEvent> = {}): SpaceWeatherEvent =>
    ({ id: kind, kind, startTime: '2026-11-10T04:00:00Z', peakTime: null, classType: null, kpIndex: null, link: '', ...extra }) as SpaceWeatherEvent
  const snap = (events: SpaceWeatherEvent[]): SpaceWeatherSnapshot => ({
    data_origin: 'REAL_PUBLIC',
    source: 'NASA DONKI (CCMC)',
    sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    retrievedAt: '2026-11-10T12:00:00Z',
    window: { start: '2026-11-01T00:00:00Z', end: '2026-11-10T12:00:00Z' },
    events,
    mode: 'snapshot',
  })
  const storms = [ev('SEP'), ev('SOLAR_FLARE', { classType: 'X1.2' }), ev('SOLAR_FLARE', { classType: 'X2.0' })]
  for (const [snapshot, profile] of [
    [null, 'ISS'],
    [snap([]), 'ISS'],
    [snap(storms), 'MOON'],
    [snap(storms.slice(0, 2)), 'MARS_TRANSIT'],
    [snap([ev('SEP')]), 'LAUNCH'],
    [snap([ev('SEP')]), 'ISS'],
  ] as const) {
    const adv = assessSpaceWeather(snapshot, profile)
    for (const english of [adv.title, adv.body]) {
      const m = msgForEnglish(english)
      if (m) out.push({ english, msg: m, where: `space weather ${profile}` })
    }
  }
  // Keep one sample per distinct English sentence.
  const seen = new Set<string>()
  return out.filter((s) => (seen.has(s.english) ? false : (seen.add(s.english), true)))
}

const samples = collect()

describe('engine text', () => {
  it('collects a broad sample of engine sentences', () => {
    const ids = new Set(samples.map((s) => s.msg.id))
    expect(samples.length).toBeGreaterThan(40)
    for (const id of ['exam.method.eyes', 'exam.method.ears', 'exam.note.retina.over', 'exam.note.retina.within', 'exam.label.eyeWeek', 'exam.label.pre.eyes.0', 'exam.sum.flagged.eyes', 'exam.sum.withNoise', 'exam.hit.eyes', 'forecast.methodWith', 'forecast.disclaimer', 'forecast.disclaimerLong', 'forecast.historyShort', 'forecast.interval', 'pause.label', 'resume.label']) {
      expect(ids, id).toContain(id)
    }
    for (const id of ['head.normal', 'head.so', 'alert.titleFor', 'alert.detail', 'recTitle', 'rec.rationale', 'rec.onboardRationale', 'rec.rationaleCtx', 'limit.simulated', 'dataWindow', 'mv.typical', 'sw.noData.title', 'sw.quiet.body', 'sw.shelter.bodyMoon', 'sw.shelter.bodyDeep', 'sw.launch.body', 'sw.monitor.body']) {
      expect(ids, id).toContain(id)
    }
  })

  it('renders the English templates byte for byte like the engine English text', () => {
    const bad = samples.filter((s) => renderEngineMsg(s.msg, { english: true }) !== s.english).map((s) => [s.where, s.english, renderEngineMsg(s.msg, { english: true })])
    expect(bad).toEqual([])
  })

  it('returns the English field unchanged in English', () => {
    for (const s of samples) expect(engineText('other', s.english)).toBe(s.english)
    const e = new HealthEngine({ scenarioId: 'ACUTE_CARDIO' })
    e.advanceTo(e.simTime + 60 * MIN_MS)
    e.evaluate()
    for (const a of e.alerts) {
      expect(alertTitle(a)).toBe(a.title)
      expect(alertDetail(a)).toBe(a.detail)
    }
    for (const r of e.recommendations) {
      expect(recTitle(r)).toBe(r.title)
      expect(recRationale(r)).toBe(r.rationale)
    }
  })

  for (const lang of ['pt-BR', 'es', 'ja', 'de'] as Lang[]) {
    describe(lang, () => {
      beforeAll(async () => {
        await setLanguage(lang, { persist: false })
      })
      afterAll(async () => {
        await setLanguage('en', { persist: false })
      })

      it('translates every sampled sentence without leftovers', () => {
        const problems: string[][] = []
        for (const s of samples) {
          const out = renderEngineMsg(s.msg)
          if (out === null) problems.push([s.where, 'missing key', s.msg.id])
          else if (/\{\w+\}/.test(out)) problems.push([s.where, 'placeholder left', out])
          else if (DASHES.test(out)) problems.push([s.where, 'dash', out])
          else if (out === s.english && !/^[A-Z]+[\s:]/.test(s.english)) problems.push([s.where, 'still English', out])
        }
        expect(problems).toEqual([])
      })

      it('localizes through the English text alone (registry lookup)', () => {
        const headline = samples.find((s) => s.msg.id === 'head.normal')!
        expect(engineText('headline', headline.english)).toBe(renderEngineMsg(headline.msg))
        expect(engineText('headline', headline.english)).not.toBe(headline.english)
      })
    })
  }

  it('localizes the mission profiles and hazard names, and keeps English as the engine object', async () => {
    for (const id of MISSION_PROFILE_ORDER) expect(localMissionProfile(id)).toBe(missionProfile(id))
    expect(LOCAL_HAZARD_LABEL.RADIATION.label).toBe(HAZARD_LABEL.RADIATION.label)
    await setLanguage('pt-BR', { persist: false })
    try {
      for (const id of MISSION_PROFILE_ORDER) {
        const en = missionProfile(id)
        const p = localMissionProfile(id)
        expect(p.id).toBe(en.id)
        expect(p.radiation.doseEquivalentMSvPerDay).toEqual(en.radiation.doseEquivalentMSvPerDay)
        expect(p.summary).not.toBe(en.summary)
        expect(p.bodyEffects.length).toBe(en.bodyEffects.length)
        for (const [i, h] of p.hazards.entries()) expect(h.why, `${id} ${h.id}`).not.toBe(en.hazards[i]!.why)
        for (const s of [p.label, p.summary, p.autonomy, ...p.bodyEffects, ...p.countermeasures]) expect(DASHES.test(s)).toBe(false)
      }
      expect(LOCAL_HAZARD_LABEL.RADIATION.label).toBe('Radiação espacial')
    } finally {
      await setLanguage('en', { persist: false })
    }
  })

  it('keeps the exam rule titles identical to the engine English', () => {
    for (const [id, title] of Object.entries(EXAM_RULE_TITLES)) expect(en[`eng.rule.${id}` as keyof typeof en], id).toBe(title)
  })

  it('every engine key exists in English', () => {
    expect(Object.keys(en).filter((k) => k.startsWith('eng.')).length).toBeGreaterThan(200)
  })
})
