import { describe, expect, it } from 'vitest'
import { IDLE_MS, shouldAutoRotate, type AutoRotateInput } from './autoRotate'

const base: AutoRotateInput = { enabled: true, flying: false, selected: false, hovering: false, now: 10_000, lastInteraction: -Infinity }

describe('idle auto rotate', () => {
  it('turns when idle and enabled', () => {
    expect(shouldAutoRotate(base)).toBe(true)
    expect(shouldAutoRotate({ ...base, enabled: false })).toBe(false)
  })
  it('stops during a drag and resumes 3 s after the last interaction', () => {
    expect(IDLE_MS).toBe(3000)
    expect(shouldAutoRotate({ ...base, lastInteraction: Infinity })).toBe(false)
    expect(shouldAutoRotate({ ...base, lastInteraction: base.now - 2999 })).toBe(false)
    expect(shouldAutoRotate({ ...base, lastInteraction: base.now - 3001 })).toBe(true)
  })
  it('stays stopped while something is selected, hovered or the camera flies', () => {
    expect(shouldAutoRotate({ ...base, selected: true })).toBe(false)
    expect(shouldAutoRotate({ ...base, hovering: true })).toBe(false)
    expect(shouldAutoRotate({ ...base, flying: true })).toBe(false)
  })
})
