import { describe, expect, it } from 'vitest'
import type { Alert, Astronaut, AstronautHealth, BodyRegionId, MetricState, Recommendation, RiskLevel, Status } from '../../types/domain'
import { METRIC_CATALOG } from '../../engine/catalog'
import {
  crewStatusOf,
  describeAlert,
  describeAstronaut,
  describeNewAlerts,
  describeRegion,
  describeScreen,
  describeStatusChange,
  describeStructure,
  spokenReading,
} from './describe'
import { chunkForSpeech } from './speech'
import { DEFAULT_PREFS, parsePrefs } from './settings'

const crew: Astronaut[] = [
  { id: 'AST-01', callsign: 'ORION', role: 'Commander', roleShort: 'CDR', age: 44, sex: 'F', missionDay: 12, color: '#fff' },
  { id: 'AST-02', callsign: 'VEGA', role: 'Flight engineer', roleShort: 'FE', age: 38, sex: 'M', missionDay: 12, color: '#fff' },
]

function metric(p: Partial<MetricState> & Pick<MetricState, 'metric'>): MetricState {
  return {
    current: 70,
    unit: METRIC_CATALOG[p.metric].unit,
    status: 'LOW',
    zScore: 0,
    ewma: null,
    trendPerHour: null,
    baseline: { metric: p.metric, status: 'READY', n: 50, mean: 65, median: 65, sd: 5, mad: 4, p05: 55, p95: 80, low: 55, high: 80, windowLabel: '', version: 'v1' },
    lastUpdated: 0,
    quality: 'VALID',
    data_origin: 'SIMULATED',
    ...p,
  }
}

function health(level: RiskLevel, opts: { headline?: string; metrics?: MetricState[]; regionStatus?: Partial<Record<BodyRegionId, Status>> } = {}): AstronautHealth {
  const metrics = Object.fromEntries((opts.metrics ?? [metric({ metric: 'HEART_RATE' }), metric({ metric: 'SPO2', current: 98, baseline: null })]).map((m) => [m.metric, m]))
  const regions = Object.fromEntries(
    (['brain', 'heart', 'lungs', 'kidneys', 'muscles', 'bones', 'skin'] as BodyRegionId[]).map((r) => [r, { region: r, status: opts.regionStatus?.[r] ?? 'LOW', metrics: [], summary: r === 'heart' ? 'Heart rate trending up' : '' }]),
  )
  return {
    astronautId: 'AST-01',
    activity: 'REST',
    metrics,
    regions: regions as unknown as AstronautHealth['regions'],
    risk: { astronautId: 'AST-01', risk_level: level, risk_score: 10, contributing_factors: [], triggered_rules: [], confidence: 1, model_version: 'v1', evaluated_at: 0, data_window: '', limitations: [], headline: opts.headline ?? 'All readings within personal normal.' },
    predictions: {},
  }
}

const alert = (p: Partial<Alert> & { id: string }): Alert => ({
  astronautId: 'AST-01',
  severity: 'CRITICAL',
  title: 'Heart rate far above usual.',
  detail: '',
  region: 'heart',
  metric: 'HEART_RATE',
  ruleId: 'R1',
  createdAt: 1,
  acknowledgedAt: null,
  acknowledgedBy: null,
  ...p,
})

const noDashes = (t: string) => expect(t).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`))

describe('spoken text', () => {
  it('reads a value with spoken units and where it sits against the personal range', () => {
    expect(spokenReading(METRIC_CATALOG.HEART_RATE, metric({ metric: 'HEART_RATE', current: 92 }))).toBe('Heart rate 92 beats per minute, above your usual range.')
    expect(spokenReading(METRIC_CATALOG.HEART_RATE, metric({ metric: 'HEART_RATE', current: 50 }))).toBe('Heart rate 50 beats per minute, below your usual range.')
    expect(spokenReading(METRIC_CATALOG.SPO2, metric({ metric: 'SPO2', current: 97, baseline: null }))).toBe('Blood oxygen 97 percent.')
  })

  it('never reads missing data as normal', () => {
    expect(spokenReading(METRIC_CATALOG.HEART_RATE, metric({ metric: 'HEART_RATE', current: null, status: 'NO_DATA' }))).toBe('Heart rate: no reading.')
    const lost = health('LOW', { metrics: [metric({ metric: 'HEART_RATE', current: null, status: 'NO_DATA' }), metric({ metric: 'SPO2', current: null, status: 'NO_DATA' })] })
    expect(crewStatusOf(lost)).toBe('NO_DATA')
    expect(crewStatusOf(undefined)).toBe('NO_DATA')
    expect(describeAstronaut(crew[0]!, lost)).toContain('Missing data is not treated as normal')
  })

  it('describes an alert in plain language with who, where and what to do', () => {
    expect(describeAlert(alert({ id: 'a' }), 'ORION')).toBe('Critical alert for ORION, heart rate. Heart rate far above usual. Act now.')
    expect(describeAlert(alert({ id: 'b', astronautId: null, severity: 'HIGH', metric: null, region: 'environment', title: 'CO2 rising' }), null)).toBe(
      'Warning alert for the cabin, cabin air. CO2 rising. Act soon.',
    )
  })

  it('summarizes several new alerts by the most urgent', () => {
    const t = describeNewAlerts([alert({ id: 'a' }), alert({ id: 'b', severity: 'HIGH' })], () => 'ORION')
    expect(t.startsWith('2 new alerts. Most urgent: Critical alert for ORION')).toBe(true)
    expect(describeNewAlerts([], () => null)).toBe('')
  })

  it('describes status changes and selections in short sentences', () => {
    expect(describeStatusChange('ORION', 'MODERATE', 'HIGH')).toBe('ORION status changed from Watch to Warning, act soon.')
    expect(describeAstronaut(crew[0]!, health('MODERATE', { headline: 'Sleep shorter than usual' }))).toBe('ORION selected. Commander. Status: Watch, keep an eye. Sleep shorter than usual.')
    const h = health('MODERATE', { metrics: [metric({ metric: 'HEART_RATE', current: 92, status: 'MODERATE' }), metric({ metric: 'HRV_RMSSD', current: 40 })], regionStatus: { heart: 'MODERATE' } })
    expect(describeRegion('ORION', 'heart', h)).toBe(
      'Heart selected for ORION. Status: Watch, keep an eye. Heart rate trending up. Heart rate 92 beats per minute, above your usual range. Heart rate variability 40 milliseconds, below your usual range.',
    )
    expect(describeStructure('Left femur', 'ORION', null, h)).toBe('Left femur selected. Shown for context only. No sensor reads this part directly.')
    expect(describeStructure('Left ventricle', 'ORION', 'heart', h)).toMatch(/^Left ventricle selected, part of the heart area for ORION\. Status: Watch/)
  })

  it('describes the screen: who, status, attention, actions, crew, and that data is simulated', () => {
    const rec: Recommendation = {
      id: 'r1',
      astronautId: 'AST-01',
      ruleId: 'R1',
      title: 'Rest and recheck heart rate in 15 minutes',
      rationale: '',
      priority: 'HIGH',
      audience: 'CREW',
      region: 'heart',
      requiresHumanReview: false,
      createdAt: 1,
      status: 'PENDING',
      interventionKind: null,
    }
    const text = describeScreen({
      crew,
      health: { 'AST-01': health('HIGH', { headline: 'Heart rate high at rest' }), 'AST-02': health('LOW') },
      alerts: [alert({ id: 'a' }), alert({ id: 'b', severity: 'HIGH', acknowledgedAt: 5 })],
      recommendations: [rec],
      selectedAstronautId: 'AST-01',
      selectedRegion: null,
      mission: { id: 'm', name: 'Artemis analog', vehicle: '', phase: 'IN_FLIGHT', startedAt: '', commDelaySec: 1 } as never,
    })
    expect(text).toContain('Showing ORION, Commander.')
    expect(text).toContain('Overall status: Warning, act soon.')
    expect(text).toContain('1 open alert needs attention.')
    expect(text).toContain('Recommended actions: 1. Rest and recheck heart rate in 15 minutes.')
    expect(text).toContain('The rest of the crew is nominal.')
    expect(text).toContain('All data is simulated.')
    expect(text).toContain('not a diagnosis')
    noDashes(text)
  })

  it('says when nothing is open', () => {
    const text = describeScreen({ crew, health: {}, alerts: [], recommendations: [], selectedAstronautId: 'AST-01', selectedRegion: 'brain', mission: undefined as never }, 'crew')
    expect(text.startsWith('Crew view.')).toBe(true)
    expect(text).toContain('No open alerts.')
    expect(text).toContain('Brain is selected.')
    expect(text).toContain('Also: VEGA no data.')
  })
})

describe('speech chunks', () => {
  it('splits at sentence ends and keeps chunks short', () => {
    const text = Array.from({ length: 20 }, (_, i) => `Sentence number ${i} is here.`).join(' ')
    const chunks = chunkForSpeech(text, 80)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.length <= 80)).toBe(true)
    expect(chunks.join(' ')).toBe(text)
    expect(chunkForSpeech('   ')).toEqual([])
  })
})

describe('preferences', () => {
  it('defaults to sound on and speech off, and survives bad storage', () => {
    expect(DEFAULT_PREFS).toEqual({ soundOn: true, soundHigh: false, speechOn: false, speechRate: 1 })
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS)
    expect(parsePrefs('{not json')).toEqual(DEFAULT_PREFS)
    expect(parsePrefs(JSON.stringify({ soundOn: false, speechOn: true, speechRate: 9 }))).toEqual({ soundOn: false, soundHigh: false, speechOn: true, speechRate: 1.6 })
  })
})
