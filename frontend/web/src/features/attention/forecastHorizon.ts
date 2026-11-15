import { create } from 'zustand'
import type { ForecastHorizonHours, Prediction } from '../../types/domain'
import { FORECAST_HORIZONS } from '../../engine/config'
import { fmtSpan, horizonLabel } from '../../engine/forecast'

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
  if (!p.eligible) return p.ineligibleReason === 'HISTORY_TOO_SHORT' ? 'Not enough history for this horizon' : 'Not enough data to forecast yet'
  if (p.hoursToBandExit != null) {
    const h = p.hoursToBandExit
    return `Projected to leave your normal range in ${h >= 48 ? `~${Math.round(h / 24)} days` : formatHours(h)}`
  }
  const known = (FORECAST_HORIZONS.options as readonly number[]).includes(p.horizonHours)
  return `Stable over the next ${known ? horizonLabel(p.horizonHours as ForecastHorizonHours) : `${p.horizonHours} h`}`
}

/** Why a horizon is not projected, e.g. "Needs at least 7.5 days of history, 5 days available (demo rule)." */
export function historyNote(p: Prediction): string {
  return `Needs at least ${fmtSpan(p.horizonHours * FORECAST_HORIZONS.minHistoryRatio)} of history, ${fmtSpan(p.historyHours ?? 0)} available (demo rule).`
}
