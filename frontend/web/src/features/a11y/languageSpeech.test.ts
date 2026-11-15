import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setLanguage, useI18n } from '../../i18n'
import { installLanguageSpeechGuard, LANGUAGE_ANNOUNCE_DELAY_MS } from './languageSpeech'
import { useA11yStore } from './settings'
import { onSpeechReset, speak } from './speech'

/** Minimal fake of window.speechSynthesis: a queue that cancel() empties. */
function fakeSynth() {
  const queue: Array<{ text: string; lang: string }> = []
  const synth = {
    queue,
    get speaking() {
      return queue.length > 0
    },
    get pending() {
      return queue.length > 1
    },
    speak: vi.fn((u: { text: string; lang: string }) => {
      queue.push({ text: u.text, lang: u.lang })
    }),
    cancel: vi.fn(() => {
      queue.length = 0
    }),
    getVoices: () => [],
  }
  class Utterance {
    text: string
    lang = ''
    rate = 1
    voice: unknown = null
    constructor(text: string) {
      this.text = text
    }
  }
  vi.stubGlobal('window', { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance })
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  return synth
}

describe('speech on language change', () => {
  let uninstall: () => void = () => {}
  beforeEach(() => {
    vi.useFakeTimers()
    useA11yStore.setState({ speechOn: true, speechRate: 1, description: null })
  })
  afterEach(async () => {
    uninstall()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    await setLanguage('en', { persist: false })
  })

  it('cancels the old voice, clears the queues and announces once in the new language', async () => {
    const synth = fakeSynth()
    uninstall = installLanguageSpeechGuard()
    const pendingReadAloud = vi.fn()
    const off = onSpeechReset(pendingReadAloud)
    useA11yStore.setState({ description: 'Old description in English.' })

    speak('First sentence in English. Second sentence in English. '.repeat(10))
    expect(synth.queue.length).toBeGreaterThan(1)

    await setLanguage('de', { persist: false })
    expect(useI18n.getState().lang).toBe('de')
    // Old speech gone at once, before anything new is queued.
    expect(synth.cancel).toHaveBeenCalled()
    expect(synth.queue).toEqual([])
    expect(pendingReadAloud).toHaveBeenCalledTimes(1)
    expect(useA11yStore.getState().description).toBeNull()

    vi.advanceTimersByTime(LANGUAGE_ANNOUNCE_DELAY_MS + 1)
    expect(synth.queue).toEqual([{ text: 'Ich spreche jetzt Deutsch.', lang: 'de-DE' }])
    off()
  })

  it('a second quick change speaks only the latest language', async () => {
    const synth = fakeSynth()
    uninstall = installLanguageSpeechGuard()
    await setLanguage('es', { persist: false })
    await setLanguage('de', { persist: false })
    vi.advanceTimersByTime(LANGUAGE_ANNOUNCE_DELAY_MS + 1)
    expect(synth.queue.map((u) => u.text)).toEqual(['Ich spreche jetzt Deutsch.'])
  })

  it('stays silent with audio description off, but still stops the old voice', async () => {
    const synth = fakeSynth()
    useA11yStore.setState({ speechOn: false })
    uninstall = installLanguageSpeechGuard()
    speak('Assistant answer being read aloud.')
    await setLanguage('ja', { persist: false })
    vi.advanceTimersByTime(LANGUAGE_ANNOUNCE_DELAY_MS + 1)
    expect(synth.cancel).toHaveBeenCalled()
    expect(synth.queue).toEqual([])
  })
})
