/**
 * Dev only pseudo locale ("qps"): every translated string is wrapped in ⟦ ⟧, so text that bypasses
 * t() or the engine text helpers stands out as plain, unbracketed English.
 *
 * Enable with `?lang=qps` in the URL or `localStorage.setItem('ahi.pseudo.v1', '1')` (remove the
 * item, or use `?lang=en`, to turn it off). Never shown in the language picker, never in production
 * builds. It keeps the language id 'en' (so dates, numbers and the picker stay English) and only
 * swaps the message table.
 */
import { useI18n, type Messages } from '.'
import { en } from './locales/en'

const STORAGE_KEY = 'ahi.pseudo.v1'
let active = false

export const isPseudoLocale = (): boolean => active

/** Wraps a string; `{placeholders}` stay intact inside the brackets. */
export const pseudo = (s: string): string => (s ? `⟦${s}⟧` : s)

export function pseudoMessages(): Messages {
  const out = {} as Messages
  for (const k of Object.keys(en) as (keyof Messages)[]) out[k] = pseudo(en[k])
  return out
}

function requested(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get('lang')
    if (q === 'qps') {
      window.localStorage.setItem(STORAGE_KEY, '1')
      return true
    }
    if (q) {
      window.localStorage.removeItem(STORAGE_KEY)
      return false
    }
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Called once at startup in dev builds (main.tsx). */
export function initPseudoLocale(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined' || !requested()) return
  active = true
  useI18n.setState({ lang: 'en', messages: pseudoMessages(), loading: null })
}
