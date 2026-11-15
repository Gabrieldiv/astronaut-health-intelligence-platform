import { describe, expect, it } from 'vitest'
import type { MetricCode, MetricState, Status } from '../../types/domain'
import { groupIndicators } from './indicators'

const state = (metric: MetricCode, status: Status, current: number | null = 1) => ({ metric, status, current }) as MetricState

describe('groupIndicators', () => {
  it('groups indicators by body system and counts every one of them', () => {
    const groups = groupIndicators({
      HEART_RATE: state('HEART_RATE', 'LOW'),
      SYSTOLIC_BP: state('SYSTOLIC_BP', 'LOW'),
      SPO2: state('SPO2', 'LOW'),
    })
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(3)
    expect(groups.map((g) => g.key).sort()).toEqual(['heart', 'lungs'])
  })

  it('puts the group with the most urgent indicator first and keeps missing data out of the normal ones', () => {
    const groups = groupIndicators({
      HEART_RATE: state('HEART_RATE', 'LOW'),
      SPO2: state('SPO2', 'HIGH'),
      RESPIRATORY_RATE: state('RESPIRATORY_RATE', 'LOW', null),
    })
    expect(groups[0]!.key).toBe('lungs')
    const lungs = groups[0]!.items
    expect(lungs.find((i) => i.metric === 'RESPIRATORY_RATE')!.status).toBe('NO_DATA')
  })

  it('is empty without metrics', () => {
    expect(groupIndicators(undefined)).toEqual([])
  })
})
