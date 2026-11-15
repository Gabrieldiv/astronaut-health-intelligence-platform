import { describe, expect, it } from 'vitest'
import { ATLAS_RETRY, RetryError, backoffDelay, errorReason, withRetry } from './retry'
import type { RetryPolicy } from './retry'

const policy: RetryPolicy = { attempts: 4, baseMs: 100, factor: 3, maxMs: 1000 }

function recorder() {
  const waits: number[] = []
  return { waits, sleep: (ms: number) => (waits.push(ms), Promise.resolve()) }
}

describe('backoffDelay', () => {
  it('grows by the factor and is capped', () => {
    expect([1, 2, 3, 4].map((a) => backoffDelay(policy, a))).toEqual([100, 300, 900, 1000])
  })
  it('keeps the atlas policy short: a few tries within about ten seconds', () => {
    let total = 0
    for (let a = 1; a < ATLAS_RETRY.attempts; a++) total += backoffDelay(ATLAS_RETRY, a)
    expect(ATLAS_RETRY.attempts).toBeGreaterThanOrEqual(3)
    expect(total).toBeLessThan(10000)
  })
})

describe('withRetry', () => {
  it('resolves on the first try without waiting', async () => {
    const r = recorder()
    let calls = 0
    await expect(withRetry(async () => (calls++, 'ok'), policy, { sleep: r.sleep })).resolves.toBe('ok')
    expect(calls).toBe(1)
    expect(r.waits).toEqual([])
  })

  it('recovers from transient failures (the muscular file case)', async () => {
    const r = recorder()
    const seen: number[] = []
    const retries: [number, string, number][] = []
    const out = await withRetry(
      async (attempt) => {
        seen.push(attempt)
        if (attempt < 3) throw new TypeError('Failed to fetch')
        return attempt
      },
      policy,
      { sleep: r.sleep, onRetry: (failed, err, delay) => retries.push([failed, errorReason(err), delay]) },
    )
    expect(out).toBe(3)
    expect(seen).toEqual([1, 2, 3])
    expect(r.waits).toEqual([100, 300])
    expect(retries).toEqual([
      [1, 'network error', 100],
      [2, 'network error', 300],
    ])
  })

  it('gives up after the last try with a RetryError holding the cause', async () => {
    const r = recorder()
    let calls = 0
    const err = await withRetry(
      async () => {
        calls++
        throw new Error('server answered 503')
      },
      policy,
      { sleep: r.sleep },
    ).catch((e: unknown) => e)
    expect(calls).toBe(4)
    expect(r.waits).toEqual([100, 300, 900])
    expect(err).toBeInstanceOf(RetryError)
    expect((err as RetryError).attempts).toBe(4)
    expect(errorReason(err)).toBe('server answered 503')
    expect((err as RetryError).message).toContain('after 4 tries')
  })

  it('does not retry errors the caller marks as permanent', async () => {
    const r = recorder()
    let calls = 0
    const err = await withRetry(
      async () => {
        calls++
        throw new Error('permanent')
      },
      policy,
      { sleep: r.sleep, shouldRetry: () => false },
    ).catch((e: unknown) => e)
    expect(calls).toBe(1)
    expect(r.waits).toEqual([])
    expect((err as RetryError).attempts).toBe(1)
  })

  it('always makes at least one try', async () => {
    let calls = 0
    await withRetry(async () => calls++, { ...policy, attempts: 0 })
    expect(calls).toBe(1)
  })
})

describe('errorReason', () => {
  it('turns common failures into plain words', () => {
    const abort = new Error('The user aborted a request.')
    abort.name = 'AbortError'
    expect(errorReason(abort)).toBe('download interrupted')
    expect(errorReason(new TypeError('NetworkError when attempting to fetch resource.'))).toBe('network error')
    expect(errorReason('boom')).toBe('boom')
  })
})
