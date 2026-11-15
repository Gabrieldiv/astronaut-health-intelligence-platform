import type { Astronaut, CommProfile, BodyRegionId, MetricCode, MetricDefinition, Mission, ScenarioDefinition } from '../types/domain'

/**
 * Metric catalog. Units follow PROJECT_MASTER.md 6.4.
 * displayRange is a chart range only, never a clinical limit.
 */
export const METRIC_CATALOG: Record<MetricCode, MetricDefinition> = {
  HEART_RATE: { code: 'HEART_RATE', label: 'Heart rate', shortLabel: 'HR', unit: 'bpm', region: 'heart', decimals: 0, badDirection: 'both', plainLanguage: 'How fast your heart is beating.', displayRange: [40, 180] },
  HRV_RMSSD: { code: 'HRV_RMSSD', label: 'Heart rate variability', shortLabel: 'HRV', unit: 'ms', region: 'heart', decimals: 0, badDirection: 'down', plainLanguage: 'Beat-to-beat variation. Lower than your normal often means stress or poor recovery.', displayRange: [10, 120] },
  SPO2: { code: 'SPO2', label: 'Blood oxygen', shortLabel: 'SpO₂', unit: '%', region: 'lungs', decimals: 0, badDirection: 'down', plainLanguage: 'How much oxygen your blood is carrying.', displayRange: [85, 100] },
  RESPIRATORY_RATE: { code: 'RESPIRATORY_RATE', label: 'Breathing rate', shortLabel: 'RR', unit: 'br/min', region: 'lungs', decimals: 0, badDirection: 'both', plainLanguage: 'Breaths per minute.', displayRange: [8, 35] },
  SYSTOLIC_BP: { code: 'SYSTOLIC_BP', label: 'Blood pressure (systolic)', shortLabel: 'SYS', unit: 'mmHg', region: 'heart', decimals: 0, badDirection: 'both', plainLanguage: 'Pressure in your arteries when the heart beats.', displayRange: [80, 180] },
  DIASTOLIC_BP: { code: 'DIASTOLIC_BP', label: 'Blood pressure (diastolic)', shortLabel: 'DIA', unit: 'mmHg', region: 'heart', decimals: 0, badDirection: 'both', plainLanguage: 'Pressure in your arteries between beats.', displayRange: [50, 120] },
  SKIN_TEMPERATURE: { code: 'SKIN_TEMPERATURE', label: 'Skin temperature', shortLabel: 'Temp', unit: '°C', region: 'skin', decimals: 1, badDirection: 'both', plainLanguage: 'Surface body temperature from the smart shirt.', displayRange: [31, 39] },
  ACTIVITY_LEVEL: { code: 'ACTIVITY_LEVEL', label: 'Activity', shortLabel: 'ACT', unit: 'score', region: 'muscles', decimals: 0, badDirection: 'down', plainLanguage: 'How much you are moving (wrist sensor score).', displayRange: [0, 100] },
  SLEEP_DURATION: { code: 'SLEEP_DURATION', label: 'Sleep duration', shortLabel: 'Sleep', unit: 'h', region: 'brain', decimals: 1, badDirection: 'down', plainLanguage: 'Hours slept in the last sleep period.', displayRange: [0, 10] },
  SLEEP_EFFICIENCY: { code: 'SLEEP_EFFICIENCY', label: 'Sleep efficiency', shortLabel: 'Sleep eff.', unit: '%', region: 'brain', decimals: 0, badDirection: 'down', plainLanguage: 'Share of time in bed actually asleep.', displayRange: [50, 100] },
  EXERCISE_LOAD: { code: 'EXERCISE_LOAD', label: 'Exercise performance', shortLabel: 'Load', unit: '% of baseline', region: 'muscles', decimals: 0, badDirection: 'down', plainLanguage: 'Workout output compared to your own usual sessions.', displayRange: [40, 120] },
  REACTION_TIME: { code: 'REACTION_TIME', label: 'Reaction time', shortLabel: 'RT', unit: 'ms', region: 'brain', decimals: 0, badDirection: 'up', plainLanguage: 'Speed on the short cognitive test. Higher means slower.', displayRange: [200, 500] },
  HYDRATION: { code: 'HYDRATION', label: 'Hydration index', shortLabel: 'H₂O', unit: 'score', region: 'kidneys', decimals: 0, badDirection: 'down', plainLanguage: 'Estimated hydration from fluid intake logs (simulated).', displayRange: [40, 100] },
  CO2: { code: 'CO2', label: 'Cabin CO₂', shortLabel: 'CO₂', unit: 'ppm', region: 'environment', decimals: 0, badDirection: 'up', plainLanguage: 'Carbon dioxide in the cabin air.', displayRange: [1500, 8000] },
  CABIN_TEMPERATURE: { code: 'CABIN_TEMPERATURE', label: 'Cabin temperature', shortLabel: 'Cabin', unit: '°C', region: 'environment', decimals: 1, badDirection: 'both', plainLanguage: 'Air temperature in the module.', displayRange: [17, 30] },
  RELATIVE_HUMIDITY: { code: 'RELATIVE_HUMIDITY', label: 'Humidity', shortLabel: 'RH', unit: '%', region: 'environment', decimals: 0, badDirection: 'both', plainLanguage: 'Relative humidity of the cabin air.', displayRange: [20, 80] },
  RADIATION_DOSE_RATE: { code: 'RADIATION_DOSE_RATE', label: 'Radiation dose rate', shortLabel: 'Rad', unit: 'µGy/h', region: 'environment', decimals: 1, badDirection: 'up', plainLanguage: 'Current radiation level measured by the dosimeter.', displayRange: [0, 60] },
  MOOD: { code: 'MOOD', label: 'Mood (self report)', shortLabel: 'Mood', unit: '1-5', region: 'brain', decimals: 0, badDirection: 'down', plainLanguage: 'How you said you feel today, from 1 (very low) to 5 (very good).', displayRange: [1, 5] },
  PERCEIVED_FATIGUE: { code: 'PERCEIVED_FATIGUE', label: 'Fatigue (self report)', shortLabel: 'Fatigue', unit: '1-5', region: 'brain', decimals: 0, badDirection: 'up', plainLanguage: 'How tired you said you feel, from 1 (rested) to 5 (exhausted).', displayRange: [1, 5] },
  STRESS: { code: 'STRESS', label: 'Stress (self report)', shortLabel: 'Stress', unit: '1-5', region: 'brain', decimals: 0, badDirection: 'up', plainLanguage: 'How stressed you said you feel, from 1 (calm) to 5 (very stressed).', displayRange: [1, 5] },
  RADIATION_DOSE: { code: 'RADIATION_DOSE', label: 'Accumulated dose', shortLabel: 'Dose', unit: 'mGy', region: 'bones', decimals: 2, badDirection: 'up', plainLanguage: 'Total radiation absorbed since mission start.', displayRange: [0, 100] },
  // v5 periodic exam measures (src/engine/exams). Status = change versus the pre-flight baseline.
  RETINAL_THICKNESS: { code: 'RETINAL_THICKNESS', label: 'Retinal thickness (OCT)', shortLabel: 'Retina', unit: 'µm', region: 'eyes', decimals: 0, badDirection: 'up', plainLanguage: 'Thickness of the retina around the optic nerve, from the eye scan (OCT). A thicker retina than before flight can be an early sign of optic disc swelling.', displayRange: [300, 480] },
  CHOROIDAL_FOLDS: { code: 'CHOROIDAL_FOLDS', label: 'Choroidal folds (OCT)', shortLabel: 'Folds', unit: 'present', decimals: 0, region: 'eyes', badDirection: 'up', plainLanguage: 'Small folds in the layers at the back of the eye, seen on the eye scan. New folds since before flight are a sign to review.', displayRange: [0, 1] },
  OPTIC_NERVE_SHEATH_DIAMETER: { code: 'OPTIC_NERVE_SHEATH_DIAMETER', label: 'Optic nerve sheath (ultrasound)', shortLabel: 'ONSD', unit: 'mm', region: 'eyes', decimals: 1, badDirection: 'up', plainLanguage: 'Width of the sheath around the optic nerve, from the eye ultrasound.', displayRange: [3.5, 7.5] },
  VISUAL_ACUITY: { code: 'VISUAL_ACUITY', label: 'Visual acuity', shortLabel: 'Acuity', unit: 'logMAR', region: 'eyes', decimals: 2, badDirection: 'up', plainLanguage: 'Sharpness of vision on the eye chart. Higher logMAR means blurrier (0.1 is about one chart line).', displayRange: [-0.3, 0.6] },
  HEARING_THRESHOLD_HIGH: { code: 'HEARING_THRESHOLD_HIGH', label: 'Hearing threshold, high pitch', shortLabel: 'High pitch', unit: 'dB HL', region: 'ears', decimals: 0, badDirection: 'up', plainLanguage: 'Quietest high pitched tones heard (mean of 2, 3 and 4 kHz). Higher means hearing got less sensitive.', displayRange: [-10, 60] },
  HEARING_THRESHOLD_LOW: { code: 'HEARING_THRESHOLD_LOW', label: 'Hearing threshold, low pitch', shortLabel: 'Low pitch', unit: 'dB HL', region: 'ears', decimals: 0, badDirection: 'up', plainLanguage: 'Quietest low pitched tones heard (mean of 0.25, 0.5 and 1 kHz). Higher means hearing got less sensitive.', displayRange: [-10, 60] },
  NOISE_EXPOSURE: { code: 'NOISE_EXPOSURE', label: 'Noise exposure (work period)', shortLabel: 'Noise', unit: 'dBA', region: 'ears', decimals: 1, badDirection: 'up', plainLanguage: 'Average sound level at your ears during the 16 hour work period, from the crew worn acoustic dosimeter.', displayRange: [50, 90] },
  NOISE_DOSE: { code: 'NOISE_DOSE', label: 'Daily noise dose', shortLabel: 'Noise dose', unit: '%', region: 'ears', decimals: 0, badDirection: 'up', plainLanguage: 'Share of the 24 hour noise exposure limit used that day (100% = the limit).', displayRange: [0, 120] },
}

export const VITAL_METRICS: MetricCode[] = ['HEART_RATE', 'HRV_RMSSD', 'SPO2', 'RESPIRATORY_RATE', 'SYSTOLIC_BP', 'SKIN_TEMPERATURE']
export const ENV_METRICS: MetricCode[] = ['CO2', 'CABIN_TEMPERATURE', 'RELATIVE_HUMIDITY', 'RADIATION_DOSE_RATE']

export const REGION_LABELS: Record<BodyRegionId, { label: string; system: string; description: string }> = {
  brain: { label: 'Brain', system: 'Neuro and sleep', description: 'Sleep, alertness and reaction time.' },
  heart: { label: 'Heart', system: 'Cardiovascular', description: 'Heart rate, variability and blood pressure.' },
  lungs: { label: 'Lungs', system: 'Respiratory', description: 'Breathing rate and blood oxygen.' },
  kidneys: { label: 'Kidneys', system: 'Renal and hydration', description: 'Hydration status from intake logs.' },
  muscles: { label: 'Muscles', system: 'Musculoskeletal', description: 'Activity and exercise performance vs your own baseline.' },
  bones: { label: 'Skeleton', system: 'Bone and radiation', description: 'Accumulated radiation dose and bone health context.' },
  skin: { label: 'Skin', system: 'Thermal', description: 'Skin temperature and thermal comfort.' },
  eyes: { label: 'Eyes', system: 'Vision (SANS)', description: 'Periodic eye exams: retina scan (OCT), eye ultrasound and visual acuity, compared with your pre-flight baseline.' },
  ears: { label: 'Ears', system: 'Hearing and noise', description: 'Periodic hearing tests and daily noise exposure. The ear itself is not modeled in the 3D body.' },
}

export const MISSION: Mission = {
  id: 'MISSION-001',
  name: 'AHI Demo Expedition',
  vehicle: 'ISS analog (simulated)',
  phase: 'IN_FLIGHT',
  startedAt: '2026-10-01T00:00:00Z',
  commDelaySec: 0,
}

export const CREW: Astronaut[] = [
  { id: 'AST-01', callsign: 'ORION', role: 'Commander', roleShort: 'CDR', age: 46, sex: 'M', missionDay: 44, color: '#7dd3fc' },
  { id: 'AST-02', callsign: 'LYRA', role: 'Flight Engineer', roleShort: 'FE-1', age: 38, sex: 'F', missionDay: 44, color: '#c4b5fd' },
  { id: 'AST-03', callsign: 'VEGA', role: 'Flight Engineer', roleShort: 'FE-2', age: 41, sex: 'F', missionDay: 44, color: '#f9a8d4' },
  { id: 'AST-04', callsign: 'ATLAS', role: 'Mission Specialist', roleShort: 'MS', age: 35, sex: 'M', missionDay: 44, color: '#86efac' },
]

export const SCENARIOS: ScenarioDefinition[] = [
  { id: 'NOMINAL', name: 'Nominal day', description: 'Stable baseline. All crew within their personal normal ranges.', targetAstronautId: null },
  { id: 'PROGRESSIVE_FATIGUE', name: 'Progressive fatigue', description: 'Sleep drops over several days, HRV falls and resting heart rate drifts up.', targetAstronautId: 'AST-02' },
  { id: 'ENVIRONMENTAL_CO2', name: 'Cabin CO₂ rise', description: 'CO₂ scrubber degradation raises cabin CO₂. Breathing rate and reaction time shift for the crew.', targetAstronautId: null },
  { id: 'PERFORMANCE_DECLINE', name: 'Exercise performance decline', description: 'Workout output falls session after session compared to personal baseline.', targetAstronautId: 'AST-04' },
  { id: 'SENSOR_FAILURE', name: 'Sensor failure', description: 'Bio-Monitor shirt stops sending data. Missing data is never treated as normal.', targetAstronautId: 'AST-03' },
  { id: 'ACUTE_CARDIO', name: 'Acute cardio event', description: 'Sudden heart rate rise with blood oxygen drop. Tests fast alerting.', targetAstronautId: 'AST-01' },
  { id: 'SANS_PROGRESSION', name: 'Eye changes (SANS like)', description: 'Simulated eye exams show a gradual change from the pre-flight baseline over the mission: thicker retina, wider optic nerve sheath, then new folds.', targetAstronautId: 'AST-01' },
]

/** Earth link profiles. Delays are approximate public figures for light time. */
export const COMM_PROFILES: CommProfile[] = [
  { id: 'ISS', label: 'ISS (low Earth orbit)', oneWayDelaySec: 0.5, description: 'Near real time link with Mission Control.' },
  { id: 'MOON', label: 'Moon', oneWayDelaySec: 1.3, description: 'About 1.3 s each way. Ground support stays practical.' },
  { id: 'MARS_NEAR', label: 'Mars (closest)', oneWayDelaySec: 4 * 60, description: 'About 4 min each way. Every question to Earth costs at least 8 min.' },
  { id: 'MARS_FAR', label: 'Mars (farthest)', oneWayDelaySec: 22 * 60, description: 'About 22 min each way. The crew must decide on board first.' },
]
