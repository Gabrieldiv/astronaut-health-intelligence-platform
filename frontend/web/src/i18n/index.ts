import { create } from 'zustand'
import { en, type MessageKey, type Messages } from './locales/en'

/**
 * Light, typed i18n layer (no runtime dependency).
 *
 * - English (`locales/en`) is the source of truth and the default. It ships in the main bundle;
 *   the other locales are lazy loaded chunks, fetched only when the user picks them.
 * - Keys are flat and namespaced (`shell.tools`, `status.LOW.label`). Every non English locale is
 *   typed `Record<MessageKey, string>`, so a missing key is a compile error.
 * - `{name}` placeholders are replaced by `vars`. Plurals: keys `x_one` / `x_other`, picked with
 *   Intl.PluralRules through `tp('x', n)` (Japanese only has `other`).
 * - `t()` works anywhere (store, engine adapters, module constants); components call `useT()` so
 *   they re-render when the language changes.
 * - The browser language is never applied automatically: English stays the default for judges.
 *   The choice persists in localStorage (wrapped in try/catch).
 *
 * Conventions: never write the em dash or en dash characters in any locale. Keep "SIMULATED",
 * "REAL_PUBLIC", metric codes, rule ids and units untranslated. Decision support tone, plain
 * language first, never a diagnosis.
 */

export type Lang = 'en' | 'pt-BR' | 'es' | 'ja' | 'de'
export type { MessageKey, Messages }

export interface LangInfo {
  id: Lang
  /** Native name, shown in the picker. */
  native: string
  /** English name, for the accessible description. */
  english: string
  /** BCP 47 tag for Intl and speech synthesis. */
  bcp47: string
  /** Machine assisted translation still waiting for a native speaker review. */
  pendingReview: boolean
}

export const LANGS: LangInfo[] = [
  { id: 'en', native: 'English', english: 'English', bcp47: 'en-US', pendingReview: false },
  { id: 'pt-BR', native: 'Português (Brasil)', english: 'Portuguese (Brazil)', bcp47: 'pt-BR', pendingReview: true },
  { id: 'es', native: 'Español', english: 'Spanish', bcp47: 'es-ES', pendingReview: true },
  { id: 'ja', native: '日本語', english: 'Japanese', bcp47: 'ja-JP', pendingReview: true },
  { id: 'de', native: 'Deutsch', english: 'German', bcp47: 'de-DE', pendingReview: true },
]

export const langInfo = (id: Lang): LangInfo => LANGS.find((l) => l.id === id) ?? LANGS[0]!

const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<{ default: Messages }>> = {
  'pt-BR': () => import('./locales/pt-BR'),
  es: () => import('./locales/es'),
  ja: () => import('./locales/ja'),
  de: () => import('./locales/de'),
}

const STORAGE_KEY = 'ahi.lang.v1'

const isLang = (v: unknown): v is Lang => typeof v === 'string' && LANGS.some((l) => l.id === v)

function readStored(): Lang {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return isLang(v) ? v : 'en'
  } catch {
    return 'en'
  }
}

function writeStored(lang: Lang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // storage unavailable: the choice lasts for this session only
  }
}

interface I18nState {
  lang: Lang
  messages: Messages
  /** Language being fetched (picker shows a busy state), null when idle. */
  loading: Lang | null
}

export const useI18n = create<I18nState>()(() => ({ lang: 'en', messages: en, loading: null }))

const cache: Partial<Record<Lang, Messages>> = { en }

/** Switch language (lazy loads the locale chunk). Falls back to English if the chunk fails to load. */
export async function setLanguage(lang: Lang, opts: { persist?: boolean } = {}): Promise<void> {
  if (opts.persist !== false) writeStored(lang)
  let messages = cache[lang]
  if (!messages && lang !== 'en') {
    useI18n.setState({ loading: lang })
    try {
      messages = (await LOADERS[lang]()).default
      cache[lang] = messages
    } catch {
      useI18n.setState({ loading: null })
      return
    }
  }
  useI18n.setState({ lang, messages: messages ?? en, loading: null })
}

/** While set, t() and getLang() answer in English (see inEnglish). */
let forceEnglish = 0

/**
 * Runs `fn` with every t() call answering in English. For text that leaves the app (packets sent
 * to ground, the plain text handover report): one language end to end, whatever the UI shows.
 */
export function inEnglish<T>(fn: () => T): T {
  forceEnglish++
  try {
    return fn()
  } finally {
    forceEnglish--
  }
}

export const getLang = (): Lang => (forceEnglish ? 'en' : useI18n.getState().lang)
export const getBcp47 = (): string => langInfo(getLang()).bcp47

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/** Translate a key in the current language (English fallback for an empty value). */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const m = forceEnglish ? en : useI18n.getState().messages
  const s = m[key] || en[key]
  return s == null ? key : interpolate(s, vars)
}

export const isMessageKey = (k: string): k is MessageKey => Object.prototype.hasOwnProperty.call(en, k)

/** Translate a dynamic key when it exists, otherwise return `fallback` (data driven labels). */
export function tOr(key: string, fallback: string, vars?: Record<string, string | number>): string {
  return isMessageKey(key) ? t(key, vars) : fallback
}

/** Keys that have `_one` and `_other` variants, usable with `tp`. */
export type PluralBase = { [K in MessageKey]: K extends `${infer B}_other` ? (`${B}_one` extends MessageKey ? B : never) : never }[MessageKey]

const pluralRules = new Map<string, Intl.PluralRules>()
function pluralCategory(n: number): 'one' | 'other' {
  const tag = getBcp47()
  let r = pluralRules.get(tag)
  if (!r) {
    r = new Intl.PluralRules(tag)
    pluralRules.set(tag, r)
  }
  return r.select(n) === 'one' ? 'one' : 'other'
}

/** Plural aware translate. `{n}` is always available in the string. English uses n === 1 for "one". */
export function tp(base: PluralBase, n: number, vars?: Record<string, string | number>): string {
  const cat = getLang() === 'en' ? (n === 1 ? 'one' : 'other') : pluralCategory(n)
  return t(`${base}_${cat}` as MessageKey, { n, ...vars })
}

/** Hook: subscribes the component to language changes and returns `t`. */
export function useT(): typeof t {
  useI18n((s) => s.lang)
  return t
}

/** Hook: current language id. */
export const useLang = (): Lang => useI18n((s) => s.lang)

const numberFormats = new Map<string, Intl.NumberFormat>()
/**
 * Locale aware fixed decimals. English keeps `toFixed` output exactly (no grouping), other
 * languages use Intl.NumberFormat (decimal comma in pt-BR, es and de) without grouping, so values
 * stay as compact as the English ones.
 */
export function formatFixed(v: number, decimals: number): string {
  const lang = getLang()
  if (lang === 'en') return v.toFixed(decimals)
  const key = `${lang}|${decimals}`
  let f = numberFormats.get(key)
  if (!f) {
    f = new Intl.NumberFormat(langInfo(lang).bcp47, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: false })
    numberFormats.set(key, f)
  }
  return f.format(v)
}

// Japanese: Inter has no kana or kanji. Load Noto Sans JP (unicode-range subsets, so only the
// glyphs on screen download) and fall back to the system Japanese fonts meanwhile (index.css).
let jaFontRequested = false
function ensureJapaneseFont() {
  if (jaFontRequested || typeof document === 'undefined') return
  jaFontRequested = true
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap'
  document.head.appendChild(link)
}

function applyDocumentLang(lang: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
  if (lang === 'ja') ensureJapaneseFont()
}

/**
 * A record whose values are translated on read (property getters), so module level lookup tables
 * (`STATUS_META[s].label`, `QUALITY_LABEL[q]`) follow the current language without call site changes.
 */
export function translatedRecord<K extends string>(keys: readonly K[], fn: (k: K) => string): Record<K, string> {
  const out = {} as Record<K, string>
  for (const k of keys) Object.defineProperty(out, k, { get: () => fn(k), enumerable: true })
  return out
}

/** Called once at startup: applies the stored choice (never the browser language). */
export function initI18n() {
  if (typeof window === 'undefined') return
  useI18n.subscribe((s, prev) => {
    if (s.lang !== prev.lang) applyDocumentLang(s.lang)
  })
  const stored = readStored()
  if (stored !== 'en') void setLanguage(stored, { persist: false })
}
