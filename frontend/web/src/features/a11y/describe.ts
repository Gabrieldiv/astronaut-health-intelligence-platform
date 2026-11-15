import type { Alert, AppState, Astronaut, AstronautHealth, BodyRegionId, MetricCode, MetricDefinition, MetricState, Recommendation, Status } from '../../types/domain'
import { METRIC_CATALOG } from '../../engine/catalog'
import { RISK_ORDER, STATUS_META } from '../../lib/status'
import { getBcp47, getLang, t, tp, type MessageKey } from '../../i18n'
import { metricLabel, regionLabel, roleLabel } from '../../i18n/catalog'
import { alertTitle, engineText, recTitle } from '../../i18n/engineText'

/**
 * Spoken and announced text, built from the store with pure functions (unit tested).
 * Style: plain language first, short sentences, no diagnosis, no jargon first. Every text that
 * summarizes health says the data is simulated.
 * Sentences follow the selected language (src/i18n); engine generated parts (alert titles, risk
 * headlines, region summaries, recommendation titles) stay as the engine wrote them.
 */

/** Lower case for use inside a sentence (German nouns keep their capital). */
const lower = (s: string) => (getLang() === 'de' ? s : s.toLowerCase())

/** "Critical, act now." style status phrase. */
export function statusPhrase(s: Status): string {
  const m = STATUS_META[s]
  if (s === 'NO_DATA') return t('a11y.say.noDataPhrase')
  return t('a11y.say.statusPhrase', { label: m.label, crew: lower(m.crewLabel) })
}

const UNIT_WORDS: Record<string, MessageKey> = {
  bpm: 'a11y.say.unit.bpm',
  ms: 'a11y.say.unit.ms',
  '%': 'a11y.say.unit.pct',
  'br/min': 'a11y.say.unit.brmin',
  mmHg: 'a11y.say.unit.mmHg',
  '°C': 'a11y.say.unit.degC',
  h: 'a11y.say.unit.h',
  score: 'a11y.say.unit.score',
  '% of baseline': 'a11y.say.unit.pctBaseline',
  ppm: 'a11y.say.unit.ppm',
  'µGy/h': 'a11y.say.unit.uGyh',
  mGy: 'a11y.say.unit.mGy',
  '1-5': 'a11y.say.unit.scale5',
}

export const spokenUnit = (unit: string) => (UNIT_WORDS[unit] ? t(UNIT_WORDS[unit]) : unit)

/** Number as spoken: trailing zeros dropped; decimal comma where the language uses it. */
function spokenNumber(v: number, decimals: number): string {
  const n = Number(v.toFixed(decimals))
  if (getLang() === 'en') return String(n)
  return new Intl.NumberFormat(getBcp47(), { maximumFractionDigits: decimals, useGrouping: false }).format(n)
}

/** "Heart rate 92 beats per minute, above your usual range." or "Heart rate: no reading." */
export function spokenReading(def: MetricDefinition, ms: MetricState | undefined): string {
  const label = metricLabel(def.code)
  if (!ms || ms.status === 'NO_DATA' || ms.current == null) return t('a11y.say.noReading', { label })
  const value = spokenNumber(ms.current, def.decimals)
  let where = ''
  const b = ms.baseline
  if (b && b.status === 'READY') {
    if (ms.current > b.high) where = t('a11y.say.above')
    else if (ms.current < b.low) where = t('a11y.say.below')
    else where = t('a11y.say.within')
  }
  return t('a11y.say.reading', { label, value, unit: spokenUnit(def.unit), where })
}

/** Status of one astronaut for announcements (missing core vitals never read as normal). */
export function crewStatusOf(health: AstronautHealth | undefined): Status {
  if (!health) return 'NO_DATA'
  const level = health.risk.risk_level
  const hr = health.metrics.HEART_RATE
  const spo2 = health.metrics.SPO2
  const lost = (hr?.status === 'NO_DATA' || hr?.current == null) && (spo2?.status === 'NO_DATA' || spo2?.current == null)
  return lost && level === 'LOW' ? 'NO_DATA' : level
}

function whereOf(a: Alert): string | null {
  if (a.metric) return lower(metricLabel(a.metric))
  if (a.region === 'environment') return t('a11y.say.cabinAir')
  if (a.region) return lower(regionLabel(a.region))
  return null
}

const severityWord = (a: Alert) => STATUS_META[a.severity].label

const actionOf = (s: Status): string => (s === 'CRITICAL' || s === 'HIGH' || s === 'MODERATE' ? t(`a11y.say.action.${s}`) : '')

/** "Critical alert for ORION, heart rate. Heart rate far above usual. Act now." */
export function describeAlert(a: Alert, callsign: string | null): string {
  const who = callsign ? t('a11y.say.forCallsign', { callsign }) : t('a11y.say.forCabin')
  const loc = whereOf(a)
  const title = alertTitle(a).trim().replace(/[.!]+$/, '')
  return t('a11y.say.alert', { severity: severityWord(a), who, loc: loc ? `, ${loc}` : '', title, action: actionOf(a.severity) }).trim()
}

/** One sentence group for a batch of new alerts, most urgent first (the list must be sorted that way). */
export function describeNewAlerts(list: Alert[], callsignOf: (id: string | null) => string | null): string {
  if (list.length === 0) return ''
  const first = describeAlert(list[0]!, callsignOf(list[0]!.astronautId))
  if (list.length === 1) return first
  return t('a11y.say.newAlerts', { n: list.length, first })
}

/** "ORION status changed from Watch to Warning. Act soon." */
export function describeStatusChange(callsign: string, prev: Status, next: Status): string {
  return t('a11y.say.statusChange', { callsign, prev: STATUS_META[prev].label, next: statusPhrase(next) })
}

/** "ORION selected. Commander. Status: Watch, keep an eye. Sleep shorter than usual." */
export function describeAstronaut(a: Astronaut, health: AstronautHealth | undefined): string {
  const status = crewStatusOf(health)
  const headline = status === 'NO_DATA' ? '' : engineText('headline', health?.risk.headline ?? '').trim()
  return [t('a11y.say.astronautSelected', { callsign: a.callsign, role: roleLabel(a.role) }), t('a11y.say.status', { phrase: statusPhrase(status) }), headline && /[.!?]$/.test(headline) ? headline : headline ? `${headline}.` : '']
    .filter(Boolean)
    .join(' ')
}

const statusRank = (s: Status) => STATUS_META[s].rank

/** Up to `max` readings of a region, the most concerning first (no data counts as concerning). */
export function regionReadings(health: AstronautHealth | undefined, region: BodyRegionId, max = 3): string[] {
  const codes = (Object.keys(METRIC_CATALOG) as MetricCode[]).filter((m) => METRIC_CATALOG[m].region === region && health?.metrics[m] != null)
  const weight = (m: MetricCode) => {
    const s = health!.metrics[m]!.status
    return s === 'NO_DATA' ? 2.5 : statusRank(s)
  }
  return codes
    .sort((a, b) => weight(b) - weight(a))
    .slice(0, max)
    .map((m) => spokenReading(METRIC_CATALOG[m], health?.metrics[m]))
}

/** "Heart selected for ORION. Status: Watch, keep an eye. Heart rate trending up. Heart rate 92 ..." */
export function describeRegion(callsign: string, region: BodyRegionId, health: AstronautHealth | undefined): string {
  const label = regionLabel(region)
  const rs = health?.regions[region]
  const status: Status = rs?.status ?? 'NO_DATA'
  const parts = [t('a11y.say.regionSelected', { label, callsign }), t('a11y.say.status', { phrase: statusPhrase(status) })]
  const summary = rs?.summary ? engineText('regionSummary', rs.summary).trim() : undefined
  if (summary && status !== 'NO_DATA') parts.push(/[.!?]$/.test(summary) ? summary : `${summary}.`)
  parts.push(...regionReadings(health, region))
  return parts.join(' ')
}

/** An anatomical structure picked in the 3D atlas, with the readings of its monitored region if any. */
export function describeStructure(name: string, callsign: string, region: BodyRegionId | null, health: AstronautHealth | undefined): string {
  if (!region) return t('a11y.say.structureContext', { name })
  const rs = health?.regions[region]
  const status: Status = rs?.status ?? 'NO_DATA'
  return [t('a11y.say.structureSelected', { name, region: lower(regionLabel(region)), callsign }), t('a11y.say.status', { phrase: statusPhrase(status) }), ...regionReadings(health, region, 2)].join(' ')
}

type ScreenState = Pick<AppState, 'crew' | 'health' | 'alerts' | 'recommendations' | 'selectedAstronautId' | 'selectedRegion' | 'mission'>

const openAlert = (a: Alert) => a.acknowledgedAt == null && a.resolvedAt == null

/**
 * "Describe the screen": who is shown, overall status, what needs attention, the top
 * recommended actions, and the crew at a glance. Ends with the simulated data notice.
 */
export function describeScreen(s: ScreenState, view: 'ground' | 'crew' = 'ground'): string {
  const a = s.crew.find((c) => c.id === s.selectedAstronautId)
  const callsign = (id: string | null) => (id ? (s.crew.find((c) => c.id === id)?.callsign ?? id) : t('a11y.say.theCabin'))
  const parts: string[] = [view === 'crew' ? t('a11y.say.crewView') : t('a11y.say.groundView')]
  if (s.mission?.name) parts.push(t('a11y.say.mission', { name: s.mission.name }))
  if (a) {
    const h = s.health[a.id]
    const status = crewStatusOf(h)
    parts.push(t('a11y.say.showing', { callsign: a.callsign, role: roleLabel(a.role) }), t('a11y.say.overall', { phrase: statusPhrase(status) }))
    const headline = h?.risk.headline ? engineText('headline', h.risk.headline).trim() : undefined
    if (headline && status !== 'NO_DATA') parts.push(/[.!?]$/.test(headline) ? headline : `${headline}.`)
    if (s.selectedRegion) parts.push(t('a11y.say.regionIs', { label: regionLabel(s.selectedRegion) }))
  }

  const open = s.alerts.filter(openAlert).sort((x, y) => RISK_ORDER.indexOf(y.severity) - RISK_ORDER.indexOf(x.severity) || y.createdAt - x.createdAt)
  if (open.length === 0) parts.push(t('a11y.say.noOpen'))
  else {
    parts.push(tp('a11y.say.openAlerts', open.length))
    parts.push(t('a11y.say.mostUrgent', { alert: describeAlert(open[0]!, callsign(open[0]!.astronautId)) }))
  }

  if (a) {
    const recs: Recommendation[] = s.recommendations
      .filter((r) => r.status === 'PENDING' && r.active !== false && (r.astronautId === a.id || r.astronautId === 'CABIN'))
      .sort((x, y) => RISK_ORDER.indexOf(y.priority) - RISK_ORDER.indexOf(x.priority) || y.createdAt - x.createdAt)
      .slice(0, 2)
    if (recs.length === 0) parts.push(t('a11y.say.noRecs'))
    else {
      parts.push(t('a11y.say.recs'))
      recs.forEach((r, i) => parts.push(`${i + 1}. ${recTitle(r).trim().replace(/[.!]+$/, '')}.`))
    }
  }

  const others = s.crew.filter((c) => c.id !== a?.id)
  const notNominal = others.map((c) => ({ c, st: crewStatusOf(s.health[c.id]) })).filter((x) => x.st !== 'LOW')
  if (others.length > 0) {
    if (notNominal.length === 0) parts.push(t('a11y.say.restNominal'))
    else parts.push(t('a11y.say.also', { list: notNominal.map((x) => `${x.c.callsign} ${lower(STATUS_META[x.st].label)}`).join(', ') }))
  }
  parts.push(t('a11y.say.simulated'), t('a11y.say.notDiagnosis'))
  return parts.join(' ')
}
