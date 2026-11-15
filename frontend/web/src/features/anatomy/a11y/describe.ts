/**
 * Plain language descriptions of the anatomy for assistive technology (screen reader
 * announcements, spoken summaries). Pure functions: reuse them anywhere a sentence about a body
 * region or structure is needed. They never diagnose: they name the structure, the region it
 * reports under and the region status, and say "no data" instead of guessing.
 */
import type { BodyRegionId, Status } from '../../../types/domain'
import { STATUS_META } from '../../../lib/status'
import { REGION_LABELS } from '../../../engine/catalog'
import type { AtlasStructure } from '../atlas/types'
import { CONTEXT_ONLY_TITLE, SYSTEM_INFO, regionOfStructure, sideLabel } from '../atlas/health'

/** "Status: Nominal" style phrase. Missing data is said as such, never as normal. */
export function statusPhrase(status: Status | null | undefined): string {
  if (!status || status === 'NO_DATA') return 'Status: no data'
  return `Status: ${STATUS_META[status].label}`
}

/** One sentence about a body region, e.g. "Heart region. Status: Nominal. 29 structures." */
export function describeRegion(region: BodyRegionId, status: Status | null | undefined, structureCount?: number): string {
  const parts = [`${REGION_LABELS[region].label} region`, statusPhrase(status)]
  if (structureCount) parts.push(`${structureCount} ${structureCount === 1 ? 'structure' : 'structures'}`)
  return `${parts.join('. ')}.`
}

/**
 * One sentence about a structure, e.g. "Left ventricle, left side. Cardiovascular system, heart
 * region. Status: Watch." Context only structures say so and carry no status.
 */
export function describeStructure(s: AtlasStructure, statuses: Partial<Record<BodyRegionId, Status>>): string {
  const side = sideLabel(s)
  const name = side && !s.name.toLowerCase().includes(side.split(' ')[0]!.toLowerCase()) ? `${s.name}, ${side.toLowerCase()}` : s.name
  const region = regionOfStructure(s)
  const system = SYSTEM_INFO[s.system].label
  if (!region) return `${name}. ${system}. ${CONTEXT_ONLY_TITLE}, not monitored.`
  return `${name}. ${system}, ${REGION_LABELS[region].label.toLowerCase()} region. ${statusPhrase(statuses[region])}.`
}

/** "3 of 7" position suffix for list style announcements. */
export function positionPhrase(index: number, count: number): string {
  return `${index + 1} of ${count}`
}
