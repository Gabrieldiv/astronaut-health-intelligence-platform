import { t, translatedRecord } from '../../i18n'
import type { Earcon } from './alarmSchedule'

/**
 * Alert sounds ("earcons") generated with the Web Audio API. No audio files.
 *
 * Each severity has its own rhythm and pitch so it can be told apart without looking:
 *  - HIGH (warning): three soft, falling sine pulses.
 *  - CRITICAL: a rising five pulse "3 + 2" burst (the rhythm used by medical high priority alarms).
 *  - CRITICAL_ESCALATED: the same burst twice, brighter and a little louder.
 */

export interface Tone {
  freq: number
  /** Start, seconds from the beginning of the earcon. */
  at: number
  dur: number
  gain: number
  type: OscillatorType
}

const burst = (start: number, gain: number, type: OscillatorType): Tone[] => [
  { freq: 523, at: start + 0, dur: 0.14, gain, type },
  { freq: 659, at: start + 0.2, dur: 0.14, gain, type },
  { freq: 784, at: start + 0.4, dur: 0.14, gain, type },
  { freq: 784, at: start + 0.85, dur: 0.14, gain, type },
  { freq: 1047, at: start + 1.05, dur: 0.14, gain, type },
]

export const EARCONS: Record<Earcon, Tone[]> = {
  HIGH: [
    { freq: 784, at: 0, dur: 0.2, gain: 0.1, type: 'sine' },
    { freq: 659, at: 0.3, dur: 0.2, gain: 0.1, type: 'sine' },
    { freq: 523, at: 0.6, dur: 0.28, gain: 0.1, type: 'sine' },
  ],
  CRITICAL: burst(0, 0.14, 'triangle'),
  CRITICAL_ESCALATED: [...burst(0, 0.18, 'square'), ...burst(1.6, 0.18, 'square')],
}

export const EARCON_LABEL: Record<Earcon, string> = translatedRecord(['HIGH', 'CRITICAL', 'CRITICAL_ESCALATED'] as const, (e) => t(`a11y.earcon.${e}`))

export type PlayResult = 'played' | 'blocked' | 'unsupported'

let ctx: AudioContext | null = null

function audioCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null
}

/** False until the page got a user gesture (when the browser exposes that), so we never create a context too early. */
function hasGesture(): boolean {
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  return ua ? ua.hasBeenActive : true
}

function context(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = audioCtor()
      if (!AC) return null
      ctx = new AC()
    }
    return ctx
  } catch {
    return null
  }
}

export function audioSupported(): boolean {
  return audioCtor() != null
}

/** Call from a user gesture (click, key press) so later sounds are allowed. Returns true when audio runs. */
export async function primeAudio(): Promise<boolean> {
  const c = context()
  if (!c) return false
  try {
    if (c.state !== 'running') await c.resume()
  } catch {
    return false
  }
  return c.state === 'running'
}

function schedule(c: AudioContext, tones: Tone[]) {
  const t0 = c.currentTime + 0.03
  for (const t of tones) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = t.type
    osc.frequency.value = t.freq
    const start = t0 + t.at
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(t.gain, start + 0.015)
    gain.gain.setValueAtTime(t.gain, start + t.dur - 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur)
    osc.connect(gain).connect(c.destination)
    osc.start(start)
    osc.stop(start + t.dur + 0.02)
  }
}

/**
 * Plays one earcon. Resolves 'blocked' when the browser does not allow audio yet (no user
 * gesture): the caller shows an "Enable sound" prompt. A stale sound is never queued for later.
 */
export async function playEarcon(e: Earcon): Promise<PlayResult> {
  if (!audioSupported()) return 'unsupported'
  if (!hasGesture()) return 'blocked'
  const c = context()
  if (!c) return 'unsupported'
  if (c.state !== 'running') {
    const ok = await Promise.race([primeAudio(), new Promise<boolean>((r) => setTimeout(() => r(false), 400))])
    if (!ok || (c.state as AudioContextState) !== 'running') return 'blocked'
  }
  try {
    schedule(c, EARCONS[e])
    return 'played'
  } catch {
    return 'unsupported'
  }
}
