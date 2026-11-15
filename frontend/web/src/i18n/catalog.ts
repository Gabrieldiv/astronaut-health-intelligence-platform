import type { BodyRegionId, CommProfileId, MetricCode } from '../types/domain'
import { t, tOr } from '.'

/**
 * Translated catalog labels for the UI. The engine catalog (src/engine/catalog.ts) stays English:
 * engine generated sentences embed its labels, and mixing languages inside one sentence reads worse
 * than an English sentence. UI chrome reads labels through these helpers instead.
 */
export const metricLabel = (code: MetricCode) => t(`metric.${code}.label`)
export const metricShort = (code: MetricCode) => t(`metric.${code}.short`)
export const metricPlain = (code: MetricCode) => t(`metric.${code}.plain`)

export const regionLabel = (id: BodyRegionId) => t(`region.${id}.label`)
export const regionSystem = (id: BodyRegionId) => t(`region.${id}.system`)
export const regionDescription = (id: BodyRegionId) => t(`region.${id}.description`)

/** Scenario name and description; scenarios outside the catalog (mission profiles) keep their own text. */
export const scenarioName = (s: { id: string; name: string }) => tOr(`scenario.${s.id}.name`, s.name)
export const scenarioDescription = (s: { id: string; description: string }) => tOr(`scenario.${s.id}.description`, s.description)

export const commProfileLabel = (c: { id: CommProfileId; label: string }) => tOr(`commProfile.${c.id}.label`, c.label)
export const commProfileDescription = (c: { id: CommProfileId; description: string }) => tOr(`commProfile.${c.id}.description`, c.description)

/** Crew role in the current language; unknown roles (custom mission profiles) pass through unchanged. */
export const roleLabel = (role: string) => tOr(`role.${role}`, role)
