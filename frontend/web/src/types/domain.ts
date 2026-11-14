/**
 * AHI shared domain contract.
 *
 * This file is the single source of truth shared by the engine (src/engine),
 * the state store (src/state) and every UI feature (src/features, src/components).
 * Change it only additively; never rename or remove fields used by other modules.
 *
 * Canonical model follows PROJECT_MASTER.md section 6.3.
 * Every observation carries data_origin. In this MVP all device data is SIMULATED.
 */

// ---------------------------------------------------------------------------
// Basic enums (string unions; erasableSyntaxOnly forbids TS enums)
// ---------------------------------------------------------------------------

export type DataOrigin = 'REAL_PUBLIC' | 'DERIVED' | 'SIMULATED' | 'MANUAL'

export type QualityStatus = 'VALID' | 'QUESTIONABLE' | 'INVALID' | 'MISSING'

/** Operational attention level (prototype, NOT a medical classification). */
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'

/** UI status for anything colorable. NO_DATA covers DATA_STALE / DEVICE_OFFLINE. */
export type Status = RiskLevel | 'NO_DATA'

export type MissionPhase = 'PRE_FLIGHT' | 'IN_FLIGHT' | 'POST_FLIGHT'

export type ActivityContext = 'SLEEP' | 'REST' | 'WORK' | 'EXERCISE' | 'EVA'

export type MetricCode =
  | 'HEART_RATE'
  | 'HRV_RMSSD'
  | 'SPO2'
  | 'RESPIRATORY_RATE'
  | 'SYSTOLIC_BP'
  | 'DIASTOLIC_BP'
  | 'SKIN_TEMPERATURE'
  | 'ACTIVITY_LEVEL'
  | 'SLEEP_DURATION'
  | 'SLEEP_EFFICIENCY'
  | 'EXERCISE_LOAD'
  | 'REACTION_TIME'
  | 'HYDRATION'
  | 'CO2'
  | 'CABIN_TEMPERATURE'
  | 'RELATIVE_HUMIDITY'
  | 'RADIATION_DOSE_RATE'
  | 'RADIATION_DOSE'

/**
 * Body regions rendered by the 3D anatomy viewer and used to group metrics.
 * Each region maps to one or more metrics (see METRIC_CATALOG[].region).
 */
export type BodyRegionId =
  | 'brain' // sleep, cognition, reaction time
  | 'eyes' // spaceflight associated neuro-ocular syndrome context (SANS), fluid shift
  | 'heart' // HR, HRV, blood pressure
  | 'lungs' // SpO2, respiratory rate
  | 'kidneys' // hydration
  | 'muscles' // exercise load, activity
  | 'bones' // bone loss context, radiation exposure
  | 'skin' // skin temperature, thermal load

export type DeviceKind =
  | 'BIO_MONITOR' // Astroskin / Bio-Monitor style smart shirt (simulated)
  | 'ACTIGRAPHY' // Actiwatch style wrist device (simulated)
  | 'BP_MONITOR'
  | 'EXERCISE_CEVIS'
  | 'EXERCISE_ARED'
  | 'EXERCISE_T2'
  | 'ENV_SENSOR' // cabin CO2 / temperature / humidity (simulated)
  | 'DOSIMETER' // radiation (simulated)

export type DeviceState = 'ONLINE' | 'DEGRADED' | 'DATA_STALE' | 'OFFLINE'

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface MetricDefinition {
  code: MetricCode
  label: string // short UI label, e.g. "Heart rate"
  shortLabel: string // e.g. "HR"
  unit: string // canonical unit, e.g. "bpm"
  region: BodyRegionId | 'environment'
  decimals: number
  /** Which direction is bad. 'both' means deviation either way matters. */
  badDirection: 'up' | 'down' | 'both'
  /** Plain-language one-liner for non-experts. */
  plainLanguage: string
  /** Typical physiologic display range for charts (not a clinical limit). */
  displayRange: [number, number]
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Astronaut {
  id: string // pseudonymized, e.g. "AST-01"
  callsign: string // e.g. "ORION"
  role: string // e.g. "Commander"
  roleShort: string // e.g. "CDR"
  age: number
  sex: 'F' | 'M'
  missionDay: number
  /** Accent color used for this crew member in charts/avatars. */
  color: string
}

export interface Mission {
  id: string
  name: string
  vehicle: string // e.g. "ISS (simulated analog)"
  phase: MissionPhase
  startedAt: string // ISO UTC
  /** One-way comm delay in seconds (ISS ~0, Moon ~1.3, Mars 180..1320). */
  commDelaySec: number
}

export interface SourceReference {
  repository: string | null
  dataset_accession: string | null
  file_name: string | null
  record_reference: string | null
}

/** Canonical HealthObservation (PROJECT_MASTER.md 6.3). */
export interface HealthObservation {
  observation_id: string
  subject_id: string // astronaut id or "CABIN" for environment
  mission_id: string
  device_id: string
  metric_code: MetricCode
  value: number | null // null = missing, never replaced by zero
  unit: string
  measured_at: string // ISO UTC (simulated clock)
  received_at: string
  data_origin: DataOrigin
  source_reference: SourceReference
  quality: { status: QualityStatus; confidence: number; is_estimated: boolean }
  context: { mission_phase: MissionPhase; activity: ActivityContext }
  metadata: Record<string, unknown>
}

export interface Device {
  id: string
  kind: DeviceKind
  name: string // e.g. "Bio-Monitor shirt (sim)"
  assignedTo: string | null // astronaut id or null for cabin devices
  state: DeviceState
  batteryPct: number | null
  signalPct: number | null
  lastSeenAt: number // sim epoch ms
  data_origin: DataOrigin
  metrics: MetricCode[]
}

/** Compact time-series point used for charts/history. t = sim epoch ms. */
export interface TimePoint {
  t: number
  v: number | null
}

export interface Baseline {
  metric: MetricCode
  status: 'READY' | 'INSUFFICIENT_DATA'
  n: number
  mean: number
  median: number
  sd: number
  mad: number
  p05: number
  p95: number
  /** Personal "normal band" used in charts and rules. */
  low: number
  high: number
  windowLabel: string // e.g. "Mission days 1 to 5, rest context"
  version: string
}

export interface MetricState {
  metric: MetricCode
  current: number | null
  unit: string
  status: Status
  zScore: number | null // robust z vs personal baseline
  ewma: number | null
  trendPerHour: number | null // slope of recent window
  baseline: Baseline | null
  lastUpdated: number // sim epoch ms
  quality: QualityStatus
  data_origin: DataOrigin
}

export interface Anomaly {
  id: string
  astronautId: string
  metric: MetricCode
  detectedAt: number
  method: 'ROBUST_Z' | 'EWMA' | 'PERSISTENCE' | 'COMBINED' | 'DATA_QUALITY'
  severity: RiskLevel
  explanation: string // plain language, non-diagnostic
}

export interface ContributingFactor {
  metric: MetricCode | null
  label: string // e.g. "HRV 28% below personal baseline for 3 days"
  weight: number // 0..1 relative contribution
}

export interface RiskAssessment {
  astronautId: string
  risk_level: RiskLevel
  risk_score: number // 0..100, documented in engine/risk.ts
  contributing_factors: ContributingFactor[]
  triggered_rules: string[] // rule ids
  confidence: number // 0..1, lowered by poor data quality
  model_version: string
  evaluated_at: number
  data_window: string
  limitations: string[]
  /** One plain-language sentence summarizing the state for the crew. */
  headline: string
}

export interface ForecastPoint {
  t: number
  v: number
  lo: number // lower bound of uncertainty interval
  hi: number // upper bound
}

export interface Prediction {
  astronautId: string
  metric: MetricCode
  method: string // e.g. "Holt linear smoothing v1"
  horizonHours: number
  points: ForecastPoint[]
  intervalLabel: string // e.g. "80% interval"
  /** Hours until the central forecast leaves the personal band, null if not projected. */
  hoursToBandExit: number | null
  eligible: boolean // false => show "insufficient data"
  disclaimer: string
}

export interface Recommendation {
  id: string
  astronautId: string
  ruleId: string
  title: string // short imperative, e.g. "Review sleep schedule and light exposure"
  rationale: string // why, in plain language
  priority: RiskLevel
  audience: 'CREW' | 'FLIGHT_SURGEON' | 'MISSION_CONTROL'
  region: BodyRegionId | 'environment' | null
  requiresHumanReview: boolean
  createdAt: number
  status: 'PENDING' | 'DONE' | 'DISMISSED'
  /** If the crew logs this action, the simulator can apply a hypothetical effect. */
  interventionKind: InterventionKind | null
}

export type InterventionKind =
  | 'REST_PROTOCOL'
  | 'SLEEP_EXTENSION'
  | 'HYDRATION'
  | 'EXERCISE_ADJUSTMENT'
  | 'SENSOR_CHECK'
  | 'CABIN_VENTILATION'
  | 'MEDICAL_CONSULT'

export interface Intervention {
  id: string
  astronautId: string
  kind: InterventionKind
  recommendationId: string | null
  loggedAt: number
  actor: string
  note: string
}

export interface Alert {
  id: string
  astronautId: string | null // null = cabin/environment
  severity: RiskLevel
  title: string
  detail: string
  region: BodyRegionId | 'environment' | null
  metric: MetricCode | null
  ruleId: string
  createdAt: number
  acknowledgedAt: number | null
  acknowledgedBy: string | null
}

export interface AuditEvent {
  id: string
  at: number
  actor: string
  action: 'ALERT_ACK' | 'INTERVENTION_LOGGED' | 'SCENARIO_CHANGED' | 'RULE_EVALUATED' | 'RECOMMENDATION_UPDATED'
  detail: string
}

export interface RegionState {
  region: BodyRegionId
  status: Status
  metrics: MetricCode[]
  summary: string // plain language, e.g. "Heart rate trending up, HRV below your normal"
}

export interface AstronautHealth {
  astronautId: string
  activity: ActivityContext
  metrics: Partial<Record<MetricCode, MetricState>>
  regions: Record<BodyRegionId, RegionState>
  risk: RiskAssessment
  predictions: Partial<Record<MetricCode, Prediction>>
}

export interface EnvironmentState {
  metrics: Partial<Record<MetricCode, MetricState>>
  status: Status
}

// ---------------------------------------------------------------------------
// Scenarios (PROJECT_MASTER.md section 13)
// ---------------------------------------------------------------------------

export type ScenarioId =
  | 'NOMINAL'
  | 'PROGRESSIVE_FATIGUE'
  | 'ENVIRONMENTAL_CO2'
  | 'PERFORMANCE_DECLINE'
  | 'SENSOR_FAILURE'
  | 'ACUTE_CARDIO' // sudden tachycardia + SpO2 drop for alert demo

export interface ScenarioDefinition {
  id: ScenarioId
  name: string
  description: string
  /** Which astronaut is affected (cabin scenarios affect everyone). */
  targetAstronautId: string | null
}

export interface SimulationClock {
  scenarioId: ScenarioId
  running: boolean
  /** Simulated seconds per real second (e.g. 1 = real time, 600 = 10 min/s). */
  speed: number
  simNow: number // sim epoch ms
  startedAt: number // sim epoch ms at scenario start
}

// ---------------------------------------------------------------------------
// Store contract (implemented in src/state/store.ts with zustand)
// ---------------------------------------------------------------------------

export interface AppState {
  mission: Mission
  crew: Astronaut[]
  devices: Device[]
  scenarios: ScenarioDefinition[]
  clock: SimulationClock

  /** Latest computed health per astronaut id. */
  health: Record<string, AstronautHealth>
  environment: EnvironmentState
  /** Rolling history per astronaut id (or "CABIN") per metric. */
  history: Record<string, Partial<Record<MetricCode, TimePoint[]>>>

  anomalies: Anomaly[]
  alerts: Alert[]
  recommendations: Recommendation[]
  interventions: Intervention[]
  audit: AuditEvent[]

  // UI selection state
  selectedAstronautId: string
  selectedRegion: BodyRegionId | null
  selectedMetric: MetricCode | null

  // actions
  selectAstronaut: (id: string) => void
  selectRegion: (region: BodyRegionId | null) => void
  selectMetric: (metric: MetricCode | null) => void
  setScenario: (id: ScenarioId) => void
  play: () => void
  pause: () => void
  setSpeed: (speed: number) => void
  reset: () => void
  acknowledgeAlert: (alertId: string, actor?: string) => void
  logIntervention: (input: { astronautId: string; kind: InterventionKind; recommendationId?: string; note?: string }) => void
  dismissRecommendation: (id: string) => void
  /** Advance simulation by dtRealMs (called by the ticker). */
  tick: (dtRealMs: number) => void
}
