import { describe, expect, it } from 'vitest'
import type { MetricCode } from '../../types/domain'
import { MULTIVARIATE, MULTIVARIATE_MODEL_VERSION } from '../config'
import { Rng } from '../random'
import { HOUR_MS, MIN_MS } from '../text'
import { ML_LABEL, MultivariateDetector, deviationContributions, type MultivariateSettings } from './multivariate'

const FEATURES: MetricCode[] = ['HEART_RATE', 'RESPIRATORY_RATE', 'SKIN_TEMPERATURE']
const CFG: MultivariateSettings = { ...MULTIVARIATE, features: FEATURES, windowSize: 1200, minTrainingVectors: 200 }
const T0 = Date.parse('2026-11-01T00:00:00Z')
const NO_DRIFT = [0, 0, 0]

/**
 * Synthetic person: heart rate and breathing rate move TOGETHER (shared factor u), skin
 * temperature is independent. Every value stays inside the training gates.
 */
function trained(seed = 5): MultivariateDetector {
  const d = new MultivariateDetector('AST-T', seed, CFG)
  const r = new Rng(seed)
  while (d.size < 1200) {
    const u = r.normal()
    d.offer([u + 0.25 * r.normal(), u + 0.25 * r.normal(), r.normal()], NO_DRIFT)
  }
  d.train(T0)
  return d
}

describe('MultivariateDetector (experimental, machine learning)', () => {
  it('is NOT_READY before training and never calls missing inputs typical', () => {
    const d = new MultivariateDetector('AST-T', 1, CFG)
    expect(d.assess(T0, [0, 0, 0], NO_DRIFT).state).toBe('NOT_READY')
    expect(d.maybeTrain(T0, 1)).toBe(false) // not enough vectors
    const t = trained()
    const a = t.assess(T0, [0, null, 0], NO_DRIFT)
    expect(a.state).toBe('NO_DATA')
    expect(a.flagged).toBe(false)
    expect(a.explanation).toMatch(/no current data for breathing rate.*never treated as typical/)
  })

  it('keeps unusual moments out of the training window (same gates as the baseline)', () => {
    const d = new MultivariateDetector('AST-T', 1, CFG)
    expect(d.offer([0, 4, 0], NO_DRIFT)).toBe(false)
    expect(d.offer([0, 0, 0], [0, 1.2, 0])).toBe(false)
    expect(d.offer([0, null, 0], NO_DRIFT)).toBe(false)
    expect(d.offer([0.5, 0.4, -1], NO_DRIFT)).toBe(true)
    expect(d.size).toBe(1)
  })

  it('is deterministic: same data and seed give the same model, threshold and scores', () => {
    const a = trained(11)
    const b = trained(11)
    const x = [1.4, -1.4, 0.2]
    expect(a.score(x)).toBe(b.score(x))
    expect(a.threshold).toBe(b.threshold)
    expect(a.assess(T0, x, NO_DRIFT)).toEqual(b.assess(T0, x, NO_DRIFT))
  })

  it('learns which signals move together: the same sizes in an unusual combination score higher', () => {
    const d = trained()
    const together = d.score([1.8, 1.8, 0])!
    const apart = d.score([1.8, -1.8, 0])!
    expect(apart).toBeGreaterThan(together)
    expect(apart).toBeGreaterThanOrEqual(d.threshold!)
    expect(together).toBeLessThan(d.threshold!)
    expect(d.assess(T0, [1.8, 1.8, 0], NO_DRIFT).state).toBe('TYPICAL')
    // Each value alone is within about 2 robust SD: no univariate rule would fire on it.
  })

  it('flags "Unusual combination" only when it persists AND the drift (persistence) rules agree', () => {
    const d = trained()
    const x = [2.2, -2.2, 0.1]
    const agree = [0.9, -0.8, 0]
    const first = d.assess(T0, x, agree)
    expect(first.state).toBe('ELEVATED')
    expect(first.flagged).toBe(false)
    // Lasting but the slower trend rules do not agree: still not flagged.
    const noAgree = d.assess(T0 + 40 * MIN_MS, x, [0.1, -0.1, 0])
    expect(noAgree.flagged).toBe(false)
    const flagged = d.assess(T0 + 45 * MIN_MS, x, agree)
    expect(flagged.state).toBe('UNUSUAL')
    expect(flagged.flagged).toBe(true)
    expect(flagged.since).toBe(T0)
    expect(flagged.model_version).toBe(MULTIVARIATE_MODEL_VERSION)
    expect(flagged.label).toBe(ML_LABEL)
    expect(flagged.explanation).toMatch(/^Unusual combination: heart rate above your normal and breathing rate below your normal at the same time for 45 min/)
    expect(flagged.explanation).toMatch(/Signals that contributed most: (heart rate|breathing rate) \d+%, (heart rate|breathing rate) \d+%/)
    // Back to a usual combination: the episode ends.
    expect(d.assess(T0 + HOUR_MS, [0.1, 0.1, 0], NO_DRIFT).state).toBe('TYPICAL')
    expect(d.assess(T0 + HOUR_MS + MIN_MS, x, agree).state).toBe('ELEVATED')
  })

  it('retrains only when the baseline changed and the minimum interval passed', () => {
    const d = trained()
    expect(d.trainings).toBe(1)
    expect(d.maybeTrain(T0 + 7 * HOUR_MS, 3)).toBe(true) // revision changed, 7 h later
    expect(d.maybeTrain(T0 + 8 * HOUR_MS, 4)).toBe(false) // too soon
    expect(d.maybeTrain(T0 + 20 * HOUR_MS, 4)).toBe(true)
    expect(d.maybeTrain(T0 + 40 * HOUR_MS, 4)).toBe(false) // nothing changed
    expect(d.trainings).toBe(3)
  })
})

describe('deviationContributions', () => {
  it('splits the squared deviation between signals, largest first', () => {
    const c = deviationContributions(FEATURES, [3, -1, 0])
    expect(c.map((x) => x.metric)).toEqual(['HEART_RATE', 'RESPIRATORY_RATE', 'SKIN_TEMPERATURE'])
    expect(c[0]!.share).toBeCloseTo(0.9, 9)
    expect(c[1]!.z).toBe(-1)
    expect(c.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1, 9)
    expect(deviationContributions(FEATURES, [0, 0, 0]).every((x) => x.share === 0)).toBe(true)
  })
})
