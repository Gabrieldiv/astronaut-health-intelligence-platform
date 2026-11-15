import clsx from 'clsx'
import { CloudOff, Loader2, Mic, MicOff, RefreshCw, Send, Sparkles, Square, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useAppStore } from '../../state/store'
import { Badge, Button, Drawer, IconButton } from '../../components/ui'
import { buildAssistantContext } from './context'
import {
  AssistantHttpError,
  fetchAssistantStatus,
  speakableText,
  splitBasedOn,
  streamChat,
  toHistory,
  type AssistantAvailability,
  type ChatMessage,
} from './chat'
import { loadSpeakPref, saveSpeakPref, speak, speechInputSupported, speechOutputSupported, stopSpeaking, useSpeechInput } from './speech'
import { LIMITS } from './types'

export const DEMO_NOTE = 'Demo: answers come from a cloud AI model. Not medical advice.'

let nextId = 0
const newId = () => `m${++nextId}`

/** Launcher button plus the chat drawer. Mounted once in the app shell. */
export function Assistant() {
  const [open, setOpen] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    launcher.current?.focus()
  }, [])
  return (
    <>
      <button
        ref={launcher}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="focus-ring glass-strong fixed right-4 bottom-4 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-ink-100 shadow-lg ring-1 ring-accent/30 transition-colors hover:bg-white/[0.08]"
      >
        <Sparkles size={16} className="text-accent" aria-hidden />
        Ask AHI
      </button>
      {open && <AssistantDrawer onClose={close} />}
    </>
  )
}

function AssistantDrawer({ onClose }: { onClose: () => void }) {
  const crew = useAppStore((s) => s.crew)
  const selectedId = useAppStore((s) => s.selectedAstronautId)
  const astro = crew.find((c) => c.id === selectedId) ?? crew[0]
  const callsign = astro?.callsign ?? 'the crew'

  const [availability, setAvailability] = useState<AssistantAvailability>({ kind: 'checking' })
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [speakOn, setSpeakOn] = useState(loadSpeakPref)
  const abort = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef(messages)
  const speakRef = useRef(speakOn)
  useEffect(() => {
    messagesRef.current = messages
    speakRef.current = speakOn
  }, [messages, speakOn])

  const check = useCallback(async () => {
    setAvailability({ kind: 'checking' })
    setAvailability(await fetchAssistantStatus())
  }, [])

  useEffect(() => {
    let live = true
    void fetchAssistantStatus().then((a) => {
      if (live) setAvailability(a)
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    return () => {
      abort.current?.abort()
      stopSpeaking()
    }
  }, [])

  // The input is disabled while the status is checked: focus it as soon as the assistant is ready.
  useEffect(() => {
    if (availability.kind === 'ready') inputRef.current?.focus()
  }, [availability.kind])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const updateLast = (fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((list) => (list.length ? [...list.slice(0, -1), fn(list[list.length - 1]!)] : list))

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim().slice(0, LIMITS.question)
      if (!question || busy) return
      stopSpeaking()
      const history = toHistory(messagesRef.current)
      // Fresh snapshot of the engine outputs at the moment of the question (read only).
      const context = buildAssistantContext(useAppStore.getState())
      setMessages((list) => [...list, { id: newId(), role: 'user', text: question }, { id: newId(), role: 'assistant', text: '', pending: true }])
      setInput('')
      setBusy(true)
      const ctrl = new AbortController()
      abort.current = ctrl
      let answer = ''
      let failure: string | null = null
      try {
        await streamChat({ question, history, context }, (ev) => {
          if (ev.type === 'delta') {
            answer += ev.text
            updateLast((m) => ({ ...m, text: answer }))
          } else if (ev.type === 'error') {
            failure = ev.message
          }
        }, ctrl.signal)
        if (!answer.trim() && !failure) failure = 'The assistant returned an empty answer.'
      } catch (e) {
        if (ctrl.signal.aborted) failure = answer ? null : 'Stopped.'
        else if (e instanceof AssistantHttpError) {
          failure = e.message
          // Backend down or key missing: switch the whole panel to its calm offline state.
          if (e.status === null || e.status === 503) setAvailability({ kind: 'offline', reason: e.message, apiReachable: e.status === 503 })
        } else failure = 'The assistant could not answer.'
      } finally {
        abort.current = null
        setBusy(false)
        updateLast((m) => ({ ...m, pending: false, error: failure ?? undefined }))
        if (!failure && answer && speakRef.current) speak(speakableText(answer))
      }
    },
    [busy],
  )

  const voice = useSpeechInput(setInput, (text) => void ask(text))
  const canListen = speechInputSupported()
  const canSpeak = speechOutputSupported()
  const ready = availability.kind === 'ready'

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void ask(input)
  }
  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void ask(input)
    }
  }
  const toggleSpeak = () => {
    const v = !speakOn
    setSpeakOn(v)
    saveSpeakPref(v)
    if (!v) stopSpeaking()
  }

  const starters = [`How is ${callsign} doing?`, 'Why is this alert on?', 'What should we do now?']

  const footer = (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <label htmlFor="assistant-input" className="sr-only">
          Ask a question about {callsign}
        </label>
        <textarea
          id="assistant-input"
          ref={inputRef}
          rows={2}
          maxLength={LIMITS.question}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!ready}
          placeholder={ready ? (voice.listening ? 'Listening…' : `Ask about ${callsign}…`) : 'Assistant offline'}
          className="focus-ring min-h-[44px] flex-1 resize-none rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-ink-100 ring-1 ring-white/10 placeholder:text-ink-500 disabled:opacity-50"
        />
        {canListen && (
          <IconButton
            label={voice.listening ? 'Stop listening' : 'Ask by voice'}
            active={voice.listening}
            disabled={!ready || busy}
            onClick={voice.listening ? voice.stop : voice.start}
            aria-pressed={voice.listening}
          >
            {voice.listening ? <MicOff size={16} /> : <Mic size={16} />}
          </IconButton>
        )}
        {busy ? (
          <IconButton label="Stop answer" onClick={() => abort.current?.abort()}>
            <Square size={14} />
          </IconButton>
        ) : (
          <IconButton label="Send question" type="submit" disabled={!ready || !input.trim()}>
            <Send size={16} />
          </IconButton>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-ink-500">
        <span>{voice.error ?? 'Enter to send, Shift+Enter for a new line, Esc to close.'}</span>
        {canSpeak && (
          <button
            type="button"
            onClick={toggleSpeak}
            aria-pressed={speakOn}
            className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-ink-300 hover:text-ink-100"
          >
            {speakOn ? <Volume2 size={13} aria-hidden /> : <VolumeX size={13} aria-hidden />}
            Read answers aloud
          </button>
        )}
      </div>
    </form>
  )

  return (
    <Drawer open onClose={onClose} title="Ask AHI" icon={<Sparkles size={16} className="text-accent" aria-hidden />} footer={footer}>
      <div className="flex h-full flex-col gap-3">
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-400/[0.07] px-3 py-2 text-xs text-amber-100 ring-1 ring-amber-300/20">
          <Badge tone="sim">Simulated data</Badge>
          {DEMO_NOTE}
        </p>
        <p className="text-xs text-ink-500">
          Answers about <span className="font-semibold text-ink-300">{callsign}</span>
          {astro ? ` (${astro.role})` : ''}, using what the health engine shows right now. Medical decisions stay with the crew medical officer and the flight surgeon.
        </p>

        {availability.kind === 'checking' && (
          <p className="flex items-center gap-2 text-sm text-ink-300" role="status">
            <Loader2 size={14} className="animate-spin" aria-hidden /> Checking the assistant…
          </p>
        )}
        {availability.kind === 'offline' && <OfflineState availability={availability} onRetry={check} />}

        <div ref={logRef} role="log" aria-live="polite" aria-label="Conversation" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))}
        </div>

        {ready && messages.length === 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">Try asking</span>
            {starters.map((q) => (
              <Button key={q} variant="ghost" className="justify-start text-left" onClick={() => void ask(q)}>
                {q}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  )
}

function OfflineState({ availability, onRetry }: { availability: Extract<AssistantAvailability, { kind: 'offline' }>; onRetry: () => void }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4 text-sm text-ink-300 ring-1 ring-white/[0.08]" role="status">
      <p className="flex items-center gap-2 font-semibold text-ink-100">
        <CloudOff size={16} aria-hidden /> Assistant offline
      </p>
      <p className="mt-1">The rest of AHI keeps working: monitoring, alerts and recommendations do not need the assistant.</p>
      <p className="mt-2 text-xs text-ink-500">{availability.reason}</p>
      <p className="mt-3 text-xs font-semibold text-ink-300">To enable it</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs">
        {!availability.apiReachable && <li>Start the AHI API (see backend/README.md).</li>}
        <li>Put ANTHROPIC_API_KEY in backend/.env (never commit it).</li>
        <li>Restart the API, then retry.</li>
      </ol>
      <Button variant="ghost" className="mt-3" onClick={onRetry}>
        <RefreshCw size={13} aria-hidden /> Retry
      </Button>
    </div>
  )
}

function MessageBubble({ m }: { m: ChatMessage }) {
  if (m.role === 'user') {
    return (
      <div className="self-end rounded-2xl rounded-br-md bg-accent/15 px-3 py-2 text-sm whitespace-pre-wrap text-ink-100 ring-1 ring-accent/25">
        <span className="sr-only">You: </span>
        {m.text}
      </div>
    )
  }
  const { body, basedOn } = splitBasedOn(m.text)
  return (
    <div className={clsx('max-w-[92%] self-start rounded-2xl rounded-bl-md bg-white/[0.04] px-3 py-2 text-sm text-ink-100 ring-1', m.error ? 'ring-amber-300/30' : 'ring-white/[0.08]')}>
      <span className="sr-only">AHI assistant: </span>
      {body && <p className="whitespace-pre-wrap">{body}</p>}
      {m.pending && !body && (
        <span className="flex items-center gap-2 text-ink-500">
          <Loader2 size={13} className="animate-spin" aria-hidden /> Thinking…
        </span>
      )}
      {basedOn && <p className="mt-2 border-t border-white/[0.07] pt-1.5 text-[11px] text-ink-500">Based on: {basedOn}</p>}
      {m.error && <p className="mt-1 text-xs text-amber-200">{m.error}</p>}
    </div>
  )
}
