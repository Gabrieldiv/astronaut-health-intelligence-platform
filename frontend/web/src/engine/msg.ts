/**
 * Structured engine messages (additive, for translation).
 *
 * The engine keeps producing its English sentences exactly as before. Next to each sentence it
 * attaches an EngineMsg (stable id + params, see types/domain.ts) that src/i18n/engineText.ts
 * renders in the selected language. `said()` also remembers the pair English sentence to message,
 * so a UI call that only has the English text (`engineText(kind, english)`) can still be localized.
 * The registry is bounded: it forgets the oldest half when full.
 */
import type { EngineMsg, EngineParam } from '../types/domain'

const MAX_ENTRIES = 6000
const registry = new Map<string, EngineMsg>()

/** Records `msg` as the structured form of `english` and returns `english` unchanged. */
export function said(english: string, msg: EngineMsg): string {
  // Re-inserting moves the sentence to the newest end, so text the engine keeps producing is
  // never the one forgotten first.
  if (registry.delete(english)) {
    registry.set(english, msg)
    return english
  }
  if (registry.size >= MAX_ENTRIES) {
    let drop = MAX_ENTRIES / 2
    for (const k of registry.keys()) {
      registry.delete(k)
      if (--drop <= 0) break
    }
  }
  registry.set(english, msg)
  return english
}

/** Structured form of an English engine sentence, when the engine produced it. */
export function msgForEnglish(english: string): EngineMsg | undefined {
  return registry.get(english)
}

/** Shorthand constructor. */
export const msg = (id: string, params?: Record<string, EngineParam>): EngineMsg => (params ? { id, params } : { id })
