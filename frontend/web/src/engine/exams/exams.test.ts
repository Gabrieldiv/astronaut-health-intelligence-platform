import { describe, expect, it } from 'vitest'
import { CREW, MISSION, SCENARIOS } from '../catalog'
import { EXAMS, MISSION_PLAN } from '../config'
import { DAY_MS, HOUR_MS } from '../text'
import { noiseDosePct } from '../sim/exams'
import { HealthEngine } from '../engine'
import { assessMeasure, noiseStatus, sessionStatus } from './assess'
import { EXAM_METRICS, ExamBook } from './book'
import { examSchedule, nextDue, sessionTime } from './schedule'

const START = Date.parse(MISSION.startedAt)
const PLANNED = MISSION_PLAN.plannedDurationDays
const at = (flightDay: number, hour = 12) => START + flightDay * DAY_MS + hour * HOUR_MS
const book = (sans: string[] = []) => new ExamBook({ seed: 20261114, crew: CREW, missionId: MISSION.id, missionStart: START, plannedDays: PLANNED, sansAstronautIds: sans })

describe('exam schedule', () => {
  it('follows the NASA SANS eye exam schedule: pre-flight baseline, FD 30, FD 90 and R-30', () => {
    const eyes = examSchedule('eyes', START, PLANNED)
    expect(eyes.filter((s) => s.isBaseline).map((s) => s.flightDay)).toEqual([-540, -210])
    expect(eyes.filter((s) => !s.isBaseline).map((s) => s.flightDay)).toEqual([30, 90, PLANNED - 30])
    expect(eyes.filter((s) => s.isBaseline).every((s) => s.phase === 'PRE_FLIGHT')).toBe(true)
    // the in-flight Eye Weeks include OCT, ocular ultrasound and visual acuity
    for (const s of eyes.filter((x) => !x.isBaseline)) expect(s.kinds.sort()).toEqual(['OCT', 'OCULAR_ULTRASOUND', 'VISUAL_ACUITY'])
    // ascending and placed at the session hour
    for (let i = 1; i < eyes.length; i++) expect(eyes[i]!.at).toBeGreaterThan(eyes[i - 1]!.at)
    expect(eyes[2]!.at).toBe(sessionTime(START, 30))
  })

  it('plans on-orbit hearing assessments on the demo cadence, inside the mission', () => {
    const ears = examSchedule('ears', START, PLANNED)
    expect(ears.filter((s) => s.isBaseline).map((s) => s.flightDay)).toEqual([-60])
    const days = ears.filter((s) => !s.isBaseline).map((s) => s.flightDay)
    expect(days[0]).toBe(EXAMS.ears.firstFlightDay)
    for (let i = 1; i < days.length; i++) expect(days[i]! - days[i - 1]!).toBe(EXAMS.ears.everyDays)
    expect(Math.max(...days)).toBeLessThan(PLANNED)
  })

  it('gives the next in-flight session after now, and null at the end of the mission', () => {
    const eyes = examSchedule('eyes', START, PLANNED)
    expect(nextDue(eyes, at(-1000))!.flightDay).toBe(30)
    expect(nextDue(eyes, at(44))!.flightDay).toBe(90)
    expect(nextDue(eyes, sessionTime(START, 90))!.flightDay).toBe(PLANNED - 30)
    expect(nextDue(eyes, at(PLANNED))).toBeNull()
  })
})

describe('change from the pre-flight baseline', () => {
  it('flags retinal thickness only beyond the published 19.4 µm test to test variation', () => {
    expect(assessMeasure('RETINAL_THICKNESS', 'RIGHT', 409, 390).status).toBe('LOW')
    expect(assessMeasure('RETINAL_THICKNESS', 'RIGHT', 409.4, 390).status).toBe('LOW')
    const r = assessMeasure('RETINAL_THICKNESS', 'RIGHT', 410, 390)
    expect(r.status).toBe('MODERATE')
    expect(r.change).toBe(20)
    expect(r.ruleId).toBe('R-SANS-01')
    // the person's own baseline drives the rule, not an absolute value
    expect(assessMeasure('RETINAL_THICKNESS', 'LEFT', 450, 440).status).toBe('LOW')
  })

  it('flags new choroidal folds, not folds already present before flight', () => {
    expect(assessMeasure('CHOROIDAL_FOLDS', 'RIGHT', 1, 0).status).toBe('MODERATE')
    expect(assessMeasure('CHOROIDAL_FOLDS', 'RIGHT', 1, 1).status).toBe('LOW')
    expect(assessMeasure('CHOROIDAL_FOLDS', 'RIGHT', 0, 0).status).toBe('LOW')
  })

  it('uses the demo change levels for optic nerve sheath and acuity', () => {
    expect(assessMeasure('OPTIC_NERVE_SHEATH_DIAMETER', 'LEFT', 5.49, 5.0).status).toBe('LOW')
    expect(assessMeasure('OPTIC_NERVE_SHEATH_DIAMETER', 'LEFT', 5.5, 5.0).status).toBe('MODERATE')
    expect(assessMeasure('VISUAL_ACUITY', 'LEFT', -0.02, -0.1).status).toBe('LOW')
    expect(assessMeasure('VISUAL_ACUITY', 'LEFT', 0.0, -0.1).status).toBe('MODERATE')
    // better acuity than before is never flagged
    expect(assessMeasure('VISUAL_ACUITY', 'LEFT', -0.3, -0.1).status).toBe('LOW')
  })

  it('applies the NASA HSRB hearing shift metric (> 10 dB) and the 30 dB large shift', () => {
    expect(assessMeasure('HEARING_THRESHOLD_HIGH', 'RIGHT', 20, 10).status).toBe('LOW')
    expect(assessMeasure('HEARING_THRESHOLD_HIGH', 'RIGHT', 21.7, 10).status).toBe('MODERATE')
    expect(assessMeasure('HEARING_THRESHOLD_LOW', 'LEFT', 40, 10).status).toBe('HIGH')
  })

  it('never reads missing data as normal', () => {
    const noBase = assessMeasure('RETINAL_THICKNESS', 'RIGHT', 400, null)
    expect(noBase.status).toBe('NO_DATA')
    expect(noBase.note).toMatch(/No pre-flight baseline/)
    expect(assessMeasure('HEARING_THRESHOLD_HIGH', 'LEFT', null, 10).status).toBe('NO_DATA')
    expect(sessionStatus('eyes', [])).toBe('NO_DATA')
    expect(noiseStatus(null, null)).toBe('NO_DATA')
  })

  it('reads several eye signs in one session as a Warning (demo rule)', () => {
    const trt = assessMeasure('RETINAL_THICKNESS', 'RIGHT', 430, 390)
    const folds = assessMeasure('CHOROIDAL_FOLDS', 'RIGHT', 1, 0)
    const ok = assessMeasure('VISUAL_ACUITY', 'RIGHT', -0.08, -0.08)
    expect(sessionStatus('eyes', [trt, ok])).toBe('MODERATE')
    expect(sessionStatus('eyes', [trt, folds, ok])).toBe('HIGH')
    // two flagged sides of the same measure are still one sign
    expect(sessionStatus('eyes', [trt, assessMeasure('RETINAL_THICKNESS', 'LEFT', 430, 390)])).toBe('MODERATE')
  })
})

describe('noise exposure', () => {
  it('computes the noise dose against 85 dBA over 8 hours (NASA-STD-3001 V2 6115)', () => {
    expect(noiseDosePct([{ leqDba: 85, hours: 8 }])).toBe(100)
    expect(noiseDosePct([{ leqDba: 82, hours: 16 }])).toBe(100)
    expect(noiseDosePct([{ leqDba: 66, hours: 16 }])).toBeLessThan(5)
  })

  it('flags the work period above the 72 dBA flight rule and a dose above 100%', () => {
    expect(noiseStatus(71.9, 10)).toBe('LOW')
    expect(noiseStatus(72.5, 20)).toBe('MODERATE')
    expect(noiseStatus(84, 120)).toBe('HIGH')
  })
})

describe('ExamBook', () => {
  it('says "no exam yet" (NO_DATA, never normal) before the first in-flight exam', () => {
    const b = book()
    const eyes = b.state('AST-01', 'eyes', at(20))
    expect(eyes.status).toBe('NO_DATA')
    expect(eyes.sessions).toEqual([])
    expect(eyes.baselineSessions.length).toBe(2)
    expect(eyes.summary).toMatch(/No in-flight eye exam yet/)
    expect(eyes.nextDue?.flightDay).toBe(30)
    const ears = b.state('AST-01', 'ears', at(10))
    expect(ears.status).toBe('NO_DATA')
    expect(ears.summary).toMatch(/No in-flight hearing test yet/)
    const ms = b.metricStates('AST-01', at(10))
    for (const m of ['RETINAL_THICKNESS', 'CHOROIDAL_FOLDS', 'OPTIC_NERVE_SHEATH_DIAMETER', 'VISUAL_ACUITY', 'HEARING_THRESHOLD_HIGH', 'HEARING_THRESHOLD_LOW'] as const) {
      expect(ms[m]!.status, m).toBe('NO_DATA')
      expect(ms[m]!.current, m).toBeNull()
    }
    expect(b.hits('AST-01', at(10))).toEqual([])
  })

  it('says NO_DATA when there is no pre-flight baseline (before the first pre-flight session)', () => {
    const eyes = book().state('AST-01', 'eyes', at(-600))
    expect(eyes.status).toBe('NO_DATA')
    expect(eyes.summary).toMatch(/No pre-flight eye exam baseline/)
  })

  it('keeps every crew member within the expected variation over a whole nominal mission', () => {
    const b = book()
    for (const a of CREW) {
      for (const region of ['eyes', 'ears'] as const) {
        for (const s of b.allSessions(a.id, region)) {
          expect(s.data_origin).toBe('SIMULATED')
          for (const o of s.observations) {
            expect(o.data_origin).toBe('SIMULATED')
            expect(o.exam?.exam_id).toBe(s.id)
            expect(o.exam?.is_baseline).toBe(s.isBaseline)
          }
          if (!s.isBaseline) expect(s.status, `${a.id} ${s.label}`).toBe('LOW')
        }
      }
      for (let d = 0; d < PLANNED; d++) expect(b.noiseDay(a.id, d).status, `${a.id} noise FD ${d}`).toBe('LOW')
      expect(b.hits(a.id, at(PLANNED - 1))).toEqual([])
    }
  })

  it('shows sessions only once the clock reaches them', () => {
    const b = book()
    expect(b.state('AST-02', 'eyes', sessionTime(START, 30) - 1).sessions.length).toBe(0)
    const s = b.state('AST-02', 'eyes', sessionTime(START, 30))
    expect(s.sessions.map((x) => x.flightDay)).toEqual([30])
    expect(s.status).toBe('LOW')
    expect(s.nextDue?.flightDay).toBe(90)
    const ears = b.state('AST-02', 'ears', at(44))
    expect(ears.sessions.map((x) => x.flightDay)).toEqual([15])
    expect(ears.nextDue?.flightDay).toBe(45)
    expect(ears.noise?.length).toBe(EXAMS.noise.keepDays)
    expect(ears.noise!.at(-1)!.flightDay).toBe(43)
  })

  it('SANS scenario hook: gradual change for the target only, Watch at FD 30, Warning at FD 90', () => {
    const b = book(['AST-01'])
    const fd30 = b.state('AST-01', 'eyes', at(44))
    expect(fd30.status).toBe('MODERATE')
    expect(fd30.latest!.results.find((r) => r.metric === 'RETINAL_THICKNESS' && r.laterality === 'RIGHT')!.status).toBe('MODERATE')
    const fd90 = b.state('AST-01', 'eyes', at(95))
    expect(fd90.status).toBe('HIGH')
    expect(fd90.latest!.results.some((r) => r.metric === 'CHOROIDAL_FOLDS' && r.status === 'MODERATE')).toBe(true)
    const trt = (st: typeof fd30) => st.latest!.results.find((r) => r.metric === 'RETINAL_THICKNESS' && r.laterality === 'RIGHT')!.change!
    expect(trt(fd90)).toBeGreaterThan(trt(fd30))
    // decision support: a rule hit with region and plain label, never a diagnosis word
    const hits = b.hits('AST-01', at(95))
    expect(hits.map((h) => h.ruleId)).toEqual(['R-SANS-01'])
    expect(hits[0]!.region).toBe('eyes')
    expect(hits[0]!.level).toBe('HIGH')
    expect(hits[0]!.label).not.toMatch(/diagnos|SANS confirmed/i)
    // the other crew members are untouched
    for (const id of ['AST-02', 'AST-03', 'AST-04']) expect(b.state(id, 'eyes', at(95)).status).toBe('LOW')
  })

  it('gives one MetricState per exam measure with the latest value', () => {
    const ms = book().metricStates('AST-03', at(44))
    expect(Object.keys(ms).sort()).toEqual([...EXAM_METRICS].sort())
    for (const m of EXAM_METRICS) {
      expect(ms[m]!.status, m).toBe('LOW')
      expect(ms[m]!.current, m).not.toBeNull()
      expect(ms[m]!.data_origin).toBe('SIMULATED')
    }
  })
})

describe('engine wiring', () => {
  it('NOMINAL: eyes and ears are monitored regions with exam follow up', () => {
    const e = new HealthEngine({ scenarioId: 'NOMINAL', historyDays: 1, dailyHistoryDays: 6, timelinePregenHours: 1 })
    for (const a of CREW) {
      const h = e.health[a.id]!
      expect(h.regions.eyes.status).toBe('LOW')
      expect(h.regions.ears.status).toBe('LOW')
      expect(h.regions.eyes.metrics).toContain('RETINAL_THICKNESS')
      expect(h.exams?.eyes?.nextDue?.flightDay).toBe(90)
      expect(h.exams?.ears?.sessions.length).toBeGreaterThan(0)
      expect(h.metrics.RETINAL_THICKNESS?.status).toBe('LOW')
    }
    expect(e.alerts.filter((x) => x.region === 'eyes' || x.region === 'ears')).toEqual([])
  })

  it('SANS_PROGRESSION: the target eyes need review and raise an eye alert', () => {
    const target = SCENARIOS.find((s) => s.id === 'SANS_PROGRESSION')!.targetAstronautId!
    const e = new HealthEngine({ scenarioId: 'SANS_PROGRESSION', historyDays: 1, dailyHistoryDays: 6, timelinePregenHours: 1 })
    expect(e.health[target]!.regions.eyes.status).toBe('MODERATE')
    expect(e.health[target]!.risk.triggered_rules).toContain('R-SANS-01')
    const alerts = e.alerts.filter((x) => x.ruleId === 'R-SANS-01')
    expect(alerts.length).toBe(1)
    expect(alerts[0]!.astronautId).toBe(target)
    expect(alerts[0]!.region).toBe('eyes')
    for (const a of CREW.filter((x) => x.id !== target)) expect(e.health[a.id]!.regions.eyes.status).toBe('LOW')
  })
})
