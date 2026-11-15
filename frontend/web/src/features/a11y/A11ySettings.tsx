import clsx from 'clsx'
import { Accessibility, AudioLines, Play, Volume2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Modal } from '../mission/Modal'
import { Button, Kbd } from '../../components/ui'
import { MENU_ITEM, MenuRow } from '../topbar/menu'
import { DEFAULT_ALARM_POLICY } from './alarmSchedule'
import { audioSupported, EARCON_LABEL, playEarcon, primeAudio } from './earcons'
import { describeNow, screenDescription } from './hooks'
import { MAX_RATE, MIN_RATE, useA11yStore } from './settings'
import { speak, speechSupported, stopSpeaking } from './speech'

/** Accessible on/off switch row (role="switch"), label and hint are part of its name and description. */
export function SwitchRow({ on, onChange, label, hint, icon, disabled }: { on: boolean; onChange: (on: boolean) => void; label: string; hint?: string; icon?: ReactNode; disabled?: boolean }) {
  const hintId = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-describedby={hint ? hintId : undefined}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={clsx(
        'focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition-colors disabled:opacity-50',
        on ? 'bg-accent/[0.07] ring-accent/30' : 'bg-white/[0.03] ring-white/[0.07] hover:bg-white/[0.05]',
      )}
    >
      {icon && (
        <span className={clsx('shrink-0', on ? 'text-accent' : 'text-ink-500')} aria-hidden>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[13px] font-semibold text-ink-100">{label}</span>
        {hint && (
          <span id={hintId} className="mt-0.5 block text-[11px] text-ink-500">
            {hint}
          </span>
        )}
      </span>
      <span className={clsx('relative h-[18px] w-8 shrink-0 rounded-full transition-colors', on ? 'bg-accent' : 'bg-white/15')} aria-hidden>
        <span className={clsx('absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all', on ? 'left-[16px]' : 'left-[2px]')} />
      </span>
      <span className="w-6 shrink-0 text-[11px] font-semibold text-ink-300" aria-hidden>
        {on ? 'On' : 'Off'}
      </span>
    </button>
  )
}

const sec = (ms: number) => `${Math.round(ms / 1000)} s`
const minutes = (ms: number) => `${Math.round(ms / 60000)} min`

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="mt-5 first:mt-0">
      <h3 id={id} className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

export function A11ySettingsDialog() {
  const open = useA11yStore((s) => s.settingsOpen)
  const setOpen = useA11yStore((s) => s.setSettingsOpen)
  const soundOn = useA11yStore((s) => s.soundOn)
  const soundHigh = useA11yStore((s) => s.soundHigh)
  const speechOn = useA11yStore((s) => s.speechOn)
  const rate = useA11yStore((s) => s.speechRate)
  const setPrefs = useA11yStore((s) => s.setPrefs)
  const blocked = useA11yStore((s) => s.audioBlocked)
  const rateId = useId()
  const canSpeak = speechSupported()
  const canPlay = audioSupported()
  const p = DEFAULT_ALARM_POLICY
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Accessibility and sound" icon={<Accessibility size={17} className="text-accent" aria-hidden />} subtitle="Saved in this browser." size="sm">
      <Section title="Alert sounds">
        <SwitchRow
          on={soundOn}
          icon={<Volume2 size={16} />}
          label="Sound for critical alerts"
          hint={canPlay ? 'Plays when a critical alert appears.' : 'This browser cannot play generated sounds.'}
          disabled={!canPlay}
          onChange={(on) => {
            setPrefs({ soundOn: on })
            if (on) void primeAudio().then(() => playEarcon('CRITICAL'))
          }}
        />
        <SwitchRow
          on={soundHigh}
          label="Also for warnings"
          hint="A softer sound for new warning (high) alerts."
          disabled={!canPlay || !soundOn}
          onChange={(on) => {
            setPrefs({ soundHigh: on })
            if (on) void primeAudio().then(() => playEarcon('HIGH'))
          }}
        />
        <p className="text-[11px] leading-relaxed text-ink-500">
          The sound repeats every {sec(p.repeatCriticalMs)} until you acknowledge the alert, then it stops. If a critical alert stays unacknowledged for {minutes(p.escalateAfterMs)}, or the
          system escalates it, the sound becomes more urgent and repeats every {sec(p.repeatEscalatedMs)}. Alerts from before the page loaded never ring. Demo configuration, not an official
          limit.
        </p>
        {blocked && <p className="text-[11px] font-semibold text-watch">The browser is blocking sound. Use Test below once to allow it.</p>}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Test the sounds">
          {(['HIGH', 'CRITICAL', 'CRITICAL_ESCALATED'] as const).map((e) => (
            <Button key={e} variant="ghost" disabled={!canPlay} onClick={() => void primeAudio().then(() => playEarcon(e)).then(() => useA11yStore.getState().setAudioBlocked(false))}>
              <Play size={12} aria-hidden /> {EARCON_LABEL[e]}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="Audio description">
        <SwitchRow
          on={speechOn}
          icon={<AudioLines size={16} />}
          label="Spoken explanations"
          hint={canSpeak ? 'Reads out new alerts, status changes and what you select. Shift+D' : 'This browser has no speech synthesis.'}
          disabled={!canSpeak}
          onChange={(on) => {
            setPrefs({ speechOn: on })
            if (on) speak('Audio description on. Press D to describe the screen.', { rate, interrupt: true })
            else stopSpeaking()
          }}
        />
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.07]">
          <label htmlFor={rateId} className="shrink-0 text-[13px] font-semibold text-ink-100">
            Voice speed
          </label>
          <input
            id={rateId}
            type="range"
            min={MIN_RATE}
            max={MAX_RATE}
            step={0.1}
            value={rate}
            disabled={!canSpeak}
            aria-valuetext={`${rate.toFixed(1)} times normal`}
            onChange={(e) => setPrefs({ speechRate: Number(e.target.value) })}
            className="focus-ring min-w-0 flex-1 accent-[var(--color-accent)]"
          />
          <span className="tabular w-10 shrink-0 text-right text-xs text-ink-300" aria-hidden>
            {rate.toFixed(1)}x
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={describeNow}>
            <AudioLines size={13} aria-hidden /> Describe the screen
          </Button>
          <Button variant="ghost" disabled={!canSpeak} onClick={() => speak(screenDescription(), { rate, interrupt: true })}>
            <Play size={12} aria-hidden /> Read it aloud once
          </Button>
          <Button variant="subtle" disabled={!canSpeak} onClick={stopSpeaking}>
            Stop speaking
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-ink-500">
          Uses the voice built into your browser, nothing is sent anywhere. If you use a screen reader you may not need this: alerts and status changes are already announced to it.
        </p>
      </Section>

      <Section title="Keyboard">
        <ul className="flex flex-col gap-1 text-[13px] text-ink-300">
          {[
            { keys: ['D'], label: 'Describe the screen (press again to stop)' },
            { keys: ['Shift', 'D'], label: 'Audio description on or off' },
            { keys: ['Esc'], label: 'Stop speaking' },
            { keys: ['A'], label: 'Open alerts, then Tab to Acknowledge' },
            { keys: ['?'], label: 'All keyboard shortcuts' },
          ].map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 odd:bg-white/[0.025]">
              <span>{s.label}</span>
              <span className="flex shrink-0 gap-1">
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-ink-500">The first Tab on the page shows links to skip straight to the main content or to what needs attention.</p>
      </Section>
    </Modal>
  )
}

/** Entry in the top bar Tools menu (role="menuitem"). */
export function AccessibilityMenuItem() {
  const setOpen = useA11yStore((s) => s.setSettingsOpen)
  const soundOn = useA11yStore((s) => s.soundOn)
  const speechOn = useA11yStore((s) => s.speechOn)
  const hint = `Alert sound ${soundOn ? 'on' : 'off'}, audio description ${speechOn ? 'on' : 'off'}`
  return (
    <button type="button" role="menuitem" tabIndex={-1} aria-haspopup="dialog" onClick={() => setOpen(true)} className={MENU_ITEM}>
      <MenuRow icon={<Accessibility size={15} />} label="Accessibility and sound" hint={hint} />
    </button>
  )
}
