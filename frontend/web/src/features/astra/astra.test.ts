import { describe, expect, it } from 'vitest'
import { ASTRA_LAST_DAY, astraRequestDays } from './api'

describe('astraRequestDays', () => {
  it('sends the pre flight baseline and the mission up to the given day', () => {
    const { days, capped } = astraRequestDays(44, 'AST-01')
    expect(capped).toBe(false)
    expect(days[0]!.phase).toBe('PRE_FLIGHT')
    expect(days.at(-1)!.date).toBe('2026-11-13')
    expect(days.filter((d) => d.phase === 'IN_FLIGHT')).toHaveLength(44)
  })

  it('stops at the last day of the virtual history and says so', () => {
    const { days, capped } = astraRequestDays(ASTRA_LAST_DAY + 30, 'AST-02')
    expect(capped).toBe(true)
    expect(days.filter((d) => d.phase === 'IN_FLIGHT')).toHaveLength(ASTRA_LAST_DAY)
  })

  it('sends only date, phase and values (the API rejects extra fields)', () => {
    for (const id of ['AST-01', 'AST-02', 'AST-03', 'AST-04']) {
      const { days } = astraRequestDays(50, id)
      expect(days.length).toBeGreaterThan(40)
      for (const d of days) expect(Object.keys(d).sort()).toEqual(['date', 'phase', 'values'])
    }
  })

  it('applies the active scenario only to the astronaut and days it changes', () => {
    const calm = astraRequestDays(50, 'AST-02').days
    const fatigue = astraRequestDays(50, 'AST-02', 'PROGRESSIVE_FATIGUE').days
    expect(fatigue).toHaveLength(calm.length)
    expect(fatigue.slice(0, 40)).toEqual(calm.slice(0, 40))
    expect(fatigue.at(-1)!.values).not.toEqual(calm.at(-1)!.values)
    expect(astraRequestDays(50, 'AST-01', 'PROGRESSIVE_FATIGUE').days).toEqual(astraRequestDays(50, 'AST-01').days)
    expect(astraRequestDays(50, 'AST-02', 'PERFORMANCE_DECLINE').days).toEqual(calm)
  })

  it('returns no days for an unknown astronaut', () => {
    expect(astraRequestDays(10, 'AST-99').days).toEqual([])
  })
})
