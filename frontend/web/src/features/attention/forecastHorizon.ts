import { create } from 'zustand'
import type { ForecastHorizonHours, Prediction } from '../../types/domain'
import { FORECAST_HORIZONS } from '../../engine/config'
import { formatFixed, t, type MessageKey } from '../../i18n'

/** Forecast horizon picked by the user. Shared by the Forecast list and the trend chart cones. */
export const useForecastHorizon = create<{ hours: ForecastHorizonHours; set: (h: ForecastHorizonHours) => void }>()((set) => ({
  hours: FORECAST_HORIZONS.defaultHours,
  set: (hours) => set({ hours }),
}))

/** The projection of `p` for the picked horizon (falls back to the default projection). */
export function forHorizon(p: Prediction | null | undefined, hours: ForecastHorizonHours): Prediction | null {
  if (!p) return null
  return p.byHorizon?.[hours] ?? p
}

/** One plain sentence for a projection (used by the Forecast list). */
export function forecastMessage(p: Prediction, formatHours: (h: number) => string): string {
  if (!p.eligible) return p.ineligibleReason === 'HISTORY_TOO_SHORT' ? t('attention.forecast.historyShort') : t('attention.forecast.notEnough')
  if (p.hoursToBandExit != null) {
    const h = p.hoursToBandExit
    return t('attention.forecast.leaves', { when: h >= 48 ? t('attention.span.aboutDays', { n: Math.round(h / 24) }) : formatHours(h) })
  }
  const known = (FORECAST_HORIZONS.options as readonly number[]).includes(p.horizonHours)
  return t('attention.forecast.stable', { span: known ? horizonText(p.horizonHours as ForecastHorizonHours) : t('attention.span.hours', { n: p.horizonHours }) })
}

/** Translated horizon label ("24 h", "7 days"); same words as horizonLabel in the engine. */
export function horizonText(h: ForecastHorizonHours): string {
  return t(`attention.horizon.${h}` as MessageKey)
}

/** Translated plain duration, same rule as fmtSpan in the engine ("18 h" or "7.5 days"). */
function spanText(hours: number): string {
  if (hours < 48) return t('attention.span.hours', { n: Math.round(hours) })
  const d = Math.round((hours / 24) * 10) / 10
  return t('attention.span.days', { n: formatFixed(d, Number.isInteger(d) ? 0 : 1) })
}

/** Why a horizon is not projected, e.g. "Needs at least 7.5 days of history, 5 days available (demo rule)." */
export function historyNote(p: Prediction): string {
  return t('attention.forecast.historyNote', { need: spanText(p.horizonHours * FORECAST_HORIZONS.minHistoryRatio), have: spanText(p.historyHours ?? 0) })
}
