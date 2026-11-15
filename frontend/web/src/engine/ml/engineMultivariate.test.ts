import { describe, expect, it } from 'vitest'
import { HealthEngine } from '../engine'
import { MULTIVARIATE_MODEL_VERSION } from '../config'
import { MIN_MS } from '../text'
import { ML_LABEL } from './multivariate'

function run(e: HealthEngine, minutes: number, stepMin: number, onEval?: () => void): void {
  const end = e.simTime + minutes * MIN_MS
  while (e.simTime < end) {
    e.advanceTo(Math.min(end, e.simTime + stepMin * MIN_MS))
    e.evaluate()
    onEval?.()
  }
}

describe('engine: experimental multivariate detector', () => {
  it('trains on the pre-generated history and stays quiet on a nominal day', () => {
    const e = new HealthEngine({ scenarioId: 'NOMINAL' })
    for (const h of Object.values(e.health)) {
      expect(h.multivariate!.state).not.toBe('NOT_READY')
      expect(h.multivariate!.training_size).toBeGreaterThanOrEqual(288)
      expect(h.multivariate!.model_version).toBe(MULTIVARIATE_MODEL_VERSION)
      expect(h.multivariate!.label).toBe(ML_LABEL)
    }
    let flags = 0
    run(e, 12 * 60, 15, () => {
      for (const h of Object.values(e.health)) if (h.multivariate!.flagged) flags++
    })
    expect(flags).toBe(0)
  })

  it('flags the acute scenario as an unusual combination without touching the risk score', () => {
    const e = new HealthEngine({ scenarioId: 'ACUTE_CARDIO' })
    run(e, 60, 5)
    const h = e.health['AST-01']!
    const mv = h.multivariate!
    expect(mv.flagged).toBe(true)
    expect(mv.explanation).toMatch(/^Unusual combination: heart rate above your normal/)
    expect(mv.contributions[0]!.metric).toBe('HEART_RATE')
    expect(e.audit.some((a) => /Experimental multivariate detector .* Informational only/.test(a.detail))).toBe(true)
    // The flag is not a rule hit: no factor, no rule id, the risk score comes from the rules only.
    expect(h.risk.contributing_factors.some((f) => /Unusual combination/.test(f.label))).toBe(false)
    expect(h.risk.triggered_rules.every((r) => r.startsWith('R-'))).toBe(true)
    // Other crew members stay unflagged.
    expect(e.health['AST-02']!.multivariate!.flagged).toBe(false)
  })

  it('reports NO_DATA (never typical) when the shirt stops sending', () => {
    const e = new HealthEngine({ scenarioId: 'SENSOR_FAILURE' })
    run(e, 30, 5)
    const mv = e.health['AST-03']!.multivariate!
    expect(mv.state).toBe('NO_DATA')
    expect(mv.flagged).toBe(false)
    expect(mv.score).toBeNull()
  })
})
