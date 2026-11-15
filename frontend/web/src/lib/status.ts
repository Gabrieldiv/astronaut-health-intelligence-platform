import type { RiskLevel, Status } from '../types/domain'
import { t } from '../i18n'
import { en } from '../i18n/locales/en'

/**
 * Status semantics shared by UI and 3D viewer.
 * Color is never the only cue: always pair it with label and icon/shape.
 */
interface StatusMeta {
  /** Technical word (Nominal, Watch...), in the current language. */
  readonly label: string
  /** Plain language word for the crew (All good, Keep an eye...), in the current language. */
  readonly crewLabel: string
  color: string
  glow: string
  rank: number
}

// Labels are getters so every reader gets the current language (see src/i18n).
const meta = (s: Status, color: string, glow: string, rank: number): StatusMeta => ({
  get label() {
    return t(`status.${s}.label`)
  },
  get crewLabel() {
    return t(`status.${s}.crewLabel`)
  },
  color,
  glow,
  rank,
})

export const STATUS_META: Record<Status, StatusMeta> = {
  LOW: meta('LOW', '#34d399', 'rgba(52,211,153,0.35)', 0),
  MODERATE: meta('MODERATE', '#fbbf24', 'rgba(251,191,36,0.35)', 1),
  HIGH: meta('HIGH', '#fb923c', 'rgba(251,146,60,0.40)', 2),
  CRITICAL: meta('CRITICAL', '#f43f5e', 'rgba(244,63,94,0.45)', 3),
  NO_DATA: meta('NO_DATA', '#94a3b8', 'rgba(148,163,184,0.30)', -1),
}

/**
 * English technical status word, for text that leaves the app in English (packets sent to ground,
 * the plain text handover): keeps those messages in one language whatever the UI language is.
 */
export const statusLabelEn = (s: Status): string => en[`status.${s}.label`]

export function worstStatus(list: Status[]): Status {
  let worst: Status = 'LOW'
  let hasData = false
  for (const s of list) {
    if (s === 'NO_DATA') continue
    hasData = true
    if (STATUS_META[s].rank > STATUS_META[worst].rank) worst = s
  }
  if (!hasData && list.length > 0) return 'NO_DATA'
  return worst
}

export const RISK_ORDER: RiskLevel[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL']
