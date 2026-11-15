/**
 * Browser voice: speech to text (SpeechRecognition, Chrome/Edge/Safari) and spoken answers
 * (speechSynthesis). Both are optional: when the browser lacks them the controls are hidden.
 * Note: in Chrome, SpeechRecognition itself sends audio to a cloud service. Fine for this demo,
 * not for a spacecraft (see docs/assistant-architecture.md).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getBcp47, t, type MessageKey } from '../../i18n'

interface RecognitionResult {
  isFinal: boolean
  0: { transcript: string }
}
interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<RecognitionResult>
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const speechInputSupported = (): boolean => recognitionCtor() !== null
export const speechOutputSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window

const MIC_ERRORS: Record<string, MessageKey> = {
  'not-allowed': 'assistant.mic.notAllowed',
  'service-not-allowed': 'assistant.mic.serviceNotAllowed',
  'no-speech': 'assistant.mic.noSpeech',
  network: 'assistant.mic.network',
  'audio-capture': 'assistant.mic.audioCapture',
}

/** Push to talk: start() listens once; onInterim shows live text; onFinal gets the final sentence. */
export function useSpeechInput(onInterim: (text: string) => void, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Recognition | null>(null)
  const cb = useRef({ onInterim, onFinal })
  useEffect(() => {
    cb.current = { onInterim, onFinal }
  }, [onInterim, onFinal])

  const stop = useCallback(() => rec.current?.stop(), [])

  const start = useCallback(() => {
    const Ctor = recognitionCtor()
    if (!Ctor || rec.current) return
    setError(null)
    const r = new Ctor()
    // Listen in the selected language (English by default).
    r.lang = getBcp47()
    r.continuous = false
    r.interimResults = true
    let finalText = ''
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!
        if (res.isFinal) finalText += res[0].transcript
        else interim += res[0].transcript
      }
      cb.current.onInterim((finalText + interim).trim())
    }
    r.onerror = (e) => setError(MIC_ERRORS[e.error] ? t(MIC_ERRORS[e.error]!) : e.error === 'aborted' ? null : t('assistant.mic.stopped'))
    r.onend = () => {
      rec.current = null
      setListening(false)
      if (finalText.trim()) cb.current.onFinal(finalText.trim())
    }
    rec.current = r
    try {
      r.start()
      setListening(true)
    } catch {
      rec.current = null
      setError(t('assistant.mic.couldNotStart'))
    }
  }, [])

  useEffect(() => () => rec.current?.abort(), [])
  return { listening, error, start, stop }
}

export function speak(text: string): void {
  if (!speechOutputSupported() || !text) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = getBcp47()
  u.rate = 1
  synth.speak(u)
}

export function stopSpeaking(): void {
  if (speechOutputSupported()) window.speechSynthesis.cancel()
}

const SPEAK_KEY = 'ahi.assistant.speak'

export function loadSpeakPref(): boolean {
  try {
    return window.localStorage.getItem(SPEAK_KEY) === '1'
  } catch {
    return false
  }
}

export function saveSpeakPref(on: boolean): void {
  try {
    window.localStorage.setItem(SPEAK_KEY, on ? '1' : '0')
  } catch {
    /* storage unavailable: the preference simply does not persist */
  }
}
