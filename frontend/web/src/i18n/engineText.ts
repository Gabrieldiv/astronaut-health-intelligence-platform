/**
 * Localized engine text (shared seam between the visual redesign and the translation sweep).
 *
 * The engine writes its sentences in English (risk headlines, factors, recommendations, alerts,
 * region summaries, explanations). The UI must render them through these helpers, never the raw
 * English field, so the translation layer can swap the language without touching components.
 *
 * Placeholder: returns the English text. The translation agent implements lookups keyed by the
 * stable engine ids (rule id, recommendation id, metric code) plus parameters.
 */
import type { Alert, Recommendation } from '../types/domain'

export type EngineTextKind = 'headline' | 'factor' | 'regionSummary' | 'explanation' | 'forecast' | 'mission' | 'other'

/** Generic engine sentence. `id` is a stable key when the engine has one (rule id, metric code). */
export function engineText(_kind: EngineTextKind, english: string, _id?: string | null): string {
  return english
}

export function recTitle(rec: Recommendation): string {
  return rec.title
}

export function recRationale(rec: Recommendation): string {
  return rec.rationale
}

export function alertTitle(alert: Alert): string {
  return alert.title
}

export function alertDetail(alert: Alert): string {
  return alert.detail
}
