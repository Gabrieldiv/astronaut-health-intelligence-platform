import { useMemo } from 'react'
import { create } from 'zustand'
import { assessSpaceWeather, type SpaceWeatherAdvisory } from '../../engine/missions'
import { loadSpaceWeather } from '../../lib/nasa/spaceWeather'
import { useAppStore } from '../../state/store'
import type { SpaceWeatherSnapshot } from '../../types/nasa'

/**
 * UI-only holder for the NASA DONKI snapshot (REAL_PUBLIC context, never crew telemetry).
 * Loaded once on demand; a failure leaves the advisory in NO_DATA (never "all clear").
 */
interface SpaceWeatherUi {
  status: 'idle' | 'loading' | 'ready' | 'error'
  snapshot: SpaceWeatherSnapshot | null
  load: () => void
}

export const useSpaceWeatherUi = create<SpaceWeatherUi>()((set, get) => ({
  status: 'idle',
  snapshot: null,
  load: () => {
    if (get().status === 'loading' || get().status === 'ready') return
    set({ status: 'loading' })
    loadSpaceWeather()
      .then((snapshot) => set({ status: 'ready', snapshot }))
      .catch(() => set({ status: 'error', snapshot: null }))
  },
}))

/** Advisory for the active mission profile. */
export function useSpaceWeatherAdvisory(): SpaceWeatherAdvisory {
  const snapshot = useSpaceWeatherUi((s) => s.snapshot)
  const profileId = useAppStore((s) => s.missionProfileId)
  return useMemo(() => assessSpaceWeather(snapshot, profileId), [snapshot, profileId])
}
