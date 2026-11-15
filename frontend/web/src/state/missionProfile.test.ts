import { describe, expect, it } from 'vitest'
import { useAppStore } from './store'

describe('store mission profile (v4)', () => {
  it('defaults to ISS, switches profile, keeps the scenario and follows the profile Earth link', () => {
    const s0 = useAppStore.getState()
    expect(s0.missionProfileId).toBe('ISS')
    s0.pause()
    s0.setScenario('PROGRESSIVE_FATIGUE')

    useAppStore.getState().setMissionProfile('MARS_TRANSIT')
    const s1 = useAppStore.getState()
    expect(s1.missionProfileId).toBe('MARS_TRANSIT')
    expect(s1.clock.scenarioId).toBe('PROGRESSIVE_FATIGUE')
    expect(s1.commProfileId).toBe('MARS_FAR')
    expect(s1.mission.commDelaySec).toBe(1320)
    expect(s1.mission.vehicle).toMatch(/deep space/)

    // the profile survives a scenario change; the same profile again is a no-op
    s1.setScenario('NOMINAL')
    const s2 = useAppStore.getState()
    expect(s2.missionProfileId).toBe('MARS_TRANSIT')
    s2.setMissionProfile('MARS_TRANSIT')
    expect(useAppStore.getState().health).toBe(s2.health)

    s2.setMissionProfile('ISS')
    expect(useAppStore.getState().commProfileId).toBe('ISS')
  })
})
