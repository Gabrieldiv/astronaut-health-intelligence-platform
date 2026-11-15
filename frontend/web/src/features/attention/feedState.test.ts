import { describe, expect, it } from 'vitest'
import { useAppStore } from '../../state/store'
import { metricFeedState, pausedFeeders } from './feedState'

const BIO = 'DEV-BIO-AST-01'
const feed = () => {
  const s = useAppStore.getState()
  return metricFeedState(s.health['AST-01']!.metrics.HEART_RATE, s.devices, 'AST-01', 'HEART_RATE')
}

describe('metric feed state in the body system detail (pause and resume)', () => {
  it('reads Paused (not Signal lost) while paused, Waiting during the resume grace, then Live', () => {
    const s = useAppStore.getState()
    s.pause()
    expect(feed()).toBe('LIVE')

    s.setDevicePaused(BIO, true, 'operator')
    // The metric itself is NO_DATA: the old detail derived "Signal lost" from that alone.
    expect(useAppStore.getState().health['AST-01']!.metrics.HEART_RATE!.status).toBe('NO_DATA')
    expect(feed()).toBe('PAUSED')
    expect(pausedFeeders(useAppStore.getState().devices, 'AST-01', ['HEART_RATE', 'SPO2']).map((d) => d.id)).toEqual([BIO])

    useAppStore.getState().fastForward(20 * 60_000)
    expect(feed()).toBe('PAUSED')

    useAppStore.getState().setDevicePaused(BIO, false, 'operator')
    // Resumed, no reading yet: waiting, never "Signal lost".
    expect(feed()).toBe('WAITING')
    expect(pausedFeeders(useAppStore.getState().devices, 'AST-01', ['HEART_RATE'])).toEqual([])

    for (let i = 0; i < 5; i++) useAppStore.getState().fastForward(60_000)
    expect(feed()).toBe('LIVE')
    expect(useAppStore.getState().health['AST-01']!.metrics.HEART_RATE!.current).not.toBeNull()
  })

  it('a missing reading with no healthy device behind it stays Signal lost', () => {
    expect(metricFeedState(undefined, [], 'AST-01', 'HEART_RATE')).toBe('LOST')
  })
})
