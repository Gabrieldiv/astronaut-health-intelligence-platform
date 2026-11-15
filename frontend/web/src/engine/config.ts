/**
 * AHI engine configuration.
 *
 * DEMO CONFIGURATION, NOT OFFICIAL LIMITS.
 * Every fixed number in this file is a demo value chosen so the prototype behaves
 * sensibly with simulated data. None of them is an official NASA limit, a flight
 * rule or a clinical threshold. Personal baseline bands drive status first; the few
 * fixed thresholds below are a safety net for the demo and must be reviewed by a
 * flight surgeon before any real use.
 */
import type { CommProfileId, ExamKind, ForecastHorizonHours, InterventionKind, MetricCode, MissionPlan, RiskLevel } from '../types/domain'

export const ENGINE_VERSION = 'ahi-engine 2.0.0'
export const RISK_MODEL_VERSION = 'AHI transparent rules v2.0 (demo)'
export const BASELINE_VERSION = 'robust-baseline v1 (median/MAD)'
export const FORECAST_METHOD = 'Damped Holt linear smoothing v1'
export const REC_CATALOG_VERSION = 'rec-catalog v2.0'

/** Simulation clock and history. */
export const SIM = {
  seed: 20261114,
  /** Sim time at which every scenario starts (morning, after wake-up). */
  startIso: '2026-11-14T08:00:00Z',
  /** Minute level history pre-generated before the scenario starts. */
  historyDays: 5,
  /** Daily metrics (sleep, exercise sessions, reaction tests) get a longer backfill. */
  dailyHistoryDays: 14,
  /** Points newer than this keep 1 minute resolution; older ones keep 5 minutes. */
  fineWindowMin: 120,
  coarseResolutionMin: 5,
  /** When an advance needs more than this many minutes, the sim steps 5 minutes at a time. */
  coarseStepThresholdMin: 60,
  /** Safety cap per advance call. */
  maxStepsPerAdvance: 3000,
  /** Max event points kept per daily metric. */
  maxEventPoints: 40,
} as const

/** Sim seconds per real second. */
export const SPEED_PRESETS = [1, 60, 600, 3600] as const
export const DEFAULT_SPEED = 60

/** Personal baseline settings. */
export const BASELINE = {
  /** Normal band = median +/- bandK robust SD (robust SD = 1.4826 x MAD, floored per metric). */
  bandK: 2,
  minN: { continuous: 72, exercise: 36, event: 5 },
  /** Reservoir size per context bucket: 5 days at 5 minute resolution. */
  reservoirSize: 5 * 288,
  eventReservoirSize: 28,
  /** Recompute a bucket baseline after this many new accepted samples (2 sim hours). */
  recomputeEvery: 24,
  /** Same, while pre-generating history (keeps startup fast). */
  recomputeEveryPregen: 144,
  /** Samples further than this robust z are not added to the baseline (outlier gate). */
  gateZ: 3.5,
  gateEventZ: 2.5,
  /** While the drift indicator is above this, samples are not added (keeps a slow decline out of "normal"). */
  gateDrift: 1.0,
} as const

/** Anomaly detection settings. */
export const ANOMALY = {
  /** Robust z of the 3 sample median, in the bad direction. */
  acuteZ: { MODERATE: 4, HIGH: 5.5, CRITICAL: 7 },
  drift: {
    halfLifeMin: 180,
    moderate: 1.0,
    moderateMinHours: 3,
    high: 2.0,
    highMinHours: 12,
    clear: 0.8,
    zClamp: 6,
  },
  /** Daily metrics: consecutive values outside the band. */
  event: { moderateRun: 2, highRun: 3, singleValueZ: 3 },
  ewmaDisplayHalfLifeMin: 10,
  recentWindow: 3,
  questionableWindow: 15,
} as const

/**
 * Risk score: noisy-OR of rule weights (see risk.ts).
 * score = 100 x (1 - product(1 - w_i)), one weight per triggered rule.
 */
export const RISK = {
  weights: { LOW: 0, MODERATE: 0.2, HIGH: 0.45, CRITICAL: 0.85 } satisfies Record<RiskLevel, number>,
  bands: { MODERATE: 20, HIGH: 45, CRITICAL: 80 },
  /** Without an acute CRITICAL rule the level is capped at HIGH (slow patterns call for review, not emergency). */
  slowPatternCap: 'HIGH' as RiskLevel,
  /**
   * Self reported rules (R-PSY-*) share ONE weight in the score (the largest of them), so the
   * check-in alone can reach MODERATE at most. A reported symptom counts with this small weight.
   */
  selfReportGroup: 'SELF_REPORT',
  symptomWeight: 0.05,
  /** R-FAT-01 is corroborated by self report when fatigue was at least this high (1..5) ... */
  selfReportHighFatigue: 4,
  /** ... in at least this many consecutive recent check-ins. */
  selfReportCorroborateRun: 2,
} as const

export const ALERTS = {
  /** An alert auto-resolves after its rule has been clear for this long. */
  resolveAfterMin: 10,
  maxAlerts: 150,
  maxAnomalies: 200,
  maxAudit: 300,
  maxRecommendations: 120,
  recommendationEpisodeGapMin: 30,
} as const

export const FORECAST = {
  binMin: 30,
  windowHours: 24,
  minBins: 12,
  binsFor24h: 40,
  minEvents: 5,
  eventsFor72h: 10,
  alpha: 0.4,
  beta: 0.15,
  phi: 0.9,
  z80: 1.2816,
  /** Bins checked for a recent excursion on the opposite side of the band (recovery, not drift). */
  recoveryLookbackBins: 6,
  recomputeEveryMin: 10,
} as const

export type ThresholdOp = 'above' | 'below'

export interface FixedThreshold {
  ruleId: string
  metric: MetricCode
  op: ThresholdOp
  value: number
  level: RiskLevel
  /** Only applies outside exercise and recovery. */
  restOnly?: boolean
  /** Short name used in explanations, e.g. "demo safety floor". */
  name: string
}

/**
 * Fixed thresholds. DEMO CONFIGURATION, NOT OFFICIAL LIMITS.
 * Ordered from most to least severe per metric.
 */
export const FIXED_THRESHOLDS: FixedThreshold[] = [
  { ruleId: 'R-SPO2-02', metric: 'SPO2', op: 'below', value: 90, level: 'CRITICAL', name: 'demo safety floor' },
  { ruleId: 'R-SPO2-02', metric: 'SPO2', op: 'below', value: 92, level: 'HIGH', name: 'demo watch floor' },
  { ruleId: 'R-HR-03', metric: 'HEART_RATE', op: 'above', value: 135, level: 'CRITICAL', restOnly: true, name: 'demo resting ceiling' },
  { ruleId: 'R-HR-03', metric: 'HEART_RATE', op: 'above', value: 120, level: 'HIGH', restOnly: true, name: 'demo resting watch level' },
  { ruleId: 'R-ENV-CO2-01', metric: 'CO2', op: 'above', value: 7500, level: 'CRITICAL', name: 'demo critical level' },
  { ruleId: 'R-ENV-CO2-01', metric: 'CO2', op: 'above', value: 5300, level: 'HIGH', name: 'demo warning level' },
  { ruleId: 'R-ENV-CO2-01', metric: 'CO2', op: 'above', value: 4000, level: 'MODERATE', name: 'demo watch level' },
  { ruleId: 'R-ENV-TEMP-01', metric: 'CABIN_TEMPERATURE', op: 'above', value: 27, level: 'MODERATE', name: 'demo comfort band' },
  { ruleId: 'R-ENV-TEMP-01', metric: 'CABIN_TEMPERATURE', op: 'below', value: 18, level: 'MODERATE', name: 'demo comfort band' },
  { ruleId: 'R-ENV-RH-01', metric: 'RELATIVE_HUMIDITY', op: 'above', value: 70, level: 'MODERATE', name: 'demo comfort band' },
  { ruleId: 'R-ENV-RH-01', metric: 'RELATIVE_HUMIDITY', op: 'below', value: 25, level: 'MODERATE', name: 'demo comfort band' },
  { ruleId: 'R-ENV-RAD-01', metric: 'RADIATION_DOSE_RATE', op: 'above', value: 100, level: 'HIGH', name: 'demo particle event level' },
  { ruleId: 'R-RAD-02', metric: 'RADIATION_DOSE', op: 'above', value: 50, level: 'MODERATE', name: 'demo mission dose watch level' },
]

export interface MetricRuleConfig {
  kind: 'continuous' | 'event'
  /** Context aware baseline (sleep / rest / work / exercise). */
  bucketed: boolean
  /** Floor for the robust SD so a very stable signal does not make tiny changes look huge. */
  minScale: number
  acute: boolean
  drift: boolean
  /** Minutes without a valid value before the metric becomes NO_DATA. */
  staleMin: number
  /** Expected cadence in minutes (continuous metrics), used to mark gaps. */
  cadenceMin: number
  acuteRule: string
  driftRule: string
  /** Event metrics: unit word for persistence labels. */
  eventUnit?: [string, string]
  physicalMin?: number
  physicalMax?: number
  /** Highest level this metric can reach on its own (self report is capped at MODERATE). */
  maxLevel?: RiskLevel
}

const C = (o: Partial<MetricRuleConfig> & Pick<MetricRuleConfig, 'acuteRule' | 'minScale'>): MetricRuleConfig => ({
  kind: 'continuous',
  bucketed: true,
  acute: true,
  drift: true,
  staleMin: 10,
  cadenceMin: 1,
  driftRule: o.acuteRule,
  ...o,
})

function EXAM_RULE(ruleId: string): MetricRuleConfig {
  return { kind: 'event', bucketed: false, minScale: 1, acute: false, drift: false, staleMin: 0, cadenceMin: 0, acuteRule: ruleId, driftRule: ruleId }
}

export const METRIC_RULES: Record<MetricCode, MetricRuleConfig> = {
  HEART_RATE: C({ acuteRule: 'R-HR-01', driftRule: 'R-HR-02', minScale: 3.5, physicalMin: 25, physicalMax: 220 }),
  HRV_RMSSD: C({ acuteRule: 'R-HRV-01', acute: false, minScale: 4, physicalMin: 3 }),
  SPO2: C({ acuteRule: 'R-SPO2-01', minScale: 0.7, physicalMin: 60, physicalMax: 100 }),
  RESPIRATORY_RATE: C({ acuteRule: 'R-RR-01', minScale: 1, physicalMin: 4 }),
  SYSTOLIC_BP: C({ acuteRule: 'R-BP-01', minScale: 4, staleMin: 20, cadenceMin: 5 }),
  DIASTOLIC_BP: C({ acuteRule: 'R-BP-01', minScale: 3, staleMin: 20, cadenceMin: 5 }),
  SKIN_TEMPERATURE: C({ acuteRule: 'R-TEMP-01', minScale: 0.25 }),
  ACTIVITY_LEVEL: C({ acuteRule: 'R-ACT-01', acute: false, minScale: 6, physicalMin: 0, physicalMax: 100 }),
  HYDRATION: C({ acuteRule: 'R-HYD-01', acute: false, bucketed: false, minScale: 4, staleMin: 90, cadenceMin: 30, physicalMin: 0, physicalMax: 100 }),
  SLEEP_DURATION: { kind: 'event', bucketed: false, minScale: 0.35, acute: false, drift: false, staleMin: 36 * 60, cadenceMin: 0, acuteRule: 'R-SLEEP-01', driftRule: 'R-SLEEP-01', eventUnit: ['night', 'nights'], physicalMin: 0 },
  SLEEP_EFFICIENCY: { kind: 'event', bucketed: false, minScale: 2.5, acute: false, drift: false, staleMin: 36 * 60, cadenceMin: 0, acuteRule: 'R-SLEEP-02', driftRule: 'R-SLEEP-02', eventUnit: ['night', 'nights'], physicalMin: 0, physicalMax: 100 },
  EXERCISE_LOAD: { kind: 'event', bucketed: false, minScale: 3.5, acute: false, drift: false, staleMin: 32 * 60, cadenceMin: 0, acuteRule: 'R-EX-01', driftRule: 'R-EX-01', eventUnit: ['session', 'sessions'], physicalMin: 0 },
  REACTION_TIME: { kind: 'event', bucketed: false, minScale: 12, acute: false, drift: false, staleMin: 18 * 60, cadenceMin: 0, acuteRule: 'R-RT-01', driftRule: 'R-RT-01', eventUnit: ['test', 'tests'], physicalMin: 100 },
  // v2 self reported check-in metrics (1..5 scale, one answer per sim day), compared with the
  // person's own recent answers. Integer answers make the MAD often 0, so the scale floor (0.75)
  // sets the band: median +/- 1.5. One answer 2 points away is outside the band; 2 check-ins in a
  // row outside the band (or 1 answer 3 points away) is MODERATE. Self report alone is capped at
  // MODERATE (maxLevel): it corroborates objective signals, it never escalates on its own.
  MOOD: { kind: 'event', bucketed: false, minScale: 0.75, acute: false, drift: false, staleMin: 50 * 60, cadenceMin: 0, acuteRule: 'R-PSY-01', driftRule: 'R-PSY-01', eventUnit: ['check-in', 'check-ins'], physicalMin: 1, physicalMax: 5, maxLevel: 'MODERATE' },
  PERCEIVED_FATIGUE: { kind: 'event', bucketed: false, minScale: 0.75, acute: false, drift: false, staleMin: 50 * 60, cadenceMin: 0, acuteRule: 'R-PSY-02', driftRule: 'R-PSY-02', eventUnit: ['check-in', 'check-ins'], physicalMin: 1, physicalMax: 5, maxLevel: 'MODERATE' },
  STRESS: { kind: 'event', bucketed: false, minScale: 0.75, acute: false, drift: false, staleMin: 50 * 60, cadenceMin: 0, acuteRule: 'R-PSY-03', driftRule: 'R-PSY-03', eventUnit: ['check-in', 'check-ins'], physicalMin: 1, physicalMax: 5, maxLevel: 'MODERATE' },
  // Cabin metrics: fixed demo thresholds only (a module has no "personal" normal to drift from).
  CO2: C({ acuteRule: 'R-ENV-CO2-01', acute: false, drift: false, bucketed: false, minScale: 150 }),
  CABIN_TEMPERATURE: C({ acuteRule: 'R-ENV-TEMP-01', acute: false, drift: false, bucketed: false, minScale: 0.4 }),
  RELATIVE_HUMIDITY: C({ acuteRule: 'R-ENV-RH-01', acute: false, drift: false, bucketed: false, minScale: 3 }),
  RADIATION_DOSE_RATE: C({ acuteRule: 'R-ENV-RAD-01', acute: false, drift: false, bucketed: false, minScale: 3 }),
  RADIATION_DOSE: C({ acuteRule: 'R-RAD-02', acute: false, drift: false, bucketed: false, minScale: 1, staleMin: 45, cadenceMin: 15 }),
  // v5 periodic exam measures. They are NOT streamed through the trackers (not in ASTRONAUT_METRICS):
  // src/engine/exams assesses them by change from the pre-flight baseline (see EXAMS below).
  // These entries only complete the record.
  RETINAL_THICKNESS: EXAM_RULE('R-SANS-01'),
  CHOROIDAL_FOLDS: EXAM_RULE('R-SANS-01'),
  OPTIC_NERVE_SHEATH_DIAMETER: EXAM_RULE('R-SANS-01'),
  VISUAL_ACUITY: EXAM_RULE('R-SANS-01'),
  HEARING_THRESHOLD_HIGH: EXAM_RULE('R-HEAR-01'),
  HEARING_THRESHOLD_LOW: EXAM_RULE('R-HEAR-01'),
  NOISE_EXPOSURE: EXAM_RULE('R-NOISE-01'),
  NOISE_DOSE: EXAM_RULE('R-NOISE-01'),
}

/** Metrics evaluated per astronaut (in display order). */
export const ASTRONAUT_METRICS: MetricCode[] = [
  'HEART_RATE',
  'HRV_RMSSD',
  'SPO2',
  'RESPIRATORY_RATE',
  'SYSTOLIC_BP',
  'DIASTOLIC_BP',
  'SKIN_TEMPERATURE',
  'ACTIVITY_LEVEL',
  'SLEEP_DURATION',
  'SLEEP_EFFICIENCY',
  'EXERCISE_LOAD',
  'REACTION_TIME',
  'HYDRATION',
  'RADIATION_DOSE',
  'MOOD',
  'PERCEIVED_FATIGUE',
  'STRESS',
]

/** Check-in metrics (self report, data_origin of the check-in). */
export const SELF_REPORT_METRICS: MetricCode[] = ['MOOD', 'PERCEIVED_FATIGUE', 'STRESS']

/** Metrics evaluated for the cabin ("CABIN" subject). */
export const CABIN_METRICS: MetricCode[] = ['CO2', 'CABIN_TEMPERATURE', 'RELATIVE_HUMIDITY', 'RADIATION_DOSE_RATE']

/** Metrics that get a forecast. */
export const FORECAST_METRICS: MetricCode[] = ['HEART_RATE', 'HRV_RMSSD', 'SPO2', 'SLEEP_DURATION', 'EXERCISE_LOAD']
export const CABIN_FORECAST_METRICS: MetricCode[] = ['CO2']

// ---------------------------------------------------------------------------
// v2: Earth communication, escalation, check-ins, mission plan, timeline
// All values below are DEMO CONFIGURATION, NOT OFFICIAL LIMITS or procedures.
// ---------------------------------------------------------------------------

export const COMMS = {
  defaultProfile: 'ISS' as CommProfileId,
  /** Simulated flight surgeon review time on Earth before a reply is sent (sim minutes, seeded per message). */
  reviewMinMin: 4,
  reviewMaxMin: 8,
  /** Kinds of delivered downlinks that get a simulated flight surgeon reply. */
  replyTo: ['CONSULT_REQUEST', 'HEALTH_PACKET'] as const,
  /** Re-check interval suggested in the simulated reply, by alert or recommendation level (sim minutes). */
  recheckMin: { LOW: 120, MODERATE: 60, HIGH: 30, CRITICAL: 10 } satisfies Record<RiskLevel, number>,
  /** Alerts at or above this level downlink a HEALTH_PACKET automatically (once per alert). */
  autoPacketLevel: 'HIGH' as RiskLevel,
  maxMessages: 120,
  /** Profiles where the crew must act before Earth can answer (onboard first step recommendations). */
  deepSpaceProfiles: ['MARS_NEAR', 'MARS_FAR'] as CommProfileId[],
} as const

/**
 * Escalation of unacknowledged alerts: [minutes to level 1, minutes to level 2] since the alert
 * was raised. Stops as soon as the alert is acknowledged or resolved. Demo configuration.
 */
export const ESCALATION: Partial<Record<RiskLevel, number[]>> = {
  CRITICAL: [5, 15],
  HIGH: [30, 90],
}

export const CHECKIN = {
  /** Simulated crew answer the daily check-in at about this time (minutes after 00:00 UTC, after wake). */
  minuteOfDay: 7 * 60,
  /** Personal offset spread around that time (+/- minutes, seeded per astronaut). */
  jitterMin: 20,
  /** Check-ins are generated for this many days before the scenario start (baselines need 5). */
  historyDays: 14,
  maxCheckIns: 4 * 30,
  /** A check-in counts as "today" for symptom factors for this many hours. */
  symptomWindowHours: 24,
} as const

/** Long-term mission plan for the mission view. Demo configuration, not official limits. */
export const MISSION_PLAN: MissionPlan = {
  plannedDurationDays: 180,
  radiationBudgetMgy: 100,
  // The simulated schedule has one 60 min exercise block per day (CEVIS, ARED or T2 rotating).
  exercisePlanMinutesPerDay: 60,
  sleepTargetHours: 8,
  note: 'Demo configuration, not official limits.',
}

/** Long-term synthesis of older mission days (simulated, seeded). */
export const MISSION_DAYS = {
  /** Mean absorbed dose per day (mGy), ISS-like order of magnitude; scaled by the personal shield factor. */
  doseMgyPerDay: 0.42,
  /** Share of days with a higher dose (e.g. more South Atlantic Anomaly passes or a small particle event). */
  highDoseDayShare: 0.05,
  missedSessionShare: 0.06,
  /** The current day summary is refreshed at most this often (sim minutes). */
  refreshEveryMin: 15,
} as const

export const TIMELINE = {
  /** One status frame every this many sim minutes. */
  frameEveryMin: 15,
  /** Frames computed during startup pre-generation (sim hours before the scenario start). */
  pregenHours: 24,
} as const

/** compareIntervention defaults (hypothetical projections, not clinical efficacy). */
export const COMPARE = {
  defaultMetric: {
    SLEEP_EXTENSION: 'HRV_RMSSD',
    REST_PROTOCOL: 'HEART_RATE',
    MEDICAL_CONSULT: 'HEART_RATE',
    CABIN_VENTILATION: 'CO2',
    EXERCISE_ADJUSTMENT: 'EXERCISE_LOAD',
    HYDRATION: 'HYDRATION',
    SENSOR_CHECK: null,
  } satisfies Record<InterventionKind, MetricCode | null>,
  /** Default horizon (hours) per metric; an active acute pattern uses acuteHorizonHours. */
  defaultHorizonHours: { HRV_RMSSD: 48, HEART_RATE: 24, CO2: 8, EXERCISE_LOAD: 120, HYDRATION: 12, SPO2: 24, RESPIRATORY_RATE: 24 } as Partial<Record<MetricCode, number>>,
  acuteHorizonHours: 2,
  maxHorizonHours: 168,
  disclaimer: 'Simulation for discussion only. Not evidence of clinical efficacy.',
} as const

/**
 * v4: forecast horizons the user can pick. DEMO CONFIGURATION, NOT AN OFFICIAL LIMIT.
 * The history rule follows PROJECT_MASTER 9.6 ("do not extrapolate long periods from short
 * series"): a horizon is projected only when the history goes back at least
 * horizon x minHistoryRatio hours. Otherwise the UI shows "Not enough history for this horizon".
 */
export const FORECAST_HORIZONS = {
  /** 24 h, 36 h, 72 h, 7 days, 15 days. */
  options: [24, 36, 72, 168, 360] as readonly ForecastHorizonHours[],
  defaultHours: 24 as ForecastHorizonHours,
  /** Demo rule: never project more than twice as far ahead as the history goes back. */
  minHistoryRatio: 0.5,
  /** Horizons beyond this many hours get an extra "rough trend only" note. */
  longHorizonHours: 72,
  /** Points kept per projection for charts (computed at full resolution, then thinned). */
  maxPoints: 72,
} as const

// ---------------------------------------------------------------------------
// v4: mission profiles (src/engine/missions). Reference values with citations live in
// src/engine/missions/profiles.ts; the numbers below are DEMO CONFIGURATION, NOT OFFICIAL
// LIMITS, used only to shape the simulation and the messages.
// ---------------------------------------------------------------------------

export const MISSION_PROFILE_SIM = {
  /**
   * Launch profile: dosimeters show an order of magnitude ground background level (µGy/h).
   * Demo configuration, not a reference value: the ascent dose itself is negligible.
   */
  launchBackgroundUGyPerHour: 0.1,
  /** Deep space dose rate: slow wobble around the reference mean (fraction, simulated GCR variation). */
  deepSpaceSlowWobble: 0.04,
  deepSpaceSlowPeriodHours: 27 * 24,
  /** Deep space dose rate: short term noise (fraction of the mean, per noise bin). */
  deepSpaceNoise: 0.03,
  deepSpaceNoiseBinMin: 5,
} as const

export const SPACE_WEATHER = {
  /**
   * A DONKI event counts as "recent" when it started at most this many hours before the data
   * was retrieved. Demo configuration, not an operational flight rule.
   */
  recentHours: 72,
  /** Flare class letters that raise the alert (NOAA SWPC classes: X means peak flux of 1e-4 W/m2 or more). */
  strongFlareClasses: ['X'] as readonly string[],
} as const

/** Autonomy messaging by one way light time (seconds). Demo configuration. */
export const AUTONOMY = {
  /** Below this one way delay, ground support is near real time. */
  nearRealTimeMaxSec: 1,
  /** At or above this one way delay, the crew acts first and the ground reviews later. */
  crewFirstMinSec: 60,
} as const

// ---------------------------------------------------------------------------
// v5: statistical gap fill (CUSUM) and the experimental machine learning layer.
// DEMO CONFIGURATION, NOT OFFICIAL LIMITS. Values are tuned on simulated data only
// (npm run evaluate), never on real astronaut data, and none is a clinical threshold.
// ---------------------------------------------------------------------------

export const CUSUM_METHOD = 'Tabular CUSUM on hourly mean robust z v1'

/**
 * Tabular CUSUM (PROJECT_MASTER 9.3, "small accumulated changes"). Per continuous metric with
 * drift detection, the per sample robust z (vs the personal baseline of the current context) is
 * averaged per hour, then:
 *   S_up   = min(cap, max(0, S_up + m - k))
 *   S_down = min(cap, max(0, S_down - m - k))
 * A side (in the metric's bad direction) at or above h, accumulating for at least minHours,
 * raises a Watch (MODERATE) flag on the metric's drift rule. CUSUM never escalates above
 * MODERATE on its own. Demo configuration, not an official limit.
 */
export const CUSUM = {
  /** Aggregation bin (sim minutes). */
  binMin: 60,
  /** Allowance (slack) in z units per bin: hourly means below k never accumulate. */
  k: 0.5,
  /** Decision interval (accumulated z units). */
  h: 8,
  /** The accumulation must have lasted this long before the flag shows (sim hours). */
  minHours: 12,
  /** Ceiling of S, so the flag clears in a bounded time after the drift ends. */
  cap: 16,
  /** Per sample z clamp before averaging (one spike cannot fake a drift). */
  zClamp: 4,
} as const

export const MULTIVARIATE_MODEL_VERSION = 'ahi-iforest-ts v1 (experimental, PCA whitened)'

/**
 * Multivariate unusual pattern detector (Isolation Forest, src/engine/ml). Experimental,
 * machine learning. Trained per astronaut on their own baseline window of standardized
 * metrics (robust z vs the personal baseline), decorrelated with PCA whitening fitted on the
 * same window. It never sets a status by itself: it adds an
 * "Unusual combination" flag only when the score stays high AND persistence (EWMA drift)
 * agrees on at least minAgreeing signals. Demo configuration, not an official limit.
 */
export const MULTIVARIATE = {
  /** Standardized features (robust z per metric). */
  features: ['HEART_RATE', 'HRV_RMSSD', 'SPO2', 'RESPIRATORY_RATE', 'SYSTOLIC_BP', 'DIASTOLIC_BP', 'SKIN_TEMPERATURE'] as MetricCode[],
  trees: 100,
  /** Subsample per tree (psi in Liu, Ting and Zhou 2008). */
  sampleSize: 256,
  /** Training window: one vector per 5 sim minutes over 5 days (same span as the baseline). */
  windowSize: 5 * 288,
  /** No model below this many training vectors (1 sim day). */
  minTrainingVectors: 288,
  /** Retrain only when a feature baseline changed AND at least this many sim hours passed. */
  retrainMinHours: 6,
  /** Vectors with any |z| at or above this are not used for training (same as BASELINE.gateZ). */
  trainGateZ: 3.5,
  /** Vectors with any |drift z| at or above this are not used for training (same as BASELINE.gateDrift). */
  trainGateDrift: 1.0,
  /** Minimum variance per principal axis in the PCA whitening (z units squared). */
  whiteningFloor: 0.05,
  /** Personal threshold = max(scoreFloor, this quantile of the training scores). */
  scoreFloor: 0.6,
  calibrationQuantile: 0.995,
  /** Training vectors scored for the calibration (keeps training cheap). */
  calibrationSample: 256,
  /** The score must stay above the threshold this long (sim minutes) before the flag shows. */
  persistMin: 30,
  /** A contributing signal "agrees" when its EWMA drift has the same sign and at least this size. */
  agreeDriftZ: 0.5,
  /** Agreeing signals needed (an unusual COMBINATION involves at least two). */
  minAgreeing: 2,
  /** Signals listed in the explanation. */
  topContributors: 3,
  seed: 20261115,
} as const

// ---------------------------------------------------------------------------
// v5: periodic exams (src/engine/exams). Eyes (SANS monitoring) and ears (hearing, noise).
//
// Status always comes from the change versus the person's own pre-flight baseline (same eye or
// ear). The few fixed numbers below are either a PUBLISHED value, cited next to it, or
// DEMO CONFIGURATION, NOT AN OFFICIAL LIMIT. None of them is a diagnosis or a treatment trigger.
//
// Sources (retrieved 2026-11-15):
// [S1] NASA OCHMO-MTB-001, "Spaceflight Associated Neuro-ocular Syndrome (SANS)", NASA-STD-3001
//      Medical Technical Brief, 02/21/2024. https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf
//      In-flight OCT, fundoscopy, ocular ultrasound, visual acuity and Amsler grid; "Eye Weeks" at
//      FD 30, FD 90 and R-30 on 6 month flights; pre-flight exam 18 to 21 months before flight
//      (OCT, acuity...) and 2-D ultrasound 6 to 9 months before; a change in peripapillary total
//      retinal thickness of +/-19.4 µm is the range of normal measurement variability (Laurie et al.).
// [S2] NASA HSRB, "Risk of in-mission and long-term Hearing Loss and Performance Decrements", risk
//      record Rev B. https://www.nasa.gov/wp-content/uploads/2025/11/hsrb-hearing-loss-risk-record-rev-b-1-web.pdf
//      Monitoring = acoustic monitoring, pre/post-flight audiometry and On-Orbit Hearing Assessments
//      (OOHA); shift metric: > 10 dB averaged over 2, 3 and 4 kHz; ISS flight rule 72 dBA LEQ 16 h
//      (crew worn dosimetry); sudden losses of 30 dB or more could affect mission operations.
// [S3] NASA OCHMO-TB-035, "Acoustics", NASA-STD-3001 Technical Brief, 10/06/2023.
//      https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-035-acoustics.pdf
//      [V2 6115] 24-hour noise exposure: noise dose D <= 100 (equivalent to 8 h at 85 dBA TWA);
//      [V2 6088] individual noise exposure monitoring.
// [S4] Limardo, Allen, Danielson, "Status: Crewmember Noise Exposures on the ISS", ICES 2015,
//      NTRS 20150011048. https://ntrs.nasa.gov/citations/20150011048
//      Crew worn acoustic dosimetry for 24 hour periods about every 60 days.
// ---------------------------------------------------------------------------

export interface ExamSlot {
  /** Day relative to launch (negative = before launch). */
  day: number
  label: string
  kinds: readonly ExamKind[]
}

export const EXAMS = {
  /** Flight days count from MISSION.startedAt; sessions are placed at this hour (UTC) of their day. */
  sessionHourUtc: 13,
  eyes: {
    /** Pre-flight baseline sessions, days relative to launch [S1]. */
    preflight: [
      { day: -540, label: 'Pre-flight eye exam (about 18 months before launch)', kinds: ['OCT', 'VISUAL_ACUITY'] },
      { day: -210, label: 'Pre-flight eye ultrasound (about 7 months before launch)', kinds: ['OCULAR_ULTRASOUND'] },
    ] as readonly ExamSlot[],
    /** In-flight "Eye Weeks" on flight days 30 and 90, then R-30 (30 days before return) [S1]. */
    inflightDays: [30, 90] as readonly number[],
    returnMinusDays: 30,
    inflightKinds: ['OCT', 'OCULAR_ULTRASOUND', 'VISUAL_ACUITY'] as readonly ExamKind[],
    /** [S1] published: +/-19.4 µm = normal measurement variability of peripapillary TRT on OCT. */
    retinalThicknessChangeUm: 19.4,
    /** DEMO CONFIGURATION, NOT AN OFFICIAL LIMIT: ONSD widening versus baseline that is flagged (mm). */
    onsdChangeMm: 0.5,
    /** DEMO CONFIGURATION, NOT AN OFFICIAL LIMIT: acuity loss versus baseline that is flagged (logMAR, about 1 chart line). */
    acuityChangeLogMar: 0.1,
    /** DEMO CONFIGURATION: flagged measures in one session at which the session reads Warning instead of Watch. */
    signsForHigh: 2,
  },
  ears: {
    /**
     * DEMO CONFIGURATION: pre-flight audiometry day (relative to launch). [S2] confirms pre-flight
     * audiometry but this exact day is not published in the sources above.
     */
    preflight: [{ day: -60, label: 'Pre-flight audiometry', kinds: ['AUDIOMETRY'] }] as readonly ExamSlot[],
    /** DEMO CONFIGURATION: OOHA cadence (first flight day and interval). [S2] confirms OOHA, not this cadence. */
    firstFlightDay: 15,
    everyDays: 30,
    /** [S2] published HSRB shift metric: mean threshold change > 10 dB at 2, 3 and 4 kHz. */
    shiftDb: 10,
    /** [S2] "sudden sensorineural losses (30 dB or greater) could affect mission ops": shown as Warning. */
    largeShiftDb: 30,
    /** Audiometer test frequencies (Hz). High pitch mean = 2, 3, 4 kHz [S2]; low pitch mean = 0.25, 0.5, 1 kHz (demo grouping). */
    highFreqsHz: [2000, 3000, 4000] as readonly number[],
    lowFreqsHz: [250, 500, 1000] as readonly number[],
  },
  noise: {
    /** [S2] ISS flight rule: crew worn work period exposure, 72 dBA LEQ over 16 hours. */
    workLeqDba: 72,
    /** [S3] [V2 6115] 24 hour noise dose limit (D <= 100). */
    doseLimitPct: 100,
    /** [S3] criterion: 85 dBA over 8 hours equals a dose of 100. */
    criterionDba: 85,
    criterionHours: 8,
    /**
     * Exchange rate (dB per doubling of time) used to compute the dose. 3 dB is the NIOSH REL
     * convention (DHHS NIOSH publication 98-126); [S3] does not state it. Demo assumption.
     */
    exchangeDb: 3,
    /** Work and sleep period lengths (hours) used in the daily dose. */
    workHours: 16,
    sleepHours: 8,
    /**
     * DEMO CONFIGURATION: the simulator produces one crew worn reading per day so the trend is
     * visible. On the ISS crew worn dosimetry runs for 24 hours about every 60 days [S4].
     */
    keepDays: 14,
  },
} as const
