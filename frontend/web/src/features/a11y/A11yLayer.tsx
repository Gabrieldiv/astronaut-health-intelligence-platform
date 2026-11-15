import { AudioLines, Volume2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, IconButton } from '../../components/ui'
import { A11ySettingsDialog } from './A11ySettings'
import { enableSound, useA11yShortcuts, useAlarmSounds, useLiveAnnouncements, useSpokenSelection } from './hooks'
import { useA11yStore, type Politeness } from './settings'
import { speak, speechSupported } from './speech'
import { installLanguageSpeechGuard } from './languageSpeech'
import { useT } from '../../i18n'

/**
 * Visually hidden live region. The text is cleared first and set a moment later, so a screen
 * reader reads it even when the same sentence is announced twice in a row.
 */
function LiveRegion({ politeness }: { politeness: Politeness }) {
  const msg = useA11yStore((s) => s.live[politeness])
  const [text, setText] = useState('')
  useEffect(() => {
    if (!msg.n) return
    const clear = window.setTimeout(() => setText(''), 0)
    const t = window.setTimeout(() => setText(msg.text), 80)
    return () => {
      window.clearTimeout(clear)
      window.clearTimeout(t)
    }
  }, [msg])
  return (
    <div role={politeness === 'assertive' ? 'alert' : 'status'} aria-live={politeness} aria-atomic="true" className="sr-only">
      {text}
    </div>
  )
}

/** Shown when a critical alert should sound but the browser blocks audio until a user gesture. */
function EnableSoundPrompt() {
  const blocked = useA11yStore((s) => s.audioBlocked)
  const soundOn = useA11yStore((s) => s.soundOn)
  const level = useA11yStore((s) => s.alarmLevel)
  const setPrefs = useA11yStore((s) => s.setPrefs)
  const t = useT()
  if (!blocked || !soundOn) return null
  return (
    <div role="region" aria-label={t('a11y.layer.blockedRegion')} className="glass-strong animate-drop-in fixed bottom-4 left-4 z-(--z-toast) flex max-w-[360px] items-center gap-3 rounded-2xl px-3.5 py-3">
      <Volume2 size={18} className="shrink-0 text-watch" aria-hidden />
      <p className="min-w-0 flex-1 text-xs leading-snug text-ink-300">
        {level ? t('a11y.layer.blockedAlarm') : t('a11y.layer.blockedOn')}
      </p>
      <Button variant="primary" onClick={() => void enableSound()}>
        {t('a11y.layer.enableSound')}
      </Button>
      <IconButton label={t('a11y.layer.turnOff')} size="sm" onClick={() => setPrefs({ soundOn: false })}>
        <X size={14} />
      </IconButton>
    </div>
  )
}

/** On-screen copy of "Describe the screen" when audio description is off (also read by screen readers through the live region). */
function DescriptionCard() {
  const text = useA11yStore((s) => s.description)
  const close = useA11yStore((s) => s.showDescription)
  const rate = useA11yStore((s) => s.speechRate)
  const tr = useT()
  useEffect(() => {
    if (!text) return
    const t = window.setTimeout(() => close(null), 30000)
    return () => window.clearTimeout(t)
  }, [text, close])
  if (!text) return null
  return (
    <div role="region" aria-label={tr('a11y.layer.screenDesc')} className="glass-strong animate-drop-in fixed right-4 bottom-4 z-(--z-toast) w-[min(420px,calc(100vw-2rem))] rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
          <AudioLines size={15} className="text-accent" aria-hidden /> {tr('a11y.layer.whatOnScreen')}
        </h2>
        <IconButton label={tr('a11y.layer.closeDesc')} size="sm" onClick={() => close(null)}>
          <X size={14} />
        </IconButton>
      </div>
      <p className="mt-2 max-h-[40vh] overflow-y-auto text-[13px] leading-relaxed text-ink-300">{text}</p>
      {speechSupported() && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => speak(text, { rate, interrupt: true })}>
            {tr('a11y.layer.readAloud')}
          </Button>
          <span className="text-[11px] text-ink-500">{tr('a11y.layer.shiftD')}</span>
        </div>
      )}
    </div>
  )
}

/** Mounts the accessibility layer: sounds, announcements, speech, shortcuts and their UI. */
export function A11yLayer() {
  useAlarmSounds()
  useLiveAnnouncements()
  useSpokenSelection()
  useA11yShortcuts()
  // A language change stops every voice first, so two languages never speak at once.
  useEffect(() => installLanguageSpeechGuard(), [])
  return (
    <>
      <LiveRegion politeness="polite" />
      <LiveRegion politeness="assertive" />
      <EnableSoundPrompt />
      <DescriptionCard />
      <A11ySettingsDialog />
    </>
  )
}
