import { create } from 'zustand'
import type { CommMessage, CommProfile, CommProfileId } from '../../types/domain'
import { formatFixed, t, translatedRecord } from '../../i18n'

export const PROFILE_SHORT: Record<CommProfileId, string> = translatedRecord(['ISS', 'MOON', 'MARS_NEAR', 'MARS_FAR'] as const, (k) => t(`comms.profileShort.${k}`))

/** One way light time as a short label: "0.5 s", "1.3 s", "4 min", "22 min". */
export function formatDelay(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '--'
  if (sec < 10) return t('comms.unit.s', { n: formatFixed(sec, 1) })
  if (sec < 90) return t('comms.unit.s', { n: Math.round(sec) })
  const min = sec / 60
  if (min < 10) {
    const v = Math.round(min * 10) / 10
    return t('comms.unit.min', { n: formatFixed(v, Number.isInteger(v) ? 0 : 1) })
  }
  return t('comms.unit.min', { n: Math.round(min) })
}

/** Remaining duration as "12 min 30 s", "3 min", "45 s". */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  if (s < 60) return t('comms.unit.s', { n: s })
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return t('comms.unit.hMin', { h, m: m % 60 })
  }
  return r && m < 10 ? t('comms.unit.minS', { m, s: r }) : t('comms.unit.min', { n: m })
}

/** Plain explanation of what the delay means for decisions. */
export function delayMeaning(p: CommProfile): string {
  const rt = p.oneWayDelaySec * 2
  if (rt < 5) return t('comms.meaning.near', { delay: formatDelay(Math.max(1, rt)) })
  return t('comms.meaning.far', { delay: formatDelay(rt) })
}

export function isInTransit(m: CommMessage, simNow: number): boolean {
  return m.status === 'IN_TRANSIT' && simNow < m.arrivesAt
}

export const COMM_KIND_LABEL: Record<CommMessage['kind'], string> = translatedRecord(
  ['HEALTH_PACKET', 'CONSULT_REQUEST', 'GROUND_REPLY', 'HANDOVER_REPORT'] as const,
  (k) => t(`comms.kind.${k}`),
)

/** UI-only state so other features (timeline markers) can open the comms drawer. */
export const useCommsUi = create<{ open: boolean; setOpen: (open: boolean) => void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
