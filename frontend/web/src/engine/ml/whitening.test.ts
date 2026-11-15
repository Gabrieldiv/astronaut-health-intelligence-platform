import { describe, expect, it } from 'vitest'
import { Rng } from '../random'
import { fitWhitening, symmetricEigen, whiten } from './whitening'

describe('PCA whitening', () => {
  it('finds the eigenvalues of a symmetric matrix', () => {
    const { values, vectors } = symmetricEigen(Float64Array.from([2, 1, 1, 2]), 2)
    expect([...values].sort()).toEqual([expect.closeTo(1, 9), expect.closeTo(3, 9)])
    // A v = lambda v for the first eigenvector (column 0).
    const v0 = [vectors[0]!, vectors[2]!]
    expect(2 * v0[0]! + v0[1]!).toBeCloseTo(values[0]! * v0[0]!, 9)
  })

  it('decorrelates correlated features to unit variance', () => {
    const r = new Rng(3)
    const n = 2000
    const data = new Float64Array(n * 2)
    for (let i = 0; i < n; i++) {
      const u = r.normal()
      data[2 * i] = 2 * u + 1
      data[2 * i + 1] = u + 0.3 * r.normal()
    }
    const w = fitWhitening(data, n, 2, 1e-9)
    const out = new Float64Array(2)
    let s00 = 0
    let s11 = 0
    let s01 = 0
    for (let i = 0; i < n; i++) {
      whiten(w, data, 2 * i, out)
      s00 += out[0]! ** 2
      s11 += out[1]! ** 2
      s01 += out[0]! * out[1]!
    }
    expect(s00 / (n - 1)).toBeCloseTo(1, 6)
    expect(s11 / (n - 1)).toBeCloseTo(1, 6)
    expect(s01 / (n - 1)).toBeCloseTo(0, 6)
  })

  it('floors tiny variances so a redundant pair does not explode', () => {
    const data = Float64Array.from([0, 0, 1, 1, 2, 2, 3, 3])
    const w = fitWhitening(data, 4, 2, 0.05)
    const out = whiten(w, [1.5, 1.6], 0, new Float64Array(2))
    for (const v of out) expect(Math.abs(v)).toBeLessThan(1)
  })
})
