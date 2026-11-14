/**
 * TEMPORARY STUB STORE.
 * Exposes the full AppState contract with simple fake data so UI and 3D work can
 * start in parallel. The engine agent replaces the internals with the real
 * simulation + intelligence pipeline while keeping the exported API identical:
 *   export const useAppStore: UseBoundStore<StoreApi<AppState>>
 *   export function startTicker(): () => void
 */
import { create } from 'zustand'
import type { AppState, AstronautHealth, BodyRegionId, MetricCode, MetricState, Status, TimePoint } from '../types/domain'
import { CREW, METRIC_CATALOG, MISSION, SCENARIOS } from '../engine/catalog'

const REGIONS: BodyRegionId[] = ['brain', 'eyes', 'heart', 'lungs', 'kidneys', 'muscles', 'bones', 'skin']
const BASE: Partial<Record<MetricCode, number>> = { HEART_RATE: 66, HRV_RMSSD: 55, SPO2: 98, RESPIRATORY_RATE: 14, SYSTOLIC_BP: 118, DIASTOLIC_BP: 76, SKIN_TEMPERATURE: 33.8, ACTIVITY_LEVEL: 40, SLEEP_DURATION: 6.8, SLEEP_EFFICIENCY: 88, EXERCISE_LOAD: 100, REACTION_TIME: 290, HYDRATION: 82 }

function metricState(code: MetricCode, v: number, t: number, status: Status = 'LOW'): MetricState {
  return { metric: code, current: v, unit: METRIC_CATALOG[code].unit, status, zScore: 0, ewma: v, trendPerHour: 0, baseline: { metric: code, status: 'READY', n: 500, mean: v, median: v, sd: v * 0.05, mad: v * 0.04, p05: v * 0.92, p95: v * 1.08, low: v * 0.9, high: v * 1.1, windowLabel: 'stub', version: 'stub' }, lastUpdated: t, quality: 'VALID', data_origin: 'SIMULATED' }
}

function fakeHealth(id: string, t: number, idx: number): AstronautHealth {
  const metrics: AstronautHealth['metrics'] = {}
  for (const [k, base] of Object.entries(BASE) as [MetricCode, number][]) {
    const wobble = Math.sin(t / 60000 + idx) * base * 0.03
    metrics[k] = metricState(k, +(base + wobble).toFixed(1), t, idx === 1 && k === 'HRV_RMSSD' ? 'MODERATE' : 'LOW')
  }
  const regions = Object.fromEntries(REGIONS.map((r) => [r, { region: r, status: (idx === 1 && r === 'heart' ? 'MODERATE' : 'LOW') as Status, metrics: [], summary: 'Within your normal range.' }])) as unknown as AstronautHealth['regions']
  return { astronautId: id, activity: 'WORK', metrics, regions, predictions: {}, risk: { astronautId: id, risk_level: idx === 1 ? 'MODERATE' : 'LOW', risk_score: idx === 1 ? 35 : 8, contributing_factors: [], triggered_rules: [], confidence: 0.9, model_version: 'stub', evaluated_at: t, data_window: 'stub', limitations: [], headline: idx === 1 ? 'HRV is below your normal. Keep an eye on recovery.' : 'All indicators within your normal range.' } }
}

const T0 = Date.parse('2026-11-14T08:00:00Z')

function buildHistory(): AppState['history'] {
  const h: AppState['history'] = {}
  CREW.forEach((a, idx) => {
    h[a.id] = {}
    for (const [k, base] of Object.entries(BASE) as [MetricCode, number][]) {
      const pts: TimePoint[] = []
      for (let i = 288; i >= 0; i--) {
        const t = T0 - i * 5 * 60000
        pts.push({ t, v: +(base + Math.sin(t / 3600000 + idx) * base * 0.04).toFixed(2) })
      }
      h[a.id]![k] = pts
    }
  })
  return h
}

export const useAppStore = create<AppState>()((set, get) => ({
  mission: MISSION,
  crew: CREW,
  devices: CREW.map((a) => ({ id: `DEV-BIO-${a.id}`, kind: 'BIO_MONITOR' as const, name: 'Bio-Monitor shirt (sim)', assignedTo: a.id, state: 'ONLINE' as const, batteryPct: 80, signalPct: 95, lastSeenAt: T0, data_origin: 'SIMULATED' as const, metrics: ['HEART_RATE', 'HRV_RMSSD', 'SPO2', 'RESPIRATORY_RATE', 'SKIN_TEMPERATURE'] as MetricCode[] })),
  scenarios: SCENARIOS,
  clock: { scenarioId: 'NOMINAL', running: true, speed: 60, simNow: T0, startedAt: T0 },
  health: Object.fromEntries(CREW.map((a, i) => [a.id, fakeHealth(a.id, T0, i)])),
  environment: { status: 'LOW', metrics: { CO2: metricState('CO2', 2600, T0), CABIN_TEMPERATURE: metricState('CABIN_TEMPERATURE', 22.5, T0), RELATIVE_HUMIDITY: metricState('RELATIVE_HUMIDITY', 45, T0), RADIATION_DOSE_RATE: metricState('RADIATION_DOSE_RATE', 18, T0) } },
  history: buildHistory(),
  anomalies: [],
  alerts: [{ id: 'AL-1', astronautId: 'AST-02', severity: 'MODERATE', title: 'HRV below personal baseline', detail: 'Stub alert', region: 'heart', metric: 'HRV_RMSSD', ruleId: 'R-HRV-01', createdAt: T0, acknowledgedAt: null, acknowledgedBy: null }],
  recommendations: [{ id: 'REC-1', astronautId: 'AST-02', ruleId: 'R-HRV-01', title: 'Review sleep schedule and light exposure', rationale: 'Stub recommendation', priority: 'MODERATE', audience: 'CREW', region: 'brain', requiresHumanReview: false, createdAt: T0, status: 'PENDING', interventionKind: 'SLEEP_EXTENSION' }],
  interventions: [],
  audit: [],
  selectedAstronautId: CREW[0]!.id,
  selectedRegion: null,
  selectedMetric: null,
  selectAstronaut: (id) => set({ selectedAstronautId: id, selectedRegion: null, selectedMetric: null }),
  selectRegion: (region) => set({ selectedRegion: region }),
  selectMetric: (metric) => set({ selectedMetric: metric }),
  setScenario: (id) => set((s) => ({ clock: { ...s.clock, scenarioId: id } })),
  play: () => set((s) => ({ clock: { ...s.clock, running: true } })),
  pause: () => set((s) => ({ clock: { ...s.clock, running: false } })),
  setSpeed: (speed) => set((s) => ({ clock: { ...s.clock, speed } })),
  reset: () => set((s) => ({ clock: { ...s.clock, simNow: T0 } })),
  acknowledgeAlert: (alertId, actor = 'crew') => set((s) => ({ alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, acknowledgedAt: s.clock.simNow, acknowledgedBy: actor } : a)) })),
  logIntervention: () => {},
  dismissRecommendation: (id) => set((s) => ({ recommendations: s.recommendations.map((r) => (r.id === id ? { ...r, status: 'DISMISSED' } : r)) })),
  tick: (dt) => {
    const s = get()
    if (!s.clock.running) return
    const simNow = s.clock.simNow + dt * s.clock.speed
    set({ clock: { ...s.clock, simNow }, health: Object.fromEntries(s.crew.map((a, i) => [a.id, fakeHealth(a.id, simNow, i)])) })
  },
}))

/** Starts the real-time ticker. Returns a stop function. */
export function startTicker(): () => void {
  let last = performance.now()
  const id = window.setInterval(() => {
    const now = performance.now()
    useAppStore.getState().tick(now - last)
    last = now
  }, 250)
  return () => window.clearInterval(id)
}
