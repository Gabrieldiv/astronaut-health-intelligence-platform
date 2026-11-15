#!/usr/bin/env node
/**
 * i18n sweep: lists UI text in src/features/**\/*.tsx that bypasses t().
 *
 * Reports (heuristics, no TS parser needed):
 *   - JSX text literals: text between tags that contains letters (`<p>Hello</p>`)
 *   - string props `title`, `aria-label`, `placeholder`, `label`, `alt` with a literal value
 *     (`title="Hello"`, `label={'Hello'}`, `aria-label={`Hello ${x}`}`)
 * Ignores comments, pure symbols, numbers, units and tokens kept untranslated by convention.
 *
 * Usage (inside frontend/web): node scripts/i18n-sweep.mjs [--json]
 * Combine with the dev pseudo locale (?lang=qps) to see the same gaps on screen.
 *
 * Runtime pass (optional): with `--url <dev server>` (or the AHI_SWEEP_URL environment variable)
 * the script also opens the running dev app with `?lang=qps` in headless Chromium (Playwright),
 * walks a few demo states (exams, forecasts, sensor failure, a paused device, mission context,
 * crew view, alerts) and lists visible text and accessible names that are not wrapped in the
 * pseudo locale brackets. In the pseudo locale, engine text only gets brackets when the engine
 * attached a structured message, so untranslatable engine sentences show up too.
 *   npx vite --port 5184 --strictPort   (another terminal)
 *   node scripts/i18n-sweep.mjs --url http://localhost:5184
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const featuresDir = join(root, 'src', 'features')

/** Strings that are fine untranslated (protected tokens, units, symbols). */
const ALLOWED = /^(SIMULATED|REAL_PUBLIC|NO_DATA|DATA_STALE|LIVE|SNAPSHOT|UTC|FHIR|JSON|OSDR|DONKI|NASA|AHI|CUSUM|HRV|SpO₂|CO₂|bpm|ms|min|h|d|km|kg|mmHg|ppm|°C|%|[A-Z]{1,4}-?\d*|[\d\s.,:;%+/×x()·|•→←↑↓-]*)$/

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (p.endsWith('.tsx') && !p.endsWith('.test.tsx')) out.push(p)
  }
  return out
}

/** Blank out comments, keeping line numbers. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/.*$/gm, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length

const interesting = (s) => {
  const v = s.replace(/\s+/g, ' ').trim()
  if (!v || !/[A-Za-z]{2,}/.test(v)) return null
  if (ALLOWED.test(v)) return null
  return v
}

function scan(file) {
  const src = stripComments(readFileSync(file, 'utf8'))
  const found = []
  // JSX text between a tag end and the next tag or expression.
  const textRe = />([^<>{}]+)(?=[<{])/g
  for (let m; (m = textRe.exec(src)); ) {
    const before = src.slice(Math.max(0, m.index - 2), m.index + 1)
    if (/=>$/.test(before) || /[-=]>$/.test(before)) continue // arrow functions, generics
    const v = interesting(m[1])
    // Skip TypeScript generics and comparisons that look like JSX text (`Record<A, B>`, `n > 0 && x`).
    const code = /[;=()'"`?]|&&|\|\||\b(const|let|interface|type|export|case|return|Record|ReturnType)\b|^\w+: \w/.test(v)
    if (v && !code) found.push({ line: lineOf(src, m.index), kind: 'text', value: v })
  }
  // String props with literal values.
  const propRe = /\b(title|aria-label|placeholder|label|alt)=(?:"([^"]*)"|\{'([^']*)'\}|\{"([^"]*)"\}|\{`([^`]*)`\})/g
  for (let m; (m = propRe.exec(src)); ) {
    const raw = m[2] ?? m[3] ?? m[4] ?? m[5] ?? ''
    const v = interesting(raw.replace(/\$\{[^}]*\}/g, ' '))
    if (v) found.push({ line: lineOf(src, m.index), kind: m[1], value: raw.trim() })
  }
  return found.sort((a, b) => a.line - b.line)
}

const files = walk(featuresDir)
const byArea = new Map()
let total = 0
for (const f of files) {
  const hits = scan(f)
  if (!hits.length) continue
  const rel = relative(featuresDir, f).split(sep).join('/')
  const area = rel.includes('/') ? rel.split('/')[0] : rel.replace(/\.tsx$/, '')
  if (!byArea.has(area)) byArea.set(area, [])
  byArea.get(area).push({ file: `src/features/${rel}`, hits })
  total += hits.length
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(Object.fromEntries(byArea), null, 2))
} else {
  for (const [area, list] of [...byArea].sort((a, b) => a[0].localeCompare(b[0]))) {
    const n = list.reduce((s, x) => s + x.hits.length, 0)
    console.log(`\n## ${area} (${n})`)
    for (const { file, hits } of list) for (const h of hits) console.log(`  ${file}:${h.line}  [${h.kind}]  ${h.value}`)
  }
  console.log(`\n${total} candidate string(s) in ${byArea.size} area(s). Heuristic: review before translating.`)
}

// ---------------------------------------------------------------------------
// Runtime pass in the pseudo locale
// ---------------------------------------------------------------------------

const urlArg = process.argv.indexOf('--url')
const sweepUrl = urlArg > 0 ? process.argv[urlArg + 1] : process.env.AHI_SWEEP_URL

/** Numbers with units only ("72 bpm", "+0.04 logMAR", "08:00 UTC"): units stay untranslated by convention. */
const NUMERIC = /^[\s:.,;·]*([-+−±]?[\d.,:]+\s*(%|°C|µm|mm|km|dB HL|dBA|dB|logMAR|bpm|br\/min|µGy\/h|mGy|mSv|Sv|ppm|UTC|min\/s|h\/s|ms|s|h|d|g)?[\s,;·]*)+$|^[\s:.,;·]*(br\/min|µGy\/h|mGy|mSv|dBA|logMAR|bpm)[\s:.,;·]*$/

/** Strips every pseudo bracketed segment (innermost first) and returns what is left, per line. */
function leftovers(text) {
  let s = text
  for (let prev = ''; prev !== s; ) {
    prev = s
    s = s.replace(/⟦[^⟦⟧]*⟧/g, ' ')
  }
  return s
    .split(/\n+/)
    .map((x) => interesting(x.replace(/[⟦⟧]/g, ' ')))
    .filter((x) => x && !/^[A-Z]{2,}[\s,·]*$/.test(x) && !NUMERIC.test(x))
}

async function runtimeSweep(base) {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.route('**/anatomy/*.glb', (r) => r.abort('blockedbyclient'))
  const found = new Map()
  const snap = async (step) => {
    await page.waitForTimeout(400)
    const { text, attrs } = await page.evaluate(() => {
      const attrs = []
      for (const el of document.querySelectorAll('[title],[aria-label],[placeholder],[alt]'))
        for (const a of ['title', 'aria-label', 'placeholder', 'alt']) {
          const v = el.getAttribute(a)
          if (v) attrs.push(v)
        }
      return { text: document.body.innerText, attrs }
    })
    for (const v of [...leftovers(text), ...attrs.flatMap(leftovers)]) {
      if (!found.has(v)) found.set(v, new Set())
      found.get(v).add(step)
    }
  }
  // Dev store helpers exposed by src/app/App.tsx in dev builds.
  const store = (body, arg) => page.evaluate(([b, a]) => new Function('s', 'a', b)(window.__ahi, a), [body, arg])
  const ui = (body, arg) => page.evaluate(([b, a]) => new Function('u', 'a', b)(window.__ahiUi, a), [body, arg])
  const advance = (hours, stepH) => store('for (let i = 0; i < a.n; i++) s.getState().fastForward(a.ms)', { n: Math.ceil(hours / stepH), ms: stepH * 3600000 })
  const scenario = async (id) => {
    await store('s.getState().pause(); s.getState().setScenario(a)', id)
    await page.waitForTimeout(300)
  }

  await page.goto(new URL('/?lang=qps', base).href, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => 'getState' in (window.__ahi ?? {}), null, { timeout: 120000 })
  await store('s.getState().pause()')
  await snap('start')

  try {
    await page.click('[data-tour="mission-profile"]', { timeout: 10000 })
    for (const n of [0, 1, 2, 3]) {
      await page.getByRole('dialog').getByRole('radio').nth(n).click({ timeout: 5000 })
      await snap(`mission profile ${n + 1}`)
    }
    await page.keyboard.press('Escape')
  } catch (e) {
    console.warn('mission context dialog not reached:', e.message)
  }

  await scenario('SANS_PROGRESSION')
  await advance(100 * 24, 12)
  await store("s.getState().selectAstronaut('AST-01')")
  for (const r of ['eyes', 'ears', 'heart', 'brain']) {
    await store('s.getState().selectRegion(a)', r)
    await snap(`exams/${r}`)
  }

  await scenario('SENSOR_FAILURE')
  await advance(3, 0.25)
  await store('s.getState().selectRegion(null)')
  await snap('sensor failure')
  await store("s.getState().setDevicePaused('DEV-BIO-AST-01', true)")
  await advance(0.5, 0.1)
  await store("s.getState().selectAstronaut('AST-01')")
  await snap('device paused')

  await scenario('PROGRESSIVE_FATIGUE')
  await advance(72, 3)
  await store("s.getState().selectRegion('heart')")
  await snap('fatigue/heart')

  await ui("u.getState().setViewMode('crew')")
  await snap('crew view')
  await ui("u.getState().setViewMode('ground'); u.getState().setAlertsOpen(true)")
  await snap('alerts')
  await browser.close()

  const rows = [...found].sort((a, b) => a[0].localeCompare(b[0]))
  if (process.argv.includes('--json')) console.log(JSON.stringify(Object.fromEntries(rows.map(([k, v]) => [k, [...v]])), null, 2))
  else {
    console.log(`\n## runtime, pseudo locale (${rows.length})`)
    for (const [v, steps] of rows) console.log(`  [${[...steps].join(', ')}]  ${v}`)
  }
}

if (sweepUrl) await runtimeSweep(sweepUrl)
