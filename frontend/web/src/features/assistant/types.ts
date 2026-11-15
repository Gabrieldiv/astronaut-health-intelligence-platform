/**
 * Assistant HTTP contract. Mirrors backend/app/modules/assistant/schemas.py (snake_case on the wire).
 * Limits below match the API so the app never sends a request the API would reject.
 */
import type { DataOrigin, Status } from '../../types/domain'

export const LIMITS = {
  question: 1000,
  turn: 4000,
  historyTurns: 12,
  short: 120,
  text: 600,
  metrics: 30,
  alerts: 15,
  recommendations: 10,
  factors: 10,
  cabinMetrics: 12,
  crew: 8,
} as const

export interface MetricReading {
  code: string
  label: string
  /** null = no data, never zero. */
  value: number | null
  unit: string
  status: Status
  normal_low: number | null
  normal_high: number | null
  baseline_ready: boolean
  trend_per_hour: number | null
  explanation: string | null
  quality: string | null
  data_origin: DataOrigin
}

export interface AssistantContext {
  schema_version: '1'
  data_origin: DataOrigin
  sim_time_utc: string
  astronaut: { id: string; callsign: string; role: string }
  overall: {
    status: Status
    risk_score: number | null
    headline: string
    confidence: number | null
    contributing_factors: string[]
    limitations: string[]
  }
  metrics: MetricReading[]
  open_alerts: Array<{ severity: Status; title: string; detail: string; metric: string | null; minutes_open: number; escalated: boolean }>
  recommendations: Array<{ title: string; rationale: string; priority: Status; audience: string; autonomy: string | null; requires_human_review: boolean }>
  mission: { profile: string; vehicle: string; mission_day: number | null; scenario: string; earth_link: string; one_way_delay_seconds: number | null }
  cabin: { status: Status; headline: string; metrics: MetricReading[] } | null
  crew_overview: Array<{ callsign: string; status: Status }>
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  question: string
  history: ChatTurn[]
  context: AssistantContext
}

/** One server sent event of /assistant/chat. */
export type ChatEvent =
  | { type: 'meta'; provider: string; model: string; data_origin: DataOrigin }
  | { type: 'delta'; text: string }
  | { type: 'done'; stop_reason: string | null }
  | { type: 'error'; message: string }

export interface AssistantStatusResponse {
  configured: boolean
  provider: string
  model: string
  deployment: 'cloud-demo'
  note: string
}
