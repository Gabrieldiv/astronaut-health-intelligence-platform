import { describe, expect, it } from 'vitest'
import { Rng } from '../random'
import { IsolationForest, averagePathLength } from './isolationForest'

function gaussian(n: number, dims: number, seed: number): Float64Array {
  const r = new Rng(seed)
  const out = new Float64Array(n * dims)
  for (let i = 0; i < out.length; i++) out[i] = r.normal()
  return out
}

describe('IsolationForest', () => {
  it('uses the standard normalization c(n)', () => {
    expect(averagePathLength(1)).toBe(0)
    expect(averagePathLength(2)).toBe(1)
    // c(256) = 2 (ln 255 + gamma) - 2 x 255 / 256, about 10.24
    expect(averagePathLength(256)).toBeCloseTo(10.2448, 3)
  })

  it('is deterministic for the same data and seed, and changes with the seed', () => {
    const data = gaussian(600, 4, 1)
    const opts = { trees: 50, sampleSize: 128, seed: 42 }
    const a = new IsolationForest(data, 600, 4, opts)
    const b = new IsolationForest(data, 600, 4, opts)
    const c = new IsolationForest(data, 600, 4, { ...opts, seed: 43 })
    const x = [0.3, -1.2, 2.1, 0]
    expect(a.score(x)).toBe(b.score(x))
    expect(a.score(x)).not.toBe(c.score(x))
  })

  it('scores far points higher than typical points', () => {
    const data = gaussian(1000, 3, 7)
    const f = new IsolationForest(data, 1000, 3, { trees: 100, sampleSize: 256, seed: 1 })
    const typical = f.score([0, 0, 0])
    const far = f.score([4, -4, 4])
    expect(typical).toBeLessThan(0.5)
    expect(far).toBeGreaterThan(0.6)
    expect(far).toBeGreaterThan(typical)
  })

  it('scores a row inside a flat buffer through the offset', () => {
    const data = gaussian(300, 2, 3)
    const f = new IsolationForest(data, 300, 2, { trees: 20, sampleSize: 64, seed: 9 })
    expect(f.score(data, 2 * 10)).toBe(f.score([data[20]!, data[21]!]))
  })

  it('handles constant features and refuses too little data', () => {
    const flat = new Float64Array(200).fill(1)
    const f = new IsolationForest(flat, 100, 2, { trees: 10, sampleSize: 64, seed: 1 })
    expect(Number.isFinite(f.score([1, 1]))).toBe(true)
    expect(() => new IsolationForest(new Float64Array(2), 1, 2, { trees: 10, sampleSize: 64, seed: 1 })).toThrow()
  })
})
