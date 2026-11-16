/** Types for the ASTRA deviation panel (POST /api/v1/analytics/deviation). Only the fields the UI uses. */

export type AstraPhase = 'PRE_FLIGHT' | 'IN_FLIGHT' | 'POST_FLIGHT'
export type AstraLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'NO_DATA'

/** One day sent to the backend. */
export interface AstraDay {
  date: string
  phase: AstraPhase
  values: Record<string, number | null>
}

/** One judged day of the response. */
export interface AstraResult {
  date: string
  level: AstraLevel
  main_indicator: string | null
  message: string
  multivariate_flag: boolean
  multivariate_score: number | null
}

/** What the panel receives. Offline and error both render nothing: the app never depends on ASTRA. */
export type AstraOutcome =
  | { kind: 'ok'; result: AstraResult; dayCount: number; capped: boolean }
  | { kind: 'offline' }
  | { kind: 'error' }
