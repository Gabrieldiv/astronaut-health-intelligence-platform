import { COMM_PROFILES, METRIC_CATALOG, REGION_LABELS, SCENARIOS } from '../../../engine/catalog'
import type { BodyRegionId, CommProfileId, MetricCode, ScenarioId } from '../../../types/domain'

/**
 * Catalog labels (metrics, body regions, scenarios, Earth link profiles, crew roles), derived from
 * the engine catalog so the English text stays byte for byte identical to the source of truth.
 */
export type RoleName = 'Commander' | 'Flight Engineer' | 'Flight engineer' | 'Mission Specialist'
type CatalogKey =
  | `metric.${MetricCode}.${'label' | 'short' | 'plain'}`
  | `region.${BodyRegionId}.${'label' | 'system' | 'description'}`
  | `scenario.${ScenarioId}.${'name' | 'description'}`
  | `commProfile.${CommProfileId}.${'label' | 'description'}`
  | `role.${RoleName}`

const entries: [string, string][] = [
  ...Object.values(METRIC_CATALOG).flatMap((d): [string, string][] => [
    [`metric.${d.code}.label`, d.label],
    [`metric.${d.code}.short`, d.shortLabel],
    [`metric.${d.code}.plain`, d.plainLanguage],
  ]),
  ...(Object.keys(REGION_LABELS) as BodyRegionId[]).flatMap((id): [string, string][] => [
    [`region.${id}.label`, REGION_LABELS[id].label],
    [`region.${id}.system`, REGION_LABELS[id].system],
    [`region.${id}.description`, REGION_LABELS[id].description],
  ]),
  ...SCENARIOS.flatMap((s): [string, string][] => [
    [`scenario.${s.id}.name`, s.name],
    [`scenario.${s.id}.description`, s.description],
  ]),
  ...COMM_PROFILES.flatMap((c): [string, string][] => [
    [`commProfile.${c.id}.label`, c.label],
    [`commProfile.${c.id}.description`, c.description],
  ]),
  ['role.Commander', 'Commander'],
  ['role.Flight Engineer', 'Flight Engineer'],
  ['role.Flight engineer', 'Flight engineer'],
  ['role.Mission Specialist', 'Mission Specialist'],
]

const catalog = Object.fromEntries(entries) as Record<CatalogKey, string>
export default catalog
