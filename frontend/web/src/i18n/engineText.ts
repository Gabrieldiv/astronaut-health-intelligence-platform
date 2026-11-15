/**
 * Localized engine text (shared seam between the visual redesign and the translation sweep).
 *
 * The engine writes its sentences in English (risk headlines, factors, recommendations, alerts,
 * region summaries). Next to them it attaches structured messages (stable id + params, see
 * src/engine/msg.ts and EngineMsg in types/domain.ts). The UI renders engine text through these
 * helpers, never the raw English field, so the language can change without touching components.
 *
 * - English always returns the engine's own English field, unchanged (tests compare it).
 * - Other languages render the message from `eng.<id>` keys (locales/<lang>/engine.ts). Metric and
 *   region names, units and durations go through the catalog helpers. When a message or one of its
 *   keys is missing, the English field is returned (never a half translated sentence).
 * - A caller that only has the English text still gets a translation: the engine remembers each
 *   English sentence it produced together with its message (msgForEnglish).
 */
import type { Alert, EngineMsg, EngineParam, MissionProfileId, Recommendation } from '../types/domain'
import { METRIC_CATALOG } from '../engine/catalog'
import { HAZARD_LABEL, missionProfile, type HazardId, type MissionProfile } from '../engine/missions/profiles'
import { msgForEnglish } from '../engine/msg'
import { fmtDuration, fmtValue, inlineLabel, sentenceLabel } from '../engine/text'
import { formatFixed, getBcp47, getLang, isMessageKey, t, tOr, useI18n } from '.'
import { metricLabel, metricShort } from './catalog'
import { isPseudoLocale, pseudo } from './pseudo'

export type EngineTextKind = 'headline' | 'factor' | 'regionSummary' | 'explanation' | 'forecast' | 'mission' | 'other'

const MIN_MS = 60_000

class Missing extends Error {}

const capFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function key(k: string): string {
  if (!isMessageKey(k)) throw new Missing(k)
  return t(k)
}

const pluralRules = new Map<string, Intl.PluralRules>()
function pluralKey(base: string, n: number, english: boolean): string {
  let cat: string
  if (english) cat = n === 1 ? 'one' : 'other'
  else {
    const tag = getBcp47()
    let r = pluralRules.get(tag)
    if (!r) {
      r = new Intl.PluralRules(tag)
      pluralRules.set(tag, r)
    }
    cat = r.select(n) === 'one' ? 'one' : 'other'
  }
  return `${base}_${cat}`
}

function interpolate(template: string, params: Record<string, EngineParam> | undefined, english: boolean): string {
  return template.replace(/\{(\w+)\}/g, (m, name: string) => {
    if (!params || !(name in params)) return m
    const v = renderParam(params[name]!, english)
    return /^[A-Z]/.test(name) ? capFirst(v) : v
  })
}

/** Lower case first letter, except for languages that capitalize nouns (de) or have no case (ja), and acronyms. */
function inSentence(label: string): string {
  const lang = getLang()
  if (lang === 'de' || lang === 'ja') return label
  if (label.length > 1 && label.charAt(1) === label.charAt(1).toUpperCase() && /[A-Z]/.test(label.charAt(1))) return label
  return label.charAt(0).toLowerCase() + label.slice(1)
}

function localDuration(ms: number, english: boolean): string {
  if (english) return fmtDuration(ms)
  const min = Math.max(0, ms) / MIN_MS
  if (min < 60) return interpolate(key('eng.dur.min'), { n: Math.max(1, Math.round(min)) }, false)
  const h = min / 60
  if (h < 36) {
    const r = Math.round(h)
    return interpolate(key(pluralKey('eng.dur.hours', r, false)), { n: r }, false)
  }
  const d = Math.round(h / 24)
  return interpolate(key(pluralKey('eng.dur.days', d, false)), { n: d }, false)
}

function renderParam(p: EngineParam, english: boolean): string {
  if (typeof p === 'string') return p
  if (typeof p === 'number') return english ? String(p) : formatFixed(p, Number.isInteger(p) ? 0 : 1)
  if ('id' in p) return renderMsg(p, english)
  if ('form' in p) {
    const code = p.metric
    if (english) {
      if (p.form === 'inline') return inlineLabel(code)
      if (p.form === 'sentence') return sentenceLabel(code)
      if (p.form === 'lower') return METRIC_CATALOG[code].label.toLowerCase()
      return inlineLabel(code).replace('cabin ', '')
    }
    const label = code === 'HRV_RMSSD' ? metricShort(code) : metricLabel(code)
    if (p.form === 'sentence') return capFirst(label)
    return inSentence(label)
  }
  if ('value' in p) {
    if (english) return fmtValue(p.metric, p.value)
    const def = METRIC_CATALOG[p.metric]
    const s = formatFixed(p.value, def.decimals)
    return def.unit === '%' ? `${s}%` : def.unit === 'score' || def.unit === '% of baseline' ? s : `${s} ${def.unit}`
  }
  if ('num' in p) {
    const s = english ? p.num.toFixed(p.decimals) : formatFixed(p.num, p.decimals)
    return p.sign && p.num > 0 ? `+${s}` : s
  }
  if ('durationMs' in p) return localDuration(p.durationMs, english)
  if ('key' in p) {
    if (english) return p.en
    return isMessageKey(p.key) && t(p.key) ? t(p.key) : p.en
  }
  // list
  const items = p.list.map((x) => renderParam(x, english))
  const sep = english ? ', ' : key('eng.list.sep')
  if (p.comma || items.length <= 1) return items.join(sep)
  const and = english ? '{a} and {b}' : key('eng.list.and')
  return and.replace('{a}', items.slice(0, -1).join(sep)).replace('{b}', items[items.length - 1]!)
}

function renderMsg(m: EngineMsg, english: boolean): string {
  const base = `eng.${m.id}`
  const n = m.params?.n
  const k = typeof n === 'number' && isMessageKey(`${base}_other`) ? pluralKey(base, n, english) : base
  const out = interpolate(key(k), m.params, english)
  if (english) return out
  // Translations start sentences with a lower case metric name ("frequência cardíaca está ..."):
  // capitalize every sentence of a summary.
  if (m.id === 'sent1' || m.id === 'sent2') return out.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_, p: string, c: string) => p + c.toUpperCase())
  return out
}

/**
 * Renders a structured engine message in the current language (English when `opts.english`).
 * Returns null when a key is missing, so callers fall back to the engine's English text.
 */
export function renderEngineMsg(m: EngineMsg, opts: { english?: boolean } = {}): string | null {
  try {
    return renderMsg(m, opts.english ?? getLang() === 'en')
  } catch (e) {
    if (e instanceof Missing) return null
    throw e
  }
}

function localize(english: string, m: EngineMsg | null | undefined): string {
  const msg = m ?? (getLang() === 'en' && !isPseudoLocale() ? undefined : msgForEnglish(english))
  // Pseudo locale: only text the engine can translate gets brackets, so a sentence without a
  // structured message still shows up as plain English in the sweep.
  if (isPseudoLocale()) return msg ? pseudo(english) : english
  if (getLang() === 'en') return english
  if (!msg) return english
  const out = renderEngineMsg(msg)
  return out === null ? english : capFirst(out)
}

/**
 * Generic engine sentence in the current language. The third argument is the structured message
 * when the caller has it (`risk.headlineMsg`, `factor.msg`, `region.summaryMsg`); a plain string id
 * is accepted for compatibility. Without it the message is looked up from the English text.
 */
export function engineText(_kind: EngineTextKind, english: string, msg?: EngineMsg | string | null): string {
  return localize(english, typeof msg === 'object' ? msg : undefined)
}

export function recTitle(rec: Recommendation): string {
  return localize(rec.title, rec.titleMsg)
}

export function recRationale(rec: Recommendation): string {
  return localize(rec.rationale, rec.rationaleMsg)
}

export function alertTitle(alert: Alert): string {
  return localize(alert.title, alert.titleMsg)
}

export function alertDetail(alert: Alert): string {
  return localize(alert.detail, alert.detailMsg)
}

// ---------------------------------------------------------------------------
// Mission profile texts (src/engine/missions/profiles.ts): keys `eng.mp.<id>.<field>`
// ---------------------------------------------------------------------------

const profileCache = new Map<MissionProfileId, { messages: unknown; pseudo: boolean; p: MissionProfile }>()

/**
 * The mission profile with its plain texts (label, summary, body effects, hazards, countermeasures,
 * autonomy, value labels) in the current language. Numbers, sources and ids are unchanged. English
 * returns the engine object itself.
 */
export function localMissionProfile(id: MissionProfileId): MissionProfile {
  const p = missionProfile(id)
  const ps = isPseudoLocale()
  if (getLang() === 'en' && !ps) return p
  const messages = useI18n.getState().messages
  const hit = profileCache.get(p.id)
  if (hit && hit.messages === messages && hit.pseudo === ps) return hit.p
  const tr = (field: string, en: string) => (ps ? pseudo(en) : tOr(`eng.mp.${p.id}.${field}`, en))
  const out: MissionProfile = {
    ...p,
    label: tr('label', p.label),
    shortLabel: tr('shortLabel', p.shortLabel),
    vehicle: tr('vehicle', p.vehicle),
    summary: tr('summary', p.summary),
    bodyEffects: p.bodyEffects.map((b, i) => tr(`body.${i}`, b)),
    radiation: { ...p.radiation, plain: tr('plain', p.radiation.plain), measuredWhere: tr('measuredWhere', p.radiation.measuredWhere) },
    gravity: { ...p.gravity, value: { ...p.gravity.value, label: tr('gravity', p.gravity.value.label) } },
    distanceKm: { ...p.distanceKm, value: { ...p.distanceKm.value, label: tr('distance', p.distanceKm.value.label) } },
    oneWayDelaySec: {
      ...p.oneWayDelaySec,
      value: { ...p.oneWayDelaySec.value, label: tr('delay', p.oneWayDelaySec.value.label) },
      note: p.oneWayDelaySec.note ? tr('delayNote', p.oneWayDelaySec.note) : p.oneWayDelaySec.note,
    },
    duration: { ...p.duration, value: { ...p.duration.value, label: tr('duration', p.duration.value.label) } },
    hazards: p.hazards.map((h) => ({ ...h, why: tr(`hazard.${h.id}`, h.why) })),
    countermeasures: p.countermeasures.map((c, i) => tr(`cm.${i}`, c)),
    autonomy: tr('autonomy', p.autonomy),
  }
  profileCache.set(p.id, { messages, pseudo: ps, p: out })
  return out
}

/** Hazard names in the current language, same shape as HAZARD_LABEL (read at render time). */
export const LOCAL_HAZARD_LABEL = Object.fromEntries(
  (Object.keys(HAZARD_LABEL) as HazardId[]).map((id) => [
    id,
    {
      get label() {
        const en = HAZARD_LABEL[id].label
        if (isPseudoLocale()) return pseudo(en)
        return getLang() === 'en' ? en : tOr(`eng.hazard.${id}`, en)
      },
      nasa: HAZARD_LABEL[id].nasa,
    },
  ]),
) as Record<HazardId, { readonly label: string; nasa: boolean }>
