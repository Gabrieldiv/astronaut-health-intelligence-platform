import type { Alert, AppState, Astronaut, AstronautHealth, BodyRegionId, MetricCode, MetricDefinition, MetricState, Recommendation, Status } from '../../types/domain'
import { METRIC_CATALOG, REGION_LABELS } from '../../engine/catalog'
import { RISK_ORDER, STATUS_META } from '../../lib/status'

/**
 * Spoken and announced text, built from the store with pure functions (unit tested).
 * Style: plain language first, short sentences, no diagnosis, no jargon first. Every text that
 * summarizes health says the data is simulated.
 */

const SIMULATED = 'All data is simulated.'

/** "Critical, act now." style status phrase. */
export function statusPhrase(s: Status): string {
  const m = STATUS_META[s]
  if (s === 'NO_DATA') return 'No data. No live readings, check the sensor. Missing data is not treated as normal.'
  return `${m.label}, ${m.crewLabel.toLowerCase()}.`
}

const UNIT_WORDS: Record<string, string> = {
  bpm: 'beats per minute',
  ms: 'milliseconds',
  '%': 'percent',
  'br/min': 'breaths per minute',
  mmHg: 'millimeters of mercury',
  '°C': 'degrees Celsius',
  h: 'hours',
  score: 'points',
  '% of baseline': 'percent of usual',
  ppm: 'parts per million',
  'µGy/h': 'micrograys per hour',
  mGy: 'milligrays',
  '1-5': 'out of 5',
}

export const spokenUnit = (unit: string) => UNIT_WORDS[unit] ?? unit

/** "Heart rate 92 beats per minute, above your usual range." or "Heart rate: no reading." */
export function spokenReading(def: MetricDefinition, ms: MetricState | undefined): string {
  if (!ms || ms.status === 'NO_DATA' || ms.current == null) return `${def.label}: no reading.`
  const value = Number(ms.current.toFixed(def.decimals))
  let where = ''
  const b = ms.baseline
  if (b && b.status === 'READY') {
    if (ms.current > b.high) where = ', above your usual range'
    else if (ms.current < b.low) where = ', below your usual range'
    else where = ', within your usual range'
  }
  return `${def.label} ${value} ${spokenUnit(def.unit)}${where}.`
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
  if (a.metric) return METRIC_CATALOG[a.metric].label.toLowerCase()
  if (a.region === 'environment') return 'cabin air'
  if (a.region) return REGION_LABELS[a.region].label.toLowerCase()
  return null
}

const severityWord = (a: Alert) => STATUS_META[a.severity].label

const ACTION: Record<string, string> = { CRITICAL: 'Act now.', HIGH: 'Act soon.', MODERATE: 'Keep an eye on it.', LOW: '' }

/** "Critical alert for ORION, heart rate. Heart rate far above usual. Act now." */
export function describeAlert(a: Alert, callsign: string | null): string {
  const who = callsign ? `for ${callsign}` : 'for the cabin'
  const loc = whereOf(a)
  const title = a.title.trim().replace(/[.!]+$/, '')
  return `${severityWord(a)} alert ${who}${loc ? `, ${loc}` : ''}. ${title}. ${ACTION[a.severity] ?? ''}`.trim()
}

/** One sentence group for a batch of new alerts, most urgent first (the list must be sorted that way). */
export function describeNewAlerts(list: Alert[], callsignOf: (id: string | null) => string | null): string {
  if (list.length === 0) return ''
  const first = describeAlert(list[0]!, callsignOf(list[0]!.astronautId))
  if (list.length === 1) return first
  return `${list.length} new alerts. Most urgent: ${first}`
}

/** "ORION status changed from Watch to Warning. Act soon." */
export function describeStatusChange(callsign: string, prev: Status, next: Status): string {
  return `${callsign} status changed from ${STATUS_META[prev].label} to ${statusPhrase(next)}`
}

/** "ORION selected. Commander. Status: Watch, keep an eye. Sleep shorter than usual." */
export function describeAstronaut(a: Astronaut, health: AstronautHealth | undefined): string {
  const status = crewStatusOf(health)
  const headline = status === 'NO_DATA' ? '' : (health?.risk.headline ?? '').trim()
  return [`${a.callsign} selected. ${a.role}.`, `Status: ${statusPhrase(status)}`, headline && /[.!?]$/.test(headline) ? headline : headline ? `${headline}.` : '']
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
  const label = REGION_LABELS[region].label
  const rs = health?.regions[region]
  const status: Status = rs?.status ?? 'NO_DATA'
  const parts = [`${label} selected for ${callsign}.`, `Status: ${statusPhrase(status)}`]
  const summary = rs?.summary?.trim()
  if (summary && status !== 'NO_DATA') parts.push(/[.!?]$/.test(summary) ? summary : `${summary}.`)
  parts.push(...regionReadings(health, region))
  return parts.join(' ')
}

/** An anatomical structure picked in the 3D atlas, with the readings of its monitored region if any. */
export function describeStructure(name: string, callsign: string, region: BodyRegionId | null, health: AstronautHealth | undefined): string {
  if (!region) return `${name} selected. Shown for context only. No sensor reads this part directly.`
  const rs = health?.regions[region]
  const status: Status = rs?.status ?? 'NO_DATA'
  return [`${name} selected, part of the ${REGION_LABELS[region].label.toLowerCase()} area for ${callsign}.`, `Status: ${statusPhrase(status)}`, ...regionReadings(health, region, 2)].join(' ')
}

type ScreenState = Pick<AppState, 'crew' | 'health' | 'alerts' | 'recommendations' | 'selectedAstronautId' | 'selectedRegion' | 'mission'>

const openAlert = (a: Alert) => a.acknowledgedAt == null && a.resolvedAt == null

/**
 * "Describe the screen": who is shown, overall status, what needs attention, the top
 * recommended actions, and the crew at a glance. Ends with the simulated data notice.
 */
export function describeScreen(s: ScreenState, view: 'ground' | 'crew' = 'ground'): string {
  const a = s.crew.find((c) => c.id === s.selectedAstronautId)
  const callsign = (id: string | null) => (id ? (s.crew.find((c) => c.id === id)?.callsign ?? id) : 'the cabin')
  const parts: string[] = [view === 'crew' ? 'Crew view.' : 'Ground view.']
  if (s.mission?.name) parts.push(`Mission ${s.mission.name}.`)
  if (a) {
    const h = s.health[a.id]
    const status = crewStatusOf(h)
    parts.push(`Showing ${a.callsign}, ${a.role}.`, `Overall status: ${statusPhrase(status)}`)
    const headline = h?.risk.headline?.trim()
    if (headline && status !== 'NO_DATA') parts.push(/[.!?]$/.test(headline) ? headline : `${headline}.`)
    if (s.selectedRegion) parts.push(`${REGION_LABELS[s.selectedRegion].label} is selected.`)
  }

  const open = s.alerts.filter(openAlert).sort((x, y) => RISK_ORDER.indexOf(y.severity) - RISK_ORDER.indexOf(x.severity) || y.createdAt - x.createdAt)
  if (open.length === 0) parts.push('No open alerts.')
  else {
    parts.push(open.length === 1 ? '1 open alert needs attention.' : `${open.length} open alerts need attention.`)
    parts.push(`Most urgent: ${describeAlert(open[0]!, callsign(open[0]!.astronautId))}`)
  }

  if (a) {
    const recs: Recommendation[] = s.recommendations
      .filter((r) => r.status === 'PENDING' && r.active !== false && (r.astronautId === a.id || r.astronautId === 'CABIN'))
      .sort((x, y) => RISK_ORDER.indexOf(y.priority) - RISK_ORDER.indexOf(x.priority) || y.createdAt - x.createdAt)
      .slice(0, 2)
    if (recs.length === 0) parts.push('No recommended actions right now.')
    else {
      parts.push('Recommended actions:')
      recs.forEach((r, i) => parts.push(`${i + 1}. ${r.title.trim().replace(/[.!]+$/, '')}.`))
    }
  }

  const others = s.crew.filter((c) => c.id !== a?.id)
  const notNominal = others.map((c) => ({ c, st: crewStatusOf(s.health[c.id]) })).filter((x) => x.st !== 'LOW')
  if (others.length > 0) {
    if (notNominal.length === 0) parts.push('The rest of the crew is nominal.')
    else parts.push(`Also: ${notNominal.map((x) => `${x.c.callsign} ${STATUS_META[x.st].label.toLowerCase()}`).join(', ')}.`)
  }
  parts.push(SIMULATED, 'Decision support only, not a diagnosis.')
  return parts.join(' ')
}
