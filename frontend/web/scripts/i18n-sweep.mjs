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
