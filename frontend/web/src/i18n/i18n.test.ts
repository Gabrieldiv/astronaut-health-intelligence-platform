import { afterEach, describe, expect, it } from 'vitest'
import { en } from './locales/en'
import ptBR from './locales/pt-BR'
import es from './locales/es'
import ja from './locales/ja'
import de from './locales/de'
import { LANGS, formatFixed, inEnglish, setLanguage, t, tp, type Lang, type Messages } from '.'
import { STATUS_META } from '../lib/status'
import { deltaVsNormal, formatUtcDate, relTime, speedLabel } from '../components/format'
import { metricLabel, regionLabel, roleLabel, scenarioName } from './catalog'
import { METRIC_CATALOG, REGION_LABELS, SCENARIOS } from '../engine/catalog'

/** Every Unicode dash punctuation except the plain hyphen, built from char codes so this file stays free of them. */
const DASHES = new RegExp('[' + [0x2012, 0x2013, 0x2014, 0x2015, 0x2e3a, 0x2e3b, 0xfe58, 0xfe63, 0xff0d].map((c) => String.fromCharCode(c)).join('') + ']')
/** Placeholder names of a message. `{n}` is optional in plural forms (English "1 open alert" spells the number). */
const placeholders = (s: string, key: string) =>
  [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))].filter((p) => !(p === 'n' && /_(one|other)$/.test(key))).sort()

const LOCALES: Record<Exclude<Lang, 'en'>, Messages> = { 'pt-BR': ptBR, es, ja, de }

afterEach(async () => {
  await setLanguage('en', { persist: false })
})

describe('locales', () => {
  const enKeys = Object.keys(en).sort()

  it('lists the five languages, English first and the only reviewed one', () => {
    expect(LANGS.map((l) => l.id)).toEqual(['en', 'pt-BR', 'es', 'ja', 'de'])
    expect(LANGS.map((l) => l.native)).toEqual(['English', 'Português (Brasil)', 'Español', '日本語', 'Deutsch'])
    expect(LANGS.filter((l) => !l.pendingReview).map((l) => l.id)).toEqual(['en'])
  })

  it('has a few hundred English keys', () => {
    expect(enKeys.length).toBeGreaterThan(500)
  })

  for (const [lang, messages] of Object.entries(LOCALES)) {
    describe(lang, () => {
      it('has exactly the English keys', () => {
        expect(Object.keys(messages).sort()).toEqual(enKeys)
      })

      it('has no empty strings', () => {
        const empty = Object.entries(messages).filter(([, v]) => typeof v !== 'string' || v.trim() === '')
        expect(empty).toEqual([])
      })

      it('keeps the same {placeholders} as English', () => {
        const bad = enKeys.filter((k) => placeholders(messages[k as keyof Messages], k).join() !== placeholders(en[k as keyof Messages], k).join())
        expect(bad).toEqual([])
      })

      it('never uses dash characters', () => {
        expect(Object.entries(messages).filter(([, v]) => DASHES.test(v))).toEqual([])
      })

      it('keeps the protected tokens untranslated', () => {
        for (const k of enKeys) {
          const src = en[k as keyof Messages]
          for (const token of ['SIMULATED', 'REAL_PUBLIC']) {
            if (src.includes(token)) expect(messages[k as keyof Messages], `${lang} ${k}`).toContain(token)
          }
        }
      })
    })
  }

  it('English has no empty strings and no dash characters', () => {
    expect(Object.entries(en).filter(([, v]) => v.trim() === '' || DASHES.test(v))).toEqual([])
  })
})

describe('English stays byte for byte identical', () => {
  // Original UI strings (before the i18n layer), copied from the components they came from.
  const SAMPLE: [keyof Messages, string][] = [
    ['tools.label', 'Tools'],
    ['tools.buttonAria', 'Tools: mission overview, shift handover, data and model, presentation mode, accessibility and sound, shortcuts'],
    ['tools.group.display', 'Display'],
    ['tools.presentation', 'Presentation mode'],
    ['tools.presentationOff', 'Larger text, fewer details (P)'],
    ['tools.shortcuts', 'Keyboard shortcuts'],
    ['topbar.view.ground', 'Ground'],
    ['topbar.view.crew', 'Crew'],
    ['topbar.demo.full', 'Start demo'],
    ['topbar.alerts.none', 'Alerts, none open (A)'],
    ['player.intro', 'Pick a scripted situation. Simulated data, for demonstration only.'],
    ['provenance.disclaimer', 'Decision support only. Not a diagnosis. Not a medical device.'],
    ['skip.main', 'Skip to main content'],
    ['shortcuts.typingNote', 'Shortcuts are ignored while you type in a field.'],
    ['attention.title.overview', 'What needs attention'],
    ['attention.disclaimer', 'Decision support only. Not a diagnosis. Simulated data.'],
    ['alerts.sound', 'Sound for critical alerts (repeats until acknowledged)'],
    ['crew.trendTitle', 'Heart rate, last 6 hours'],
    ['devices.state.PAUSED', 'Paused by operator'],
    ['datasources.title', 'Data and model'],
    ['components.baseline.title', 'Why is this my normal?'],
    ['crewview.noRecentData', 'No recent data. Missing data is never treated as normal.'],
    ['stage.building3d', 'Building 3D anatomy...'],
    ['anatomy.layers.systems', 'Anatomical systems'],
    ['a11y.title', 'Accessibility and sound'],
    ['assistant.starter2', 'Why is this alert on?'],
    ['tour.exit', 'Exit demo (Esc)'],
    ['comms.kind.HEALTH_PACKET', 'Health packet'],
    ['checkin.mood.question', 'How is your mood?'],
    ['whatif.without', 'Without action'],
    ['report.audience.FLIGHT_SURGEON', 'Flight surgeon'],
    ['shared.signalLostHeadline', 'No live readings from the wearable. Missing data is never treated as normal: check the sensor.'],
  ]

  it.each(SAMPLE)('%s', (key, original) => {
    expect(t(key)).toBe(original)
  })

  it('status words', () => {
    expect(Object.values(STATUS_META).map((m) => [m.label, m.crewLabel])).toEqual([
      ['Nominal', 'All good'],
      ['Watch', 'Keep an eye'],
      ['Warning', 'Act soon'],
      ['Critical', 'Act now'],
      ['No data', 'Signal lost'],
    ])
  })

  it('catalog labels come from the engine catalog', () => {
    for (const d of Object.values(METRIC_CATALOG)) expect(metricLabel(d.code)).toBe(d.label)
    for (const [id, r] of Object.entries(REGION_LABELS)) expect(regionLabel(id as keyof typeof REGION_LABELS)).toBe(r.label)
    for (const s of SCENARIOS) expect(scenarioName(s)).toBe(s.name)
    expect(roleLabel('Commander')).toBe('Commander')
    expect(roleLabel('Payload Specialist')).toBe('Payload Specialist')
  })

  it('format helpers', () => {
    const now = Date.UTC(2026, 9, 1, 12)
    expect(relTime(now - 30_000, now)).toBe('just now')
    expect(relTime(now - 5 * 60_000, now)).toBe('5 min ago')
    expect(relTime(now - 3 * 3600_000, now)).toBe('3 h ago')
    expect(formatUtcDate(now)).toBe('1 Oct 2026')
    expect(speedLabel(1)).toBe('Real time')
    expect(formatFixed(1234.5, 1)).toBe('1234.5')
    const ms = { current: 110, baseline: { status: 'READY', low: 60, high: 80, median: 70, mean: 70 } } as never
    expect(deltaVsNormal(ms)).toMatchObject({ text: '57% above your normal', short: '+57% vs normal' })
  })

  it('plurals', () => {
    expect(tp('anatomy.describe.structures', 1)).toBe('1 structure')
    expect(tp('anatomy.describe.structures', 3)).toBe('3 structures')
  })
})

describe('switching language', () => {
  it('translates status words, numbers and dates, and inEnglish() keeps outgoing text English', async () => {
    await setLanguage('de', { persist: false })
    expect(STATUS_META.CRITICAL.crewLabel).toBe('Jetzt handeln')
    expect(formatFixed(36.6, 1)).toBe('36,6')
    expect(formatUtcDate(Date.UTC(2026, 9, 1))).toBe('1. Okt. 2026')
    expect(inEnglish(() => `${STATUS_META.CRITICAL.label} ${formatFixed(36.6, 1)}`)).toBe('Critical 36.6')

    await setLanguage('ja', { persist: false })
    expect(t('tools.language')).toBe('言語')

    await setLanguage('en', { persist: false })
    expect(STATUS_META.CRITICAL.crewLabel).toBe('Act now')
  })
})
