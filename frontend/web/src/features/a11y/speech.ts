import { getBcp47 } from '../../i18n'
/**
 * Thin wrapper over the browser speech synthesis (Web Speech API). No network, no audio files.
 * Long text is split into sentence chunks: some browsers stop a single long utterance midway.
 */

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'
}

/** Splits text at sentence ends into chunks of at most `max` characters (a longer sentence stays whole). */
export function chunkForSpeech(text: string, max = 220): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
  const out: string[] = []
  let cur = ''
  for (const s of sentences) {
    if (cur && cur.length + 1 + s.length > max) {
      out.push(cur)
      cur = s
    } else {
      cur = cur ? `${cur} ${s}` : s
    }
  }
  if (cur) out.push(cur)
  return out
}

/** Voice for the selected language (exact tag first, then any voice of that language), or null for the default voice. */
function pickVoice(): SpeechSynthesisVoice | null {
  const tag = getBcp47()
  const prefix = tag.split('-')[0]!.toLowerCase()
  const voices = window.speechSynthesis.getVoices()
  const norm = (l: string | undefined) => (l ?? '').replace('_', '-').toLowerCase()
  const same = (v: SpeechSynthesisVoice) => norm(v.lang).startsWith(prefix)
  return (
    voices.find((v) => norm(v.lang) === tag.toLowerCase() && v.localService) ??
    voices.find((v) => norm(v.lang) === tag.toLowerCase()) ??
    voices.find((v) => same(v) && v.default) ??
    voices.find(same) ??
    null
  )
}

/**
 * Speaks `text`. `interrupt` cancels whatever is being said first (urgent news); otherwise the
 * text is queued after the current speech.
 */
export function speak(text: string, opts: { rate?: number; interrupt?: boolean } = {}) {
  if (!speechSupported() || !text.trim()) return
  const synth = window.speechSynthesis
  if (opts.interrupt) synth.cancel()
  const voice = pickVoice()
  for (const chunk of chunkForSpeech(text)) {
    const u = new SpeechSynthesisUtterance(chunk)
    u.lang = voice?.lang ?? getBcp47()
    if (voice) u.voice = voice
    u.rate = opts.rate ?? 1
    synth.speak(u)
  }
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}

/** Bumped by resetSpeech(), so text prepared before a reset is not spoken after it. */
let generation = 0
const resetListeners = new Set<() => void>()

/** Current speech generation (a caller that speaks later can check it did not change meanwhile). */
export const speechGeneration = (): number => generation

/** Registers a queue that must be emptied on resetSpeech() (pending read aloud, on-screen description). */
export function onSpeechReset(fn: () => void): () => void {
  resetListeners.add(fn)
  return () => {
    resetListeners.delete(fn)
  }
}

/**
 * Hard stop of every voice: cancels the browser speech queue (audio description, describe the
 * screen and the assistant read aloud all share it) and clears the registered app queues.
 */
export function resetSpeech() {
  generation++
  stopSpeaking()
  for (const fn of [...resetListeners]) fn()
}

export function isSpeaking(): boolean {
  return speechSupported() && (window.speechSynthesis.speaking || window.speechSynthesis.pending)
}
