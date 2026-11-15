/**
 * Assistant transport: conversation history, server sent event parsing and the two API calls.
 * The app never depends on the assistant: every failure becomes an "offline" or "error" state.
 */
import { apiBaseUrl } from '../../lib/api/client'
import { LIMITS, type AssistantStatusResponse, type ChatEvent, type ChatRequest, type ChatTurn } from './types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** True while the answer is still streaming. */
  pending?: boolean
  /** Set when the answer failed; failed exchanges are never sent back as history. */
  error?: string
}

/**
 * History for the API: complete user/assistant pairs only, oldest first, the most recent pairs that
 * fit LIMITS.historyTurns. Failed or unfinished answers drop their question too.
 */
export function toHistory(messages: ChatMessage[]): ChatTurn[] {
  const pairs: ChatTurn[][] = []
  for (let i = 0; i < messages.length - 1; i++) {
    const q = messages[i]!
    const a = messages[i + 1]!
    if (q.role === 'user' && a.role === 'assistant' && !a.pending && !a.error && a.text.trim() && q.text.trim()) {
      pairs.push([
        { role: 'user', content: q.text.slice(0, LIMITS.turn) },
        { role: 'assistant', content: a.text.slice(0, LIMITS.turn) },
      ])
      i++
    }
  }
  return pairs.slice(-Math.floor(LIMITS.historyTurns / 2)).flat()
}

/** Incremental SSE parser: feed text chunks, get complete events. Unknown or broken lines are skipped. */
export function createSseParser(): (chunk: string) => ChatEvent[] {
  let buffer = ''
  return (chunk) => {
    buffer += chunk.replace(/\r\n/g, '\n')
    const out: ChatEvent[] = []
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const data = block
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).replace(/^ /, ''))
        .join('\n')
      if (!data) continue
      try {
        const ev = JSON.parse(data) as ChatEvent
        if (ev && typeof ev === 'object' && typeof ev.type === 'string') out.push(ev)
      } catch {
        /* skip a malformed event */
      }
    }
    return out
  }
}

/** Removes the trailing "Based on: ..." line for speech (it is shown on screen). */
export function speakableText(answer: string): string {
  return answer
    .split('\n')
    .filter((l) => !/^\s*based on:/i.test(l))
    .join(' ')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Splits an answer into body and its "Based on:" line (null when the model left it out). */
export function splitBasedOn(answer: string): { body: string; basedOn: string | null } {
  const m = answer.match(/\n?\s*based on:\s*([^\n]*)\s*$/i)
  if (!m || m.index === undefined) return { body: answer, basedOn: null }
  return { body: answer.slice(0, m.index).trimEnd(), basedOn: m[1]!.trim() }
}

export type AssistantAvailability =
  | { kind: 'checking' }
  | { kind: 'ready'; model: string }
  | { kind: 'offline'; reason: string; apiReachable: boolean }

export class AssistantHttpError extends Error {
  readonly status: number | null
  constructor(message: string, status: number | null) {
    super(message)
    this.name = 'AssistantHttpError'
    this.status = status
  }
}

async function detail(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
  } catch {
    /* not JSON */
  }
  return `HTTP ${res.status}`
}

export async function fetchAssistantStatus(timeoutMs = 2500): Promise<AssistantAvailability> {
  const base = apiBaseUrl()
  if (base === null) return { kind: 'offline', reason: 'The AHI API is disabled in this build.', apiReachable: false }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}/api/v1/assistant/status`, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return { kind: 'offline', reason: `The AHI API has no assistant (${await detail(res)}).`, apiReachable: true }
    const s = (await res.json()) as Partial<AssistantStatusResponse>
    if (s.configured) return { kind: 'ready', model: String(s.model ?? '') }
    return { kind: 'offline', reason: String(s.note ?? 'Assistant not configured.'), apiReachable: true }
  } catch {
    return { kind: 'offline', reason: 'The AHI API is not running.', apiReachable: false }
  } finally {
    clearTimeout(timer)
  }
}

/** POSTs a question and calls onEvent for each streamed event. Throws AssistantHttpError before the stream starts. */
export async function streamChat(req: ChatRequest, onEvent: (ev: ChatEvent) => void, signal: AbortSignal): Promise<void> {
  const base = apiBaseUrl()
  if (base === null) throw new AssistantHttpError('The AHI API is disabled in this build.', null)
  let res: Response
  try {
    res = await fetch(`${base}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(req),
      signal,
    })
  } catch (e) {
    if (signal.aborted) throw e
    throw new AssistantHttpError('The AHI API is not running.', null)
  }
  if (!res.ok || !res.body) throw new AssistantHttpError(await detail(res), res.status)
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  const parse = createSseParser()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    for (const ev of parse(value)) onEvent(ev)
  }
}
