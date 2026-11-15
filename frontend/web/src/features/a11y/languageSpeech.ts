import { onLanguageChange, t } from '../../i18n'
import { useA11yStore } from './settings'
import { resetSpeech, speak, speechGeneration, speechSupported } from './speech'

/** Pause between the cancel and the announcement: some engines drop an utterance queued in the same tick as cancel(). */
export const LANGUAGE_ANNOUNCE_DELAY_MS = 150

/**
 * One voice at a time across a language change. On every change:
 * 1. cancel the speech synthesis and every app queue (audio description, describe the screen,
 *    the assistant read aloud), so nothing in the old language keeps talking;
 * 2. close the on-screen screen description (its text is in the old language);
 * 3. with audio description on, say one short sentence in the new language.
 * Returns the uninstall function.
 */
export function installLanguageSpeechGuard(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const off = onLanguageChange(() => {
    if (timer) clearTimeout(timer)
    timer = null
    resetSpeech()
    const s = useA11yStore.getState()
    if (s.description) s.showDescription(null)
    if (!s.speechOn || !speechSupported()) return
    const gen = speechGeneration()
    timer = setTimeout(() => {
      timer = null
      const now = useA11yStore.getState()
      if (gen !== speechGeneration() || !now.speechOn) return
      speak(t('connectivity.speech.languageChanged'), { rate: now.speechRate, interrupt: true })
    }, LANGUAGE_ANNOUNCE_DELAY_MS)
  })
  return () => {
    off()
    if (timer) clearTimeout(timer)
  }
}
