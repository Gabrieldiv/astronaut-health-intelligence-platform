import { Activity, ClipboardCheck, Cpu, Droplet, Dumbbell, Fan, Moon, Sofa, Stethoscope, Wind, type LucideIcon } from 'lucide-react'
import type { InterventionKind, MetricCode, Recommendation } from '../../types/domain'
import { METRIC_CATALOG } from '../../engine/catalog'
import { REGION_ICON } from '../stage/CenterStage'

/** Signal icon of a metric: the icon of the body system it belongs to (cabin air for the environment). */
export function metricIcon(metric: MetricCode | null): LucideIcon {
  if (!metric) return Activity
  const region = METRIC_CATALOG[metric].region
  return region === 'environment' ? Wind : REGION_ICON[region]
}

const ACTION_ICON: Record<InterventionKind, LucideIcon> = {
  REST_PROTOCOL: Sofa,
  SLEEP_EXTENSION: Moon,
  HYDRATION: Droplet,
  EXERCISE_ADJUSTMENT: Dumbbell,
  SENSOR_CHECK: Cpu,
  CABIN_VENTILATION: Fan,
  MEDICAL_CONSULT: Stethoscope,
}

export function actionIcon(rec: Pick<Recommendation, 'interventionKind'>): LucideIcon {
  return rec.interventionKind ? ACTION_ICON[rec.interventionKind] : ClipboardCheck
}

export type ActionTiming = 'NOW' | 'HOUR' | 'TODAY'

/**
 * Time hint of an action card, from its urgency (UI convention for the demo, not a clinical
 * rule): critical now, high within the hour, everything else today.
 */
export function actionTiming(priority: Recommendation['priority']): ActionTiming {
  return priority === 'CRITICAL' ? 'NOW' : priority === 'HIGH' ? 'HOUR' : 'TODAY'
}
