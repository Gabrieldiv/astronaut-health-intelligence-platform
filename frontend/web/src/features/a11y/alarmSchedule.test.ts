import { describe, expect, it } from 'vitest'
import type { Alert } from '../../types/domain'
import { createTracker, DEFAULT_ALARM_POLICY, freshAlerts, stepAlarm, type AlarmPolicy, type AlarmTracker } from './alarmSchedule'
import { EARCONS } from './earcons'

const SIM0 = 1_000_000

function alert(p: Partial<Alert> & { id: string }): Alert {
  return {
    astronautId: 'AST-01',
    severity: 'CRITICAL',
    title: 'Heart rate far above usual',
    detail: '',
    region: 'heart',
    metric: 'HEART_RATE',
    ruleId: 'R1',
    createdAt: SIM0 + 1000,
    acknowledgedAt: null,
    acknowledgedBy: null,
    ...p,
  }
}

/** Drives the schedule like the hook does and records what plays. */
function run(steps: { t: number; alerts: Alert[]; enabled?: boolean; epoch?: string; simNow?: number }[], policy: AlarmPolicy = DEFAULT_ALARM_POLICY, start?: AlarmTracker) {
  let tracker = start ?? createTracker('E1', SIM0)
  const played: { t: number; e: string }[] = []
  let last = null as ReturnType<typeof stepAlarm> | null
  for (const s of steps) {
    last = stepAlarm(tracker, { alerts: s.alerts, nowReal: s.t, simNow: s.simNow ?? SIM0 + s.t, epoch: s.epoch ?? 'E1', enabled: s.enabled ?? true, policy })
    tracker = last.tracker
    if (last.play) played.push({ t: s.t, e: last.play })
  }
  return { played, tracker, last: last! }
}

/** One step per second from `from` to `to` (inclusive) with the same alerts. */
const seconds = (from: number, to: number, alerts: Alert[], extra: { enabled?: boolean } = {}) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ t: (from + i) * 1000, alerts, ...extra }))

describe('alert sound schedule', () => {
  it('plays at once for a new critical alert, then repeats at the calm interval', () => {
    const a = alert({ id: 'a1' })
    const { played } = run(seconds(0, 70, [a]))
    expect(played).toEqual([
      { t: 0, e: 'CRITICAL' },
      { t: 30_000, e: 'CRITICAL' },
      { t: 60_000, e: 'CRITICAL' },
    ])
  })

  it('stops as soon as the alert is acknowledged', () => {
    const a = alert({ id: 'a1' })
    const acked = { ...a, acknowledgedAt: SIM0 + 5000, acknowledgedBy: 'crew' }
    const { played, last } = run([...seconds(0, 10, [a]), ...seconds(11, 120, [acked])])
    expect(played).toEqual([{ t: 0, e: 'CRITICAL' }])
    expect(last.ringing).toBe(0)
    expect(last.level).toBeNull()
  })

  it('stops when the alert resolves', () => {
    const a = alert({ id: 'a1' })
    const { played } = run([...seconds(0, 5, [a]), ...seconds(6, 100, [{ ...a, resolvedAt: SIM0 + 6000 }])])
    expect(played).toHaveLength(1)
  })

  it('escalates after the alert stays unacknowledged for a while', () => {
    const a = alert({ id: 'a1' })
    const { played } = run(seconds(0, 150, [a]))
    // 0, 30, 60, 90 s calm; at 120 s it escalates and plays at once, then every 15 s.
    expect(played.map((p) => p.t / 1000)).toEqual([0, 30, 60, 90, 120, 135, 150])
    expect(played.slice(0, 4).every((p) => p.e === 'CRITICAL')).toBe(true)
    expect(played.slice(4).every((p) => p.e === 'CRITICAL_ESCALATED')).toBe(true)
  })

  it('escalates at once when the engine escalates the alert', () => {
    const a = alert({ id: 'a1' })
    const { played } = run([...seconds(0, 10, [a]), ...seconds(11, 11, [{ ...a, escalationLevel: 1 }])])
    expect(played).toEqual([
      { t: 0, e: 'CRITICAL' },
      { t: 11_000, e: 'CRITICAL_ESCALATED' },
    ])
  })

  it('never rings for alerts replayed from before the page loaded', () => {
    const old = alert({ id: 'old', createdAt: SIM0 - 60_000 })
    const { played, last } = run(seconds(0, 200, [old]))
    expect(played).toEqual([])
    expect(last.ringing).toBe(0)
  })

  it('resets on a new scenario and ignores its replayed history', () => {
    const a = alert({ id: 'a1' })
    // The new scenario's history ends at sim 5e6: its alerts are older than that.
    const replay = alert({ id: 'a1', createdAt: 4_000_000 })
    const steps = [...seconds(0, 3, [a]), { t: 4000, alerts: [replay], epoch: 'E2', simNow: 5_000_000 }, { t: 40_000, alerts: [replay], epoch: 'E2', simNow: 5_040_000 }]
    const { played } = run(steps)
    expect(played).toEqual([{ t: 0, e: 'CRITICAL' }])
  })

  it('stays silent for HIGH alerts unless opted in, then uses the softer sound', () => {
    const h = alert({ id: 'h1', severity: 'HIGH' })
    expect(run(seconds(0, 200, [h])).played).toEqual([])
    const { played } = run(seconds(0, 130, [h]), { ...DEFAULT_ALARM_POLICY, includeHigh: true })
    expect(played).toEqual([
      { t: 0, e: 'HIGH' },
      { t: 120_000, e: 'HIGH' },
    ])
  })

  it('makes one sound for many alerts, decided by the most urgent', () => {
    const list = [alert({ id: 'h1', severity: 'HIGH' }), alert({ id: 'c1' }), alert({ id: 'c2' })]
    const { played } = run(seconds(0, 31, list), { ...DEFAULT_ALARM_POLICY, includeHigh: true })
    expect(played).toEqual([
      { t: 0, e: 'CRITICAL' },
      { t: 30_000, e: 'CRITICAL' },
    ])
  })

  it('keeps a minimum gap, then plays a waiting new alert', () => {
    const a = alert({ id: 'a1' })
    const b = alert({ id: 'b1', createdAt: SIM0 + 2000 })
    const { played } = run([{ t: 0, alerts: [a] }, { t: 1000, alerts: [a, b] }, { t: 2000, alerts: [a, b] }, { t: 3000, alerts: [a, b] }, { t: 4000, alerts: [a, b] }])
    expect(played).toEqual([
      { t: 0, e: 'CRITICAL' },
      { t: 3000, e: 'CRITICAL' },
    ])
  })

  it('plays nothing while sound is off, and rings at once when turned back on', () => {
    const a = alert({ id: 'a1' })
    const { played } = run([...seconds(0, 50, [a], { enabled: false }), { t: 51_000, alerts: [a], enabled: true }])
    expect(played).toEqual([{ t: 51_000, e: 'CRITICAL' }])
  })

  it('a re-raised alert with the same id but a new time counts as new', () => {
    const a = alert({ id: 'a1' })
    const again = alert({ id: 'a1', createdAt: SIM0 + 50_000 })
    const { played } = run([...seconds(0, 10, [a]), ...seconds(11, 12, [{ ...a, resolvedAt: SIM0 + 11_000 }]), { t: 13_000, alerts: [again] }])
    expect(played.map((p) => p.t)).toEqual([0, 13_000])
  })
})

describe('earcons', () => {
  it('each severity has its own pattern', () => {
    const sig = (k: keyof typeof EARCONS) => JSON.stringify(EARCONS[k])
    expect(new Set([sig('HIGH'), sig('CRITICAL'), sig('CRITICAL_ESCALATED')]).size).toBe(3)
    expect(EARCONS.HIGH).toHaveLength(3)
    expect(EARCONS.CRITICAL).toHaveLength(5)
    expect(EARCONS.CRITICAL_ESCALATED.length).toBeGreaterThan(EARCONS.CRITICAL.length)
  })

  it('keeps every tone short and quiet enough', () => {
    for (const tones of Object.values(EARCONS)) {
      for (const t of tones) {
        expect(t.dur).toBeLessThanOrEqual(0.3)
        expect(t.gain).toBeLessThanOrEqual(0.2)
      }
    }
  })
})

describe('fresh alerts for announcements', () => {
  it('returns only new open alerts of the asked severities, most urgent first, skipping history', () => {
    const list = [
      alert({ id: 'old', createdAt: SIM0 - 1 }),
      alert({ id: 'h1', severity: 'HIGH', createdAt: SIM0 + 5 }),
      alert({ id: 'm1', severity: 'MODERATE' }),
      alert({ id: 'c1', createdAt: SIM0 + 2 }),
      alert({ id: 'ack', acknowledgedAt: SIM0 + 9 }),
    ]
    const first = freshAlerts(new Set(), list, SIM0, ['CRITICAL', 'HIGH'])
    expect(first.fresh.map((a) => a.id)).toEqual(['c1', 'h1'])
    const second = freshAlerts(first.known, list, SIM0, ['CRITICAL', 'HIGH'])
    expect(second.fresh).toEqual([])
  })
})
