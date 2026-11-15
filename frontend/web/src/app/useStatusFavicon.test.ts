import { describe, expect, it } from 'vitest'
import type { Alert } from '../types/domain'
import { alertFaviconUrl, hasOpenCritical } from './useStatusFavicon'

const alert = (over: Partial<Alert>): Alert => ({
  id: 'a',
  astronautId: 'x',
  severity: 'CRITICAL',
  title: '',
  detail: '',
  region: null,
  metric: null,
  ruleId: 'r',
  createdAt: 0,
  acknowledgedAt: null,
  acknowledgedBy: null,
  ...over,
})

describe('status favicon', () => {
  it('shows the dot only for an open CRITICAL alert', () => {
    expect(hasOpenCritical([])).toBe(false)
    expect(hasOpenCritical([alert({ severity: 'HIGH' })])).toBe(false)
    expect(hasOpenCritical([alert({ acknowledgedAt: 5 })])).toBe(false)
    expect(hasOpenCritical([alert({ resolvedAt: 5 })])).toBe(false)
    expect(hasOpenCritical([alert({ acknowledgedAt: 5 }), alert({ id: 'b' })])).toBe(true)
  })
  it('builds an SVG data URL with the red dot', () => {
    const url = alertFaviconUrl()
    expect(url.startsWith('data:image/svg+xml,')).toBe(true)
    expect(decodeURIComponent(url)).toContain('#ef4444')
  })
})
