import { useEffect, useRef } from 'react'
import { useAppStore } from '../../state/store'
import { useUiStore } from '../../app/uiStore'
import { useSelectedStructure } from '../shared/hooks'
import type { Status } from '../../types/domain'
import { createTracker, DEFAULT_ALARM_POLICY, freshAlerts, stepAlarm, type AlarmTracker, type Earcon } from './alarmSchedule'
import { primeAudio, playEarcon } from './earcons'
import { crewStatusOf, describeAstronaut, describeNewAlerts, describeRegion, describeScreen, describeStatusChange, describeStructure } from './describe'
import { isSpeaking, speak, speechSupported, stopSpeaking } from './speech'
import { useA11yStore } from './settings'

/** Scenario identity: alerts of a new or restarted scenario start a fresh history. */
function epochOf(): string {
  const c = useAppStore.getState().clock
  return `${c.scenarioId}|${c.startedAt}`
}

function callsignOf(id: string | null): string | null {
  if (!id) return null
  return useAppStore.getState().crew.find((c) => c.id === id)?.callsign ?? id
}

/** Speaks when audio description is on. `interrupt` for urgent news. */
export function say(text: string, interrupt = false) {
  const s = useA11yStore.getState()
  if (!s.speechOn || !text) return
  speak(text, { rate: s.speechRate, interrupt })
}

/** Plays the alert earcon for one step of the schedule and tracks whether the browser blocked it. */
function play(e: Earcon) {
  void playEarcon(e).then((r) => {
    const s = useA11yStore.getState()
    if (r === 'blocked' && !s.audioBlocked) s.setAudioBlocked(true)
    if (r === 'played' && s.audioBlocked) s.setAudioBlocked(false)
  })
}

/** Called from a user gesture (prompt button, settings, any click): unlocks audio and replays the current alarm. */
export async function enableSound() {
  const ok = await primeAudio()
  const s = useA11yStore.getState()
  if (ok) {
    s.setAudioBlocked(false)
    if (s.alarmLevel) play(s.alarmLevel)
  }
  return ok
}

/**
 * Alert sounds. Runs the pure schedule (alarmSchedule.ts) on every alert change and once a second.
 * Sound starts with a new CRITICAL alert (HIGH too when opted in), repeats calmly while it stays
 * open, escalates when it stays unacknowledged, and stops on acknowledge.
 */
export function useAlarmSounds() {
  useEffect(() => {
    let tracker: AlarmTracker | null = null
    const run = () => {
      const app = useAppStore.getState()
      const a11y = useA11yStore.getState()
      const epoch = epochOf()
      if (!tracker) tracker = createTracker(epoch, app.clock.simNow)
      const step = stepAlarm(tracker, {
        alerts: app.alerts,
        nowReal: Date.now(),
        simNow: app.clock.simNow,
        epoch,
        enabled: a11y.soundOn,
        policy: { ...DEFAULT_ALARM_POLICY, includeHigh: a11y.soundHigh },
      })
      tracker = step.tracker
      if (a11y.alarmLevel !== step.level) a11y.setAlarmLevel(step.level)
      if (step.level == null && a11y.audioBlocked) a11y.setAudioBlocked(false)
      if (step.play) play(step.play)
    }
    run()
    const id = window.setInterval(run, 1000)
    const offApp = useAppStore.subscribe((s, p) => {
      if (s.alerts !== p.alerts) run()
    })
    const offPrefs = useA11yStore.subscribe((s, p) => {
      if (s.soundOn !== p.soundOn || s.soundHigh !== p.soundHigh) run()
    })
    // Any user gesture unlocks audio for later alarms (browsers block audio before one).
    const onGesture = () => {
      if (!useA11yStore.getState().soundOn) return
      void primeAudio().then((ok) => {
        const s = useA11yStore.getState()
        if (ok && s.audioBlocked) {
          s.setAudioBlocked(false)
          if (s.alarmLevel) play(s.alarmLevel)
        }
      })
    }
    window.addEventListener('pointerdown', onGesture)
    window.addEventListener('keydown', onGesture)
    return () => {
      window.clearInterval(id)
      offApp()
      offPrefs()
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
  }, [])
}

/**
 * aria-live announcements and spoken descriptions of new alerts and of status changes of the
 * selected astronaut. CRITICAL alerts are already announced by the critical banner (role="alert"),
 * so the live region only adds HIGH alerts. Speech (when on) covers both.
 */
export function useLiveAnnouncements() {
  useEffect(() => {
    let epoch = epochOf()
    let ignoreBefore = useAppStore.getState().clock.simNow
    let known = new Set<string>()
    const onAlerts = () => {
      const app = useAppStore.getState()
      const e = epochOf()
      if (e !== epoch) {
        epoch = e
        ignoreBefore = app.clock.simNow
        known = new Set()
      }
      const r = freshAlerts(known, app.alerts, ignoreBefore, ['CRITICAL', 'HIGH'])
      known = r.known
      if (r.fresh.length === 0) return
      const highs = r.fresh.filter((a) => a.severity === 'HIGH')
      if (highs.length) useA11yStore.getState().announce(describeNewAlerts(highs, callsignOf), 'polite')
      say(describeNewAlerts(r.fresh, callsignOf), r.fresh[0]!.severity === 'CRITICAL')
    }
    const offApp = useAppStore.subscribe((s, p) => {
      if (s.alerts !== p.alerts) onAlerts()
    })

    // Status of the selected astronaut, sampled every 1.5 s so a flapping value is not read out each time.
    let watched: { id: string; status: Status } | null = null
    const onStatus = () => {
      const app = useAppStore.getState()
      const id = app.selectedAstronautId
      const status = crewStatusOf(app.health[id])
      if (!watched || watched.id !== id) {
        watched = { id, status }
        return
      }
      if (watched.status === status) return
      const text = describeStatusChange(callsignOf(id) ?? id, watched.status, status)
      watched = { id, status }
      useA11yStore.getState().announce(text, status === 'CRITICAL' ? 'assertive' : 'polite')
      say(text, status === 'CRITICAL')
    }
    onStatus()
    const id = window.setInterval(onStatus, 1500)
    return () => {
      offApp()
      window.clearInterval(id)
    }
  }, [])
}

/** Speaks the selected astronaut, body region or anatomical structure when audio description is on. */
export function useSpokenSelection() {
  const astronautId = useAppStore((s) => s.selectedAstronautId)
  const region = useAppStore((s) => s.selectedRegion)
  const { structureId, structure } = useSelectedStructure()
  const speechOn = useA11yStore((s) => s.speechOn)
  const last = useRef<string | null>(null)
  useEffect(() => {
    // Wait for the structure name when a structure is selected and the atlas is still loading.
    if (structureId && !structure) return
    const key = `${astronautId}|${region ?? ''}|${structureId ?? ''}`
    const first = last.current == null
    const prevAstronaut = last.current?.split('|')[0]
    if (key === last.current) return
    last.current = key
    if (first || !speechOn) return
    const app = useAppStore.getState()
    const a = app.crew.find((c) => c.id === astronautId)
    if (!a) return
    const health = app.health[astronautId]
    let text: string
    if (structure) text = describeStructure(structure.name, a.callsign, region, health)
    else if (region) text = describeRegion(a.callsign, region, health)
    else if (prevAstronaut !== astronautId) text = describeAstronaut(a, health)
    else text = `Back to the body overview for ${a.callsign}.`
    say(text, true)
  }, [astronautId, region, structureId, structure, speechOn])
}

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

/** Text of "Describe the screen" for the current state. */
export function screenDescription(): string {
  return describeScreen(useAppStore.getState(), useUiStore.getState().viewMode)
}

/**
 * Describe the screen. With audio description on, it is spoken. Otherwise it goes to the polite
 * live region (screen readers read it) and to a short on-screen card.
 */
export function describeNow() {
  const text = screenDescription()
  const s = useA11yStore.getState()
  if (s.speechOn && speechSupported()) speak(text, { rate: s.speechRate, interrupt: true })
  else {
    s.announce(text, 'polite')
    s.showDescription(text)
  }
}

export function toggleAudioDescription() {
  const s = useA11yStore.getState()
  const next = !s.speechOn
  s.setPrefs({ speechOn: next })
  if (next) speak('Audio description on. Press D to describe the screen.', { rate: s.speechRate, interrupt: true })
  else {
    stopSpeaking()
    s.announce('Audio description off.', 'polite')
  }
}

/**
 * Keys: D describes the screen (D again while speaking stops), Shift+D turns audio description on
 * or off, Esc stops speech. Ignored while typing and with Ctrl, Alt or Meta held.
 */
export function useA11yShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      if (e.key === 'Escape') {
        if (isSpeaking()) stopSpeaking()
        return
      }
      if (e.defaultPrevented || (e.key !== 'd' && e.key !== 'D')) return
      e.preventDefault()
      if (e.shiftKey) return toggleAudioDescription()
      if (isSpeaking()) return stopSpeaking()
      describeNow()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
