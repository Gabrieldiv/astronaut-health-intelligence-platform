/**
 * Retry with exponential backoff for the atlas downloads. Pure TypeScript (the wait is
 * injectable), so the policy is unit tested without timers or a network.
 */

export interface RetryPolicy {
  /** Total number of tries, the first one included (at least 1). */
  attempts: number
  /** Wait before the second try (ms). Each later wait is `factor` times longer, capped at `maxMs`. */
  baseMs: number
  factor: number
  maxMs: number
}

/** Atlas files: 4 tries over about 6 seconds, enough to ride out a dev server restart or a flaky link. */
export const ATLAS_RETRY: RetryPolicy = { attempts: 4, baseMs: 600, factor: 3, maxMs: 6000 }

/** Wait before try number `attempt + 1`, where `attempt` (1 based) is the try that just failed. */
export function backoffDelay(policy: RetryPolicy, attempt: number): number {
  return Math.min(policy.maxMs, policy.baseMs * policy.factor ** Math.max(0, attempt - 1))
}

export interface RetryHooks {
  /** Called after a failed try that will be retried, before the wait. */
  onRetry?: (failedAttempt: number, error: unknown, delayMs: number) => void
  /** Return false for errors that cannot heal (default: every error is retried). */
  shouldRetry?: (error: unknown) => boolean
  /** Injectable wait (tests). */
  sleep?: (ms: number) => Promise<void>
}

/** Thrown once every try failed: keeps the last cause and the number of tries. */
export class RetryError extends Error {
  readonly attempts: number
  readonly lastError: unknown
  constructor(attempts: number, cause: unknown) {
    super(`${errorReason(cause)} (after ${attempts} ${attempts === 1 ? 'try' : 'tries'})`)
    this.name = 'RetryError'
    this.attempts = attempts
    this.lastError = cause
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Runs `task` until it resolves or the policy gives up (then rejects with a RetryError). */
export async function withRetry<T>(task: (attempt: number) => Promise<T>, policy: RetryPolicy, hooks: RetryHooks = {}): Promise<T> {
  const sleep = hooks.sleep ?? defaultSleep
  const tries = Math.max(1, Math.floor(policy.attempts))
  for (let attempt = 1; ; attempt++) {
    try {
      return await task(attempt)
    } catch (error) {
      const retryable = hooks.shouldRetry ? hooks.shouldRetry(error) : true
      if (attempt >= tries || !retryable) throw new RetryError(attempt, error)
      const delay = backoffDelay(policy, attempt)
      hooks.onRetry?.(attempt, error, delay)
      await sleep(delay)
    }
  }
}

/** Short, plain reason for an error, for tooltips and dev logs. */
export function errorReason(error: unknown): string {
  if (error instanceof RetryError) return errorReason(error.lastError)
  if (error instanceof Error) {
    if (error.name === 'AbortError') return 'download interrupted'
    if (error instanceof TypeError && /fetch|network|load failed/i.test(error.message)) return 'network error'
    return error.message || error.name
  }
  return String(error)
}
