import type { BodyRegionId, InterventionKind } from '../../types/domain'
import { t, translatedRecord } from '../../i18n'

export const INTERVENTION_LABEL: Record<InterventionKind, string> = translatedRecord(
  ['REST_PROTOCOL', 'SLEEP_EXTENSION', 'HYDRATION', 'EXERCISE_ADJUSTMENT', 'SENSOR_CHECK', 'CABIN_VENTILATION', 'MEDICAL_CONSULT'] as const,
  (k) => t(`timeline.intervention.${k}`),
)

/** Region a logged intervention relates to (for click to focus). */
export const INTERVENTION_REGION: Record<InterventionKind, BodyRegionId | 'environment' | null> = {
  REST_PROTOCOL: 'heart',
  SLEEP_EXTENSION: 'brain',
  HYDRATION: 'kidneys',
  EXERCISE_ADJUSTMENT: 'muscles',
  SENSOR_CHECK: null,
  CABIN_VENTILATION: 'environment',
  MEDICAL_CONSULT: null,
}
