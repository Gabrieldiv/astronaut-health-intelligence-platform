import { describe, expect, it } from 'vitest'
import { HealthEngine } from './engine'
import { MIN_MS } from './text'

/** Advance in fixed steps, evaluating after each (like the store does). */
function run(e: HealthEngine, minutes: number, stepMin = 1): void {
  const end = e.simTime + minutes * MIN_MS
  while (e.simTime < end) {
    e.advanceTo(Math.min(end, e.simTime + stepMin * MIN_MS))
    e.evaluate()
  }
}

const BIO = 'DEV-BIO-AST-01'
const sensorAlarm = (e: HealthEngine) => e.alerts.some((a) => a.ruleId.startsWith('R-DQ') && a.resolvedAt == null)

describe('device pause and resume (operator action)', () => {
  it('a paused device emits nothing and reads PAUSED in the device list', () => {
    const e = new HealthEngine({ scenarioId: 'NOMINAL' })
    expect(e.setDevicePaused(BIO, true)).toBe(true)
    e.evaluate()
    const d = e.devices.find((x) => x.id === BIO)!
    expect(d.state).toBe('PAUSED')
    expect(d.pausedAt).toBe(e.simTime)
    expect(d.detail).toMatch(/Paused by operator/)
    const before = e.tracker('AST-01', 'HEART_RATE').lastValidT
    run(e, 30)
    expect(e.tracker('AST-01', 'HEART_RATE').lastValidT).toBe(before)
    // other devices keep streaming
    expect(e.tracker('AST-01', 'ACTIVITY_LEVEL').lastValidT).toBe(e.simTime)
    // a second pause is a no-op
    expect(e.setDevicePaused(BIO, true)).toBe(false)
  })

  it('its metrics become NO_DATA with "Paused by operator", never normal, and raise no sensor failure alarm', () => {
    const e = new HealthEngine({ scenarioId: 'NOMINAL' })
    const anomaliesBefore = e.anomalies.length
    e.setDevicePaused(BIO, true)
    run(e, 60)
    const hr = e.health['AST-01']!.metrics.HEART_RATE!
    expect(hr.status).toBe('NO_DATA')
    expect(hr.current).toBeNull()
    expect(hr.explanation).toMatch(/Paused by operator/)
    expect(e.health['AST-01']!.metrics.SPO2!.status).toBe('NO_DATA')
    expect(e.health['AST-01']!.regions.heart.status).toBe('NO_DATA')
    expect(sensorAlarm(e)).toBe(false)
    expect(e.health['AST-01']!.risk.headline).not.toMatch(/not sending data/)
    expect(e.anomalies.slice(0, e.anomalies.length - anomaliesBefore).some((a) => a.astronautId === 'AST-01' && a.method === 'DATA_QUALITY')).toBe(false)
    // another astronaut is not affected
    expect(e.health['AST-02']!.metrics.HEART_RATE!.status).not.toBe('NO_DATA')
  })

  it('records pause and resume in the audit trail', () => {
    const e = new HealthEngine({ scenarioId: 'NOMINAL' })
    e.setDevicePaused(BIO, true, 'flight controller')
    run(e, 20)
    e.setDevicePaused(BIO, false, 'flight controller')
    const [resumed, paused] = e.audit.filter((a) => a.action === 'DEVICE_PAUSED' || a.action === 'DEVICE_RESUMED')
    expect(paused!.action).toBe('DEVICE_PAUSED')
    expect(paused!.actor).toBe('flight controller')
    expect(paused!.detail).toMatch(/Bio-Monitor shirt paused by operator/)
    expect(resumed!.action).toBe('DEVICE_RESUMED')
    expect(resumed!.detail).toMatch(/resumed by operator after 20 min/)
  })

  it('resume restores the stream without a false alarm and without backfilling the pause', () => {
    const e = new HealthEngine({ scenarioId: 'NOMINAL' })
    e.setDevicePaused(BIO, true)
    run(e, 90)
    const resumeAt = e.simTime
    e.setDevicePaused(BIO, false)
    e.evaluate()
    // Right after the resume, before the first reading: still no data, but not a sensor failure.
    expect(e.devices.find((x) => x.id === BIO)!.state).toBe('ONLINE')
    expect(e.health['AST-01']!.metrics.HEART_RATE!.status).toBe('NO_DATA')
    expect(sensorAlarm(e)).toBe(false)
    run(e, 5)
    const hr = e.health['AST-01']!.metrics.HEART_RATE!
    expect(hr.status).not.toBe('NO_DATA')
    expect(hr.current).not.toBeNull()
    expect(sensorAlarm(e)).toBe(false)
    // The paused window stays a gap in the history (no invented values).
    const gap = e.history['AST-01']!.HEART_RATE!.filter((p) => p.t > resumeAt - 60 * MIN_MS && p.t < resumeAt)
    expect(gap.length).toBeGreaterThan(0)
    expect(gap.every((p) => p.v === null)).toBe(true)
  })

  it('a real failure after a resume is still reported', () => {
    const e = new HealthEngine({ scenarioId: 'SENSOR_FAILURE' })
    e.setDevicePaused('DEV-BIO-AST-03', true)
    run(e, 30)
    e.setDevicePaused('DEV-BIO-AST-03', false)
    // the scenario takes the shirt offline: once the grace is over the usual data quality rule applies
    run(e, 6 * 60, 5)
    const hr = e.health['AST-03']!.metrics.HEART_RATE!
    expect(hr.status).toBe('NO_DATA')
    expect(hr.explanation ?? '').not.toMatch(/Paused by operator/)
    expect(e.alerts.some((a) => a.astronautId === 'AST-03' && a.ruleId === 'R-DQ-01')).toBe(true)
  })

  it('ignores unknown and unlisted devices', () => {
    const e = new HealthEngine({ scenarioId: 'NOMINAL' })
    expect(e.setDevicePaused('NOPE', true)).toBe(false)
    expect(e.setDevicePaused('APP-RST-AST-01', true)).toBe(false)
  })
})
