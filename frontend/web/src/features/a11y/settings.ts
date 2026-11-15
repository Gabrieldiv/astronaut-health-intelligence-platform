import { create } from 'zustand'
import type { Earcon } from './alarmSchedule'

/**
 * Accessibility and sound preferences, plus the text of the two aria-live regions.
 * Preferences persist in localStorage; every access is wrapped in try/catch (private windows
 * and blocked storage must not break the app).
 */

const KEY = 'ahi.a11y.v1'

export const MIN_RATE = 0.6
export const MAX_RATE = 1.6

export interface A11yPrefs {
  /** Sound for CRITICAL alerts. Default on. */
  soundOn: boolean
  /** Also a (softer) sound for HIGH alerts. Default off. */
  soundHigh: boolean
  /** Audio description: spoken explanations with the browser speech synthesis. Default off. */
  speechOn: boolean
  /** Speech rate, 1 is the voice default. */
  speechRate: number
}

export const DEFAULT_PREFS: A11yPrefs = { soundOn: true, soundHigh: false, speechOn: false, speechRate: 1 }

export function parsePrefs(raw: string | null): A11yPrefs {
  if (!raw) return DEFAULT_PREFS
  try {
    const p = JSON.parse(raw) as Partial<A11yPrefs>
    const rate = typeof p.speechRate === 'number' && Number.isFinite(p.speechRate) ? Math.min(MAX_RATE, Math.max(MIN_RATE, p.speechRate)) : DEFAULT_PREFS.speechRate
    return {
      soundOn: typeof p.soundOn === 'boolean' ? p.soundOn : DEFAULT_PREFS.soundOn,
      soundHigh: p.soundHigh === true,
      speechOn: p.speechOn === true,
      speechRate: rate,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function load(): A11yPrefs {
  try {
    return parsePrefs(window.localStorage.getItem(KEY))
  } catch {
    return DEFAULT_PREFS
  }
}

function save(p: A11yPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // storage unavailable: preferences simply do not persist
  }
}

export type Politeness = 'polite' | 'assertive'

interface A11yState extends A11yPrefs {
  setPrefs: (p: Partial<A11yPrefs>) => void
  /** The browser refused to play an alert sound (no user gesture yet). */
  audioBlocked: boolean
  setAudioBlocked: (b: boolean) => void
  /** Most urgent sound among the open alerts that ring (null when nothing rings). */
  alarmLevel: Earcon | null
  setAlarmLevel: (e: Earcon | null) => void
  /** Text of the last "Describe the screen" shown on screen (speech off), or null. */
  description: string | null
  showDescription: (text: string | null) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  /** Live region text. `n` changes on every announcement so the same text is read again. */
  live: Record<Politeness, { text: string; n: number }>
  announce: (text: string, politeness?: Politeness) => void
}

const initial = typeof window !== 'undefined' ? load() : DEFAULT_PREFS

export const useA11yStore = create<A11yState>()((set, get) => ({
  ...initial,
  setPrefs: (p) => {
    set(p)
    const s = get()
    save({ soundOn: s.soundOn, soundHigh: s.soundHigh, speechOn: s.speechOn, speechRate: s.speechRate })
  },
  audioBlocked: false,
  setAudioBlocked: (audioBlocked) => set({ audioBlocked }),
  alarmLevel: null,
  setAlarmLevel: (alarmLevel) => set({ alarmLevel }),
  description: null,
  showDescription: (description) => set({ description }),
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  live: { polite: { text: '', n: 0 }, assertive: { text: '', n: 0 } },
  announce: (text, politeness = 'polite') => set((s) => ({ live: { ...s.live, [politeness]: { text, n: s.live[politeness].n + 1 } } })),
}))
