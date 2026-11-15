/**
 * Plain language descriptions of the anatomy for assistive technology (screen reader
 * announcements, spoken summaries). Pure functions: reuse them anywhere a sentence about a body
 * region or structure is needed. They never diagnose: they name the structure, the region it
 * reports under and the region status, and say "no data" instead of guessing.
 */
import type { BodyRegionId, Status } from '../../../types/domain'
import { STATUS_META } from '../../../lib/status'
import type { AtlasStructure } from '../atlas/types'
import { SYSTEM_INFO, contextOnlyTitle, regionOfStructure, sideLabel } from '../atlas/health'
import { getLang, t, tp } from '../../../i18n'
import { regionLabel } from '../../../i18n/catalog'

// German nouns keep their capital letter inside a sentence.
const lower = (s: string) => (getLang() === 'de' ? s : s.toLowerCase())

/** "Status: Nominal" style phrase. Missing data is said as such, never as normal. */
export function statusPhrase(status: Status | null | undefined): string {
  if (!status || status === 'NO_DATA') return t('anatomy.describe.noData')
  return t('anatomy.describe.status', { status: STATUS_META[status].label })
}

/** One sentence about a body region, e.g. "Heart region. Status: Nominal. 29 structures." */
export function describeRegion(region: BodyRegionId, status: Status | null | undefined, structureCount?: number): string {
  const parts = [t('anatomy.describe.region', { region: regionLabel(region) }), statusPhrase(status)]
  if (structureCount) parts.push(tp('anatomy.describe.structures', structureCount))
  else if (region === 'ears') parts.push(t('anatomy.describe.earsNotModeled'))
  return `${parts.join('. ')}.`
}

/**
 * One sentence about a structure, e.g. "Left ventricle, left side. Cardiovascular system, heart
 * region. Status: Watch." Context only structures say so and carry no status.
 */
export function describeStructure(s: AtlasStructure, statuses: Partial<Record<BodyRegionId, Status>>): string {
  const side = sideLabel(s)
  // Atlas structure names are English ("Left ventricle"): check the English side word.
  const sideWord = s.side === 'L' ? 'left' : 'right'
  const name = side && !s.name.toLowerCase().includes(sideWord) ? `${s.name}, ${lower(side)}` : s.name
  const region = regionOfStructure(s)
  const system = SYSTEM_INFO[s.system].label
  if (!region) return t('anatomy.describe.contextOnly', { name, system, title: contextOnlyTitle() })
  return t('anatomy.describe.structure', { name, system, region: lower(regionLabel(region)), status: statusPhrase(statuses[region]) })
}

/** "3 of 7" position suffix for list style announcements. */
export function positionPhrase(index: number, count: number): string {
  return t('anatomy.describe.position', { i: index + 1, n: count })
}
