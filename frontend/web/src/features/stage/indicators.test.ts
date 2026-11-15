import { describe, expect, it } from 'vitest'
import type { MetricCode, MetricState, Status } from '../../types/domain'
import { summarizeIndicators } from './indicators'

const m = (metric: string, status: Status, current: number | null = 1) => ({ metric, status, current }) as unknown as MetricState
const of = (...list: MetricState[]) => Object.fromEntries(list.map((x) => [x.metric, x])) as Partial<Record<MetricCode, MetricState>>

describe('summarizeIndicators', () => {
  it('counts every indicator in range when all are normal', () => {
    const s = summarizeIndicators(of(m('HEART_RATE', 'LOW'), m('SPO2', 'LOW'), m('HRV', 'LOW')))
    expect(s).toMatchObject({ total: 3, ok: 3, flagged: 0, missing: 0 })
  })

  it('puts flagged indicators first, worst first, and normal ones last', () => {
    const s = summarizeIndicators(of(m('HEART_RATE', 'LOW'), m('SPO2', 'MODERATE'), m('HRV', 'CRITICAL'), m('SKIN_TEMP', 'NO_DATA', null)))
    expect(s.items.map((i) => i.status)).toEqual(['CRITICAL', 'MODERATE', 'NO_DATA', 'LOW'])
    expect(s).toMatchObject({ total: 4, ok: 1, flagged: 2, missing: 1 })
  })

  it('never counts a reading without a current value as normal', () => {
    const s = summarizeIndicators(of(m('HEART_RATE', 'LOW', null), m('SPO2', 'LOW')))
    expect(s.ok).toBe(1)
    expect(s.missing).toBe(1)
    expect(s.items[0]).toEqual({ metric: 'HEART_RATE', status: 'NO_DATA' })
  })

  it('is empty before the first evaluation', () => {
    expect(summarizeIndicators(undefined)).toMatchObject({ total: 0, ok: 0, flagged: 0, missing: 0 })
  })
})
