import { describe, expect, it } from 'vitest'
import { useAppStore } from '../../state/store'
import type { MetricState } from '../../types/domain'
import { buildAssistantContext, clip, metricReading, type ContextSource } from './context'
import { createSseParser, speakableText, splitBasedOn, toHistory, type ChatMessage } from './chat'
import { LIMITS } from './types'

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`)

describe('buildAssistantContext', () => {
  it('describes the selected astronaut from the engine outputs, grounded and bounded', () => {
    const app = useAppStore.getState()
    app.pause()
    app.setScenario('ACUTE_CARDIO')
    useAppStore.getState().fastForward(3 * 3600_000)
    useAppStore.getState().selectAstronaut('AST-01')
    const s = useAppStore.getState()
    const ctx = buildAssistantContext(s)

    expect(ctx.schema_version).toBe('1')
    expect(ctx.data_origin).toBe('SIMULATED')
    expect(ctx.astronaut).toEqual({ id: 'AST-01', callsign: 'ORION', role: 'Commander' })
    expect(ctx.overall.status).toBe(s.health['AST-01']!.risk.risk_level)
    expect(ctx.mission.scenario).toBe('Acute cardio event')
    expect(ctx.mission.earth_link).toMatch(/ISS/)
    expect(ctx.crew_overview.map((c) => c.callsign)).toEqual(['ORION', 'LYRA', 'VEGA', 'ATLAS'])

    // Astronaut readings exclude cabin metrics; the cabin has its own block.
    const codes = ctx.metrics.map((m) => m.code)
    expect(codes).toContain('HEART_RATE')
    expect(codes).not.toContain('CO2')
    expect(ctx.cabin!.metrics.map((m) => m.code)).toContain('CO2')
    const hr = ctx.metrics.find((m) => m.code === 'HEART_RATE')!
    expect(hr.unit).toBe('bpm')
    if (hr.baseline_ready) expect(hr.normal_low).toBeLessThan(hr.normal_high!)

    // Only open alerts for this astronaut or the cabin.
    const open = s.alerts.filter((a) => a.acknowledgedAt == null && a.resolvedAt == null && (a.astronautId === 'AST-01' || a.astronautId === null))
    expect(ctx.open_alerts.length).toBe(Math.min(open.length, LIMITS.alerts))
    expect(ctx.open_alerts.length).toBeGreaterThan(0)
    expect(ctx.recommendations.every((r) => r.title.length <= LIMITS.text)).toBe(true)

    // Well under the API request limit (64 kB with the conversation).
    expect(JSON.stringify(ctx).length).toBeLessThan(16_000)
    expect(ctx.metrics.length).toBeLessThanOrEqual(LIMITS.metrics)
  })

  it('follows the selection and never writes to the store', () => {
    useAppStore.getState().selectAstronaut('AST-03')
    const before = useAppStore.getState()
    const ctx = buildAssistantContext(before)
    expect(ctx.astronaut.callsign).toBe('VEGA')
    expect(useAppStore.getState()).toBe(before)
  })

  it('sends missing data as null with NO_DATA, never as a number', () => {
    const s = useAppStore.getState()
    const hr = s.health['AST-01']!.metrics.HEART_RATE!
    const silent: MetricState = { ...hr, status: 'NO_DATA', current: 72 }
    expect(metricReading(silent).value).toBeNull()
    expect(metricReading(silent).status).toBe('NO_DATA')
    const noBaseline: MetricState = { ...hr, baseline: null }
    expect(metricReading(noBaseline)).toMatchObject({ baseline_ready: false, normal_low: null, normal_high: null })
  })

  it('reports NO_DATA overall when an astronaut has no health yet', () => {
    const s = useAppStore.getState()
    const src: ContextSource = { ...s, health: {}, selectedAstronautId: 'AST-02' }
    const ctx = buildAssistantContext(src)
    expect(ctx.overall.status).toBe('NO_DATA')
    expect(ctx.metrics).toEqual([])
    expect(ctx.crew_overview.every((c) => c.status === 'NO_DATA')).toBe(true)
  })

  it('clips long text to the API limits', () => {
    expect(clip('a'.repeat(700), LIMITS.text).length).toBe(LIMITS.text)
    expect(clip('  two   spaces ', 50)).toBe('two spaces')
    expect(clip(null, 10)).toBe('')
  })
})

describe('toHistory', () => {
  const m = (role: ChatMessage['role'], text: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({ id: text, role, text, ...extra })

  it('keeps complete pairs only and drops failed or pending answers with their question', () => {
    const h = toHistory([m('user', 'q1'), m('assistant', 'a1'), m('user', 'q2'), m('assistant', '', { error: 'offline' }), m('user', 'q3'), m('assistant', 'a3', { pending: true })])
    expect(h).toEqual([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
    ])
  })

  it('keeps the most recent turns within the API limit, starting with a user turn', () => {
    const list: ChatMessage[] = []
    for (let i = 0; i < 10; i++) list.push(m('user', `q${i}`), m('assistant', `a${i}`))
    const h = toHistory(list)
    expect(h.length).toBe(LIMITS.historyTurns)
    expect(h[0]).toEqual({ role: 'user', content: 'q4' })
    expect(h.at(-1)).toEqual({ role: 'assistant', content: 'a9' })
  })
})

describe('SSE parser', () => {
  it('assembles events split across chunks and skips junk', () => {
    const parse = createSseParser()
    expect(parse('data: {"type":"meta","provider":"anthropic","model":"m","data_origin":"SIMULATED"}\n\ndata: {"type":"del')).toHaveLength(1)
    expect(parse('ta","text":"Hi"}\n\n: comment\n\ndata: not json\n\n')).toEqual([{ type: 'delta', text: 'Hi' }])
    expect(parse('data: {"type":"done","stop_reason":"end_turn"}\r\n\r\n')).toEqual([{ type: 'done', stop_reason: 'end_turn' }])
  })
})

describe('answer helpers', () => {
  const answer = 'ORION is a bit above normal. The data is simulated.\n\nBased on: heart rate 96 bpm, normal 58 to 74'

  it('splits the Based on line', () => {
    expect(splitBasedOn(answer)).toEqual({ body: 'ORION is a bit above normal. The data is simulated.', basedOn: 'heart rate 96 bpm, normal 58 to 74' })
    expect(splitBasedOn('No source line.')).toEqual({ body: 'No source line.', basedOn: null })
  })

  it('reads the answer aloud without the Based on line or markdown', () => {
    expect(speakableText(`**Note:** ${answer}`)).toBe('Note: ORION is a bit above normal. The data is simulated.')
  })

  it('keeps the UI copy free of dashes', async () => {
    const { DEMO_NOTE } = await import('./AssistantPanel')
    expect(DEMO_NOTE).toBe('Demo: answers come from a cloud AI model. Not medical advice.')
    expect(DASHES.test(DEMO_NOTE)).toBe(false)
  })
})
