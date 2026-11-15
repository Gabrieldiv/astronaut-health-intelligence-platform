import { describe, expect, it } from 'vitest'
import type { AtlasStructure } from '../atlas/types'
import { DEFAULT_INTERACTION_MODE, INTERACTION_MODE_KEY, isInteractive, readInteractionMode, writeInteractionMode } from './interaction'

const s = (id: string, system: AtlasStructure['system'], tissue: AtlasStructure['tissue']) => ({ id, system, tissue }) as AtlasStructure

function memoryStorage(init: Record<string, string> = {}) {
  const data = new Map(Object.entries(init))
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data }
}

describe('isInteractive', () => {
  const heart = s('heart', 'cardiovascular', 'heart')
  const stomach = s('stomach', 'digestive', 'gut')
  const tooth = s('tooth-1', 'skeletal', 'tooth')
  const nerve = s('sciatic-nerve-left', 'nervous', 'nerve')

  it('Monitor: only structures of a monitored region react', () => {
    expect(isInteractive(heart, 'monitor')).toBe(true)
    expect(isInteractive(stomach, 'monitor')).toBe(false)
    expect(isInteractive(tooth, 'monitor')).toBe(false)
    expect(isInteractive(nerve, 'monitor')).toBe(false)
  })

  it('Explore: every structure reacts', () => {
    for (const x of [heart, stomach, tooth, nerve]) expect(isInteractive(x, 'explore')).toBe(true)
  })
})

describe('interaction mode storage', () => {
  it('defaults to Monitor', () => {
    expect(DEFAULT_INTERACTION_MODE).toBe('monitor')
    expect(readInteractionMode(memoryStorage())).toBe('monitor')
    expect(readInteractionMode(null)).toBe('monitor')
  })

  it('round trips and ignores unknown values', () => {
    const st = memoryStorage()
    writeInteractionMode('explore', st)
    expect(st.data.get(INTERACTION_MODE_KEY)).toBe('explore')
    expect(readInteractionMode(st)).toBe('explore')
    expect(readInteractionMode(memoryStorage({ [INTERACTION_MODE_KEY]: 'weird' }))).toBe('monitor')
  })

  it('never throws when storage is blocked', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(readInteractionMode(blocked)).toBe('monitor')
    expect(() => writeInteractionMode('explore', blocked)).not.toThrow()
  })
})
