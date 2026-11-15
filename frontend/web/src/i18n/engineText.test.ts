import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { EngineMsg, ScenarioId } from '../types/domain'
import { HealthEngine } from '../engine/engine'
import { MIN_MS } from '../engine/text'
import { msgForEnglish } from '../engine/msg'
import { alertDetail, alertTitle, engineText, recRationale, recTitle, renderEngineMsg } from './engineText'
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
  // Keep one sample per distinct English sentence.
  const seen = new Set<string>()
  return out.filter((s) => (seen.has(s.english) ? false : (seen.add(s.english), true)))
}

const samples = collect()

describe('engine text', () => {
  it('collects a broad sample of engine sentences', () => {
    const ids = new Set(samples.map((s) => s.msg.id))
    expect(samples.length).toBeGreaterThan(40)
    for (const id of ['head.normal', 'head.so', 'alert.titleFor', 'alert.detail', 'recTitle', 'rec.rationale', 'rec.onboardRationale', 'rec.rationaleCtx', 'limit.simulated', 'dataWindow', 'mv.typical']) {
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

  it('every engine key exists in English', () => {
    expect(Object.keys(en).filter((k) => k.startsWith('eng.')).length).toBeGreaterThan(200)
  })
})
