import { Check, FileJson, FileText, Printer, RefreshCw, Send } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../../state/store'
import { STATUS_META, statusLabelEn } from '../../lib/status'
import { METRIC_CATALOG } from '../../engine/catalog'
import type { Alert, AppState, Astronaut, CheckIn, CommMessage, CommProfile, ContributingFactor, Intervention, Prediction, Recommendation, Status } from '../../types/domain'
import { StatusIcon } from '../../components/Status'
import { Button } from '../../components/ui'
import { formatHours, formatMET, formatUtcDate, formatUtcTime } from '../../components/format'
import { buildFhirBundle, downloadJson } from '../../lib/fhir'
import { Modal, TOPBAR_BUTTON } from '../mission/Modal'
import { MENU_ITEM, MenuRow } from '../topbar/menu'
import { COMM_KIND_LABEL, formatDelay } from '../comms/delay'
import { INTERVENTION_LABEL } from '../timeline/labels'
import { inEnglish, t, translatedRecord, useT } from '../../i18n'
import { commProfileLabel, metricLabel, regionLabel, roleLabel, scenarioName } from '../../i18n/catalog'
import { alertTitle, engineText, recTitle } from '../../i18n/engineText'

const H = 3600000
const WINDOW_H = 24
const PRIORITY_LABEL: Record<Recommendation['priority'], string> = translatedRecord(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const, (k) => t(`report.priority.${k}`))
const AUDIENCE_LABEL: Record<Recommendation['audience'], string> = translatedRecord(['CREW', 'FLIGHT_SURGEON', 'MISSION_CONTROL'] as const, (k) => t(`report.audience.${k}`))
const PHASE_LABEL = translatedRecord(['PRE_FLIGHT', 'IN_FLIGHT', 'POST_FLIGHT'] as const, (k) => t(`report.phase.${k}`))

const SCALE_WORDS = {
  mood: ['very low', 'low', 'okay', 'good', 'very good'],
  fatigue: ['rested', 'slightly tired', 'tired', 'very tired', 'exhausted'],
  stress: ['calm', 'a little', 'moderate', 'high', 'very high'],
  sleepQuality: ['very poor', 'poor', 'fair', 'good', 'very good'],
} as const

interface CrewSection {
  astronaut: Astronaut
  status: Status
  headline: string
  factors: ContributingFactor[]
  confidence: number | null
  alerts: Alert[]
  interventions: Intervention[]
  checkIns: CheckIn[]
  pending: Recommendation[]
  forecasts: Prediction[]
}

interface Snapshot {
  at: number
  from: number
  state: AppState
  profile: CommProfile | undefined
  crew: CrewSection[]
  cabin: { status: Status; headline: string; alerts: Alert[]; forecasts: Prediction[]; pending: Recommendation[] }
  comms: CommMessage[]
}

function notableForecasts(preds: Partial<Record<string, Prediction>> | undefined): Prediction[] {
  return Object.values(preds ?? {})
    .filter((p): p is Prediction => !!p && p.eligible && p.hoursToBandExit != null)
    .sort((a, b) => (a.hoursToBandExit ?? 0) - (b.hoursToBandExit ?? 0))
}

// The snapshot keeps English (the plain text handover stays English); the page translates on render.
const NO_LIVE_EN = 'No live readings from the wearable. Missing data is never treated as normal.'
const NO_HEALTH_EN = 'No health data available.'
const NO_CABIN_EN = 'Cabin environment summary not available.'

function headlineText(english: string): string {
  if (english === NO_LIVE_EN) return t('report.noLiveReadings')
  if (english === NO_HEALTH_EN) return t('report.noHealthData')
  if (english === NO_CABIN_EN) return t('report.cabinNoSummary')
  return engineText('headline', english)
}

function buildSnapshot(s: AppState): Snapshot {
  const at = s.clock.simNow
  const from = at - WINDOW_H * H
  const inWindow = (t: number) => t >= from && t <= at
  const byTimeDesc = <T,>(arr: T[], key: (x: T) => number) => [...arr].sort((a, b) => key(b) - key(a))
  const pendingFor = (id: string) =>
    s.recommendations
      .filter((r) => r.astronautId === id && r.status === 'PENDING' && r.active !== false)
      .sort((a, b) => STATUS_META[b.priority].rank - STATUS_META[a.priority].rank || b.createdAt - a.createdAt)
  const crew: CrewSection[] = s.crew.map((c) => {
    const h = s.health[c.id]
    const lost = !h || (h.metrics.HEART_RATE?.current == null && h.metrics.SPO2?.current == null)
    const level: Status = !h ? 'NO_DATA' : lost && h.risk.risk_level === 'LOW' ? 'NO_DATA' : h.risk.risk_level
    return {
      astronaut: c,
      status: level,
      headline: h ? (lost ? NO_LIVE_EN : h.risk.headline) : NO_HEALTH_EN,
      factors: [...(h?.risk.contributing_factors ?? [])].sort((a, b) => b.weight - a.weight).slice(0, 3),
      confidence: h ? h.risk.confidence : null,
      alerts: byTimeDesc(
        s.alerts.filter((a) => a.astronautId === c.id && (inWindow(a.createdAt) || (a.acknowledgedAt == null && a.resolvedAt == null))),
        (a) => a.createdAt,
      ),
      interventions: byTimeDesc(
        s.interventions.filter((i) => i.astronautId === c.id && inWindow(i.loggedAt)),
        (i) => i.loggedAt,
      ),
      checkIns: byTimeDesc(
        s.checkIns.filter((k) => k.astronautId === c.id && inWindow(k.at)),
        (k) => k.at,
      ),
      pending: pendingFor(c.id),
      forecasts: notableForecasts(h?.predictions),
    }
  })
  return {
    at,
    from,
    state: s,
    profile: s.commProfiles.find((p) => p.id === s.commProfileId),
    crew,
    cabin: {
      status: s.environment.status,
      headline: s.environment.headline ?? NO_CABIN_EN,
      alerts: byTimeDesc(
        s.alerts.filter((a) => a.astronautId == null && (inWindow(a.createdAt) || (a.acknowledgedAt == null && a.resolvedAt == null))),
        (a) => a.createdAt,
      ),
      forecasts: notableForecasts(s.environment.predictions),
      pending: pendingFor('CABIN'),
    },
    comms: byTimeDesc(
      s.comms.filter((m) => inWindow(m.sentAt) || inWindow(m.arrivesAt)),
      (m) => m.sentAt,
    ),
  }
}

function stamp(t: number): string {
  return `${formatUtcDate(t)} ${formatUtcTime(t, false)} UTC`
}

function alertState(a: Alert, at: number): string {
  if (a.acknowledgedAt != null) return t('report.alert.acknowledged', { who: a.acknowledgedBy ?? t('report.alert.crew'), time: formatUtcTime(a.acknowledgedAt, false) })
  if (a.resolvedAt != null && a.resolvedAt <= at) return t('report.alert.resolved', { time: formatUtcTime(a.resolvedAt, false) })
  return a.escalatedAt != null ? t('report.alert.escalated') : t('report.alert.open')
}

function alertWhere(a: Alert): string {
  if (a.metric) return metricLabel(a.metric)
  if (a.region === 'environment') return t('report.cabinEnvironment')
  if (a.region) return regionLabel(a.region)
  return ''
}

function checkInText(k: CheckIn): string {
  const w = (key: keyof typeof SCALE_WORDS, v: number) => SCALE_WORDS[key][Math.min(5, Math.max(1, Math.round(v))) - 1]
  const sym = k.symptoms.filter((x) => x !== 'none')
  return `mood ${w('mood', k.mood)}, fatigue ${w('fatigue', k.fatigue)}, stress ${w('stress', k.stress)}, sleep ${w('sleepQuality', k.sleepQuality)}; symptoms: ${sym.length ? sym.join(', ') : 'none'}${k.note ? `; note: "${k.note}"` : ''}`
}

/** English forecast line for the plain text sent to ground. */
function forecastText(p: Prediction): string {
  return `${METRIC_CATALOG[p.metric].label} projected to leave the personal normal range in ${formatHours(p.hoursToBandExit!)} (${p.method}, ${p.intervalLabel})`
}

/** Forecast line for the on screen report, in the current language. */
function forecastLabel(p: Prediction): string {
  return t('report.forecast', { metric: metricLabel(p.metric), hours: formatHours(p.hoursToBandExit!), method: p.method, interval: p.intervalLabel })
}

/** Plain text version sent to ground (kept short: Earth link bandwidth). Always English. */
function reportText(snap: Snapshot): string {
  return inEnglish(() => reportTextEn(snap))
}

function reportTextEn(snap: Snapshot): string {
  const s = snap.state
  const lines: string[] = [
    `SHIFT HANDOVER REPORT (SIMULATED DATA)`,
    `${s.mission.name}, ${s.mission.vehicle}. Period ${stamp(snap.from)} to ${stamp(snap.at)}. MET ${formatMET(s.mission.startedAt, snap.at)}.`,
    '',
  ]
  for (const c of snap.crew) {
    lines.push(`${c.astronaut.callsign} (${c.astronaut.roleShort}): ${statusLabelEn(c.status)}. ${c.headline}`)
    if (c.factors.length) lines.push(`  Factors: ${c.factors.map((f) => f.label).join('; ')}`)
    const open = c.alerts.filter((a) => a.acknowledgedAt == null && a.resolvedAt == null)
    lines.push(`  Alerts 24 h: ${c.alerts.length} (${open.length} open). Actions logged: ${c.interventions.length}. Pending recommendations: ${c.pending.length}.`)
    for (const p of c.forecasts.slice(0, 2)) lines.push(`  Forecast: ${forecastText(p)}`)
  }
  lines.push(`Cabin: ${statusLabelEn(snap.cabin.status)}. ${snap.cabin.headline}`)
  lines.push('', 'Decision support only. Not a diagnosis. Demo configuration, not official limits.')
  return lines.join('\n')
}

function StatusChip({ status }: { status: Status }) {
  return (
    <span className="rp-status">
      <StatusIcon status={status} size={12} />
      {STATUS_META[status].crewLabel} · {STATUS_META[status].label}
    </span>
  )
}

function Empty({ children }: { children: string }) {
  return <p className="rp-empty">{children}</p>
}

function CrewBlock({ c, at }: { c: CrewSection; at: number }) {
  useT()
  return (
    <section className="rp-section">
      <div className="rp-crew-head">
        <h3 className="rp-h3">
          <span className="rp-dot" style={{ background: c.astronaut.color }} aria-hidden />
          {c.astronaut.callsign} <span className="rp-muted">· {roleLabel(c.astronaut.role)}</span>
        </h3>
        <StatusChip status={c.status} />
      </div>
      <p className="rp-headline">{headlineText(c.headline)}</p>
      <div className="rp-grid">
        <div>
          <h4 className="rp-h4">{t('report.factors')}</h4>
          {c.factors.length ? (
            <ul className="rp-list">
              {c.factors.map((f) => (
                <li key={f.label}>{engineText('factor', f.label, f.msg)}</li>
              ))}
            </ul>
          ) : (
            <Empty>{t('report.factorsNone')}</Empty>
          )}
          {c.confidence != null && c.confidence < 0.7 && <p className="rp-note">{t('report.lowConfidence', { pct: Math.round(c.confidence * 100) })}</p>}
        </div>
        <div>
          <h4 className="rp-h4">{t('report.forecasts')}</h4>
          {c.forecasts.length ? (
            <ul className="rp-list">
              {c.forecasts.slice(0, 3).map((p) => (
                <li key={p.metric}>{forecastLabel(p)}</li>
              ))}
            </ul>
          ) : (
            <Empty>{t('report.forecastsNone')}</Empty>
          )}
        </div>
      </div>
      <h4 className="rp-h4">{t('report.alerts')}</h4>
      {c.alerts.length ? (
        <table className="rp-table">
          <tbody>
            {c.alerts.slice(0, 8).map((a) => (
              <tr key={a.id}>
                <td className="rp-time tabular">{formatUtcTime(a.createdAt, false)}</td>
                <td className="rp-sev">
                  <StatusIcon status={a.severity} size={11} /> {STATUS_META[a.severity].label}
                </td>
                <td>
                  {alertTitle(a)}
                  {alertWhere(a) && <span className="rp-muted"> · {alertWhere(a)}</span>}
                </td>
                <td className="rp-muted">{alertState(a, at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>{t('report.alertsNone')}</Empty>
      )}
      {c.alerts.length > 8 && <p className="rp-note">{t('report.andMore', { n: c.alerts.length - 8 })}</p>}
      <div className="rp-grid">
        <div>
          <h4 className="rp-h4">{t('report.actions')}</h4>
          {c.interventions.length ? (
            <ul className="rp-list">
              {c.interventions.map((i) => (
                <li key={i.id}>
                  <span className="tabular rp-muted">{formatUtcTime(i.loggedAt, false)}</span> {t('report.actionBy', { action: INTERVENTION_LABEL[i.kind], actor: i.actor })}
                  {i.note ? `: ${i.note}` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t('report.noneLast24')}</Empty>
          )}
        </div>
        <div>
          <h4 className="rp-h4">{t('report.checkins')}</h4>
          {c.checkIns.length ? (
            <ul className="rp-list">
              {c.checkIns.map((k) => (
                <li key={k.id}>
                  <span className="tabular rp-muted">{formatUtcTime(k.at, false)}</span> {checkInText(k)} <span className="rp-muted">({k.data_origin === 'MANUAL' ? t('report.typedByCrew') : t('report.simulated')})</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{t('report.checkinsNone')}</Empty>
          )}
        </div>
      </div>
      <h4 className="rp-h4">{t('report.pending')}</h4>
      {c.pending.length ? (
        <ul className="rp-list">
          {c.pending.map((r) => (
            <li key={r.id}>
              <strong>{recTitle(r)}</strong>{' '}
              <span className="rp-muted">
                ({t('report.priorityWord', { priority: PRIORITY_LABEL[r.priority] })}, {AUDIENCE_LABEL[r.audience]}
                {r.requiresHumanReview ? t('report.needsReview') : ''}
                {r.autonomy === 'GROUND_REVIEW' ? t('report.groundReview') : r.autonomy === 'ONBOARD' ? t('report.onBoard') : ''})
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{t('report.pendingNone')}</Empty>
      )}
    </section>
  )
}

const REPORT_CSS = `
.ahi-report { --rp-fg:#e8eefc; --rp-soft:#a9b6cf; --rp-muted:#7d8ba6; --rp-line:rgba(255,255,255,0.08); --rp-card:rgba(255,255,255,0.03); color:var(--rp-fg); font-size:13px; line-height:1.5; }
.ahi-report .rp-h1 { font-size:20px; font-weight:700; letter-spacing:0.01em; margin:0; }
.ahi-report .rp-h2 { font-size:11px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:var(--rp-muted); margin:22px 0 8px; }
.ahi-report .rp-h3 { font-size:15px; font-weight:600; margin:0; display:flex; align-items:center; gap:8px; }
.ahi-report .rp-h4 { font-size:10.5px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:var(--rp-muted); margin:12px 0 4px; }
.ahi-report .rp-muted { color:var(--rp-muted); font-weight:400; }
.ahi-report .rp-dot { width:9px; height:9px; border-radius:999px; display:inline-block; }
.ahi-report .rp-meta { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:8px 18px; margin-top:12px; padding:12px 14px; border-radius:12px; background:var(--rp-card); border:1px solid var(--rp-line); }
.ahi-report .rp-meta dt { font-size:10px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:var(--rp-muted); }
.ahi-report .rp-meta dd { margin:2px 0 0; color:var(--rp-fg); font-variant-numeric:tabular-nums; }
.ahi-report .rp-sim { display:inline-block; font-size:10px; font-weight:700; letter-spacing:0.08em; padding:1px 6px; border-radius:6px; color:#ddd6fe; background:rgba(167,139,250,0.12); border:1px solid rgba(196,181,253,0.35); }
.ahi-report .rp-section { margin-top:12px; padding:14px 16px; border-radius:12px; background:var(--rp-card); border:1px solid var(--rp-line); }
.ahi-report .rp-crew-head { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
.ahi-report .rp-headline { margin:6px 0 0; color:var(--rp-soft); }
.ahi-report .rp-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 24px; }
.ahi-report .rp-list { margin:0; padding-left:16px; color:var(--rp-soft); list-style:disc; }
.ahi-report .rp-list li::marker { color:var(--rp-muted); }
.ahi-report .rp-list li { margin:2px 0; }
.ahi-report .rp-list strong { color:var(--rp-fg); font-weight:600; }
.ahi-report .rp-empty { margin:0; color:var(--rp-muted); font-size:12px; }
.ahi-report .rp-note { margin:4px 0 0; color:var(--rp-muted); font-size:11.5px; }
.ahi-report .rp-status { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; padding:2px 10px; border-radius:999px; border:1px solid var(--rp-line); background:rgba(255,255,255,0.04); white-space:nowrap; }
.ahi-report .rp-table { width:100%; border-collapse:collapse; font-size:12px; }
.ahi-report .rp-table td, .ahi-report .rp-table th { padding:5px 8px 5px 0; border-bottom:1px solid var(--rp-line); vertical-align:top; text-align:left; }
.ahi-report .rp-table th { font-size:10px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:var(--rp-muted); }
.ahi-report .rp-table tr:last-child td { border-bottom:0; }
.ahi-report .rp-time { width:48px; color:var(--rp-muted); white-space:nowrap; }
.ahi-report .rp-sev { width:84px; white-space:nowrap; }
.ahi-report svg { display:inline-block; vertical-align:-2px; }
.ahi-report .rp-disclaimer { margin-top:20px; padding:12px 14px; border-radius:12px; border:1px dashed var(--rp-line); color:var(--rp-muted); font-size:11.5px; }
.ahi-report .rp-disclaimer p { margin:2px 0; }
@media (max-width: 640px) { .ahi-report .rp-grid { grid-template-columns:1fr; } }
@media print {
  @page { margin: 14mm; }
  html:has(.ahi-print-host), html:has(.ahi-print-host) body, html:has(.ahi-print-host) #root { height:auto !important; overflow:visible !important; background:#fff !important; }
  body:has(.ahi-print-host) > *:not(.ahi-print-host) { display:none !important; }
  .ahi-print-host { position:static !important; display:block !important; padding:0 !important; }
  .ahi-print-host .ahi-modal-scrim, .ahi-print-host .ahi-no-print { display:none !important; }
  .ahi-print-host .ahi-modal-panel { position:static !important; max-width:none !important; max-height:none !important; border:0 !important; box-shadow:none !important; background:#fff !important; backdrop-filter:none !important; -webkit-backdrop-filter:none !important; animation:none !important; border-radius:0 !important; }
  .ahi-print-host .ahi-modal-body { overflow:visible !important; padding:0 !important; }
  .ahi-report { --rp-fg:#0f172a; --rp-soft:#1f2937; --rp-muted:#4b5563; --rp-line:#d1d5db; --rp-card:#fff; font-size:11.5px; }
  .ahi-report .rp-section { break-inside:avoid; page-break-inside:avoid; }
  .ahi-report .rp-sim { color:#4c1d95; background:#fff; border-color:#7c3aed; }
  .ahi-report .rp-status { background:#fff; color:#0f172a; }
  .ahi-report * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`

function ReportDocument({ snap }: { snap: Snapshot }) {
  const s = snap.state
  const p = snap.profile
  useT()
  const scenario = s.scenarios.find((x) => x.id === s.clock.scenarioId)
  return (
    <article className="ahi-report" aria-label={t('report.aria')}>
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 className="rp-h1">{t('report.title')}</h1>
            <div className="rp-muted">
              {s.mission.name} · {s.mission.vehicle} · {PHASE_LABEL[s.mission.phase]}
            </div>
          </div>
          <span className="rp-sim">{t('report.simulatedData')}</span>
        </div>
        <dl className="rp-meta">
          <div>
            <dt>{t('report.period')}</dt>
            <dd>
              {t('report.periodValue', {
                from: `${formatUtcDate(snap.from).replace(/ \d{4}$/, '')} ${formatUtcTime(snap.from, false)}`,
                to: `${formatUtcDate(snap.at).replace(/ \d{4}$/, '')} ${formatUtcTime(snap.at, false)}`,
              })}
            </dd>
          </div>
          <div>
            <dt>{t('report.generated')}</dt>
            <dd>
              {stamp(snap.at)} · MET {formatMET(s.mission.startedAt, snap.at)}
            </dd>
          </div>
          <div>
            <dt>{t('report.earthLink')}</dt>
            <dd>{p ? t('report.earthLinkValue', { label: commProfileLabel(p), delay: formatDelay(p.oneWayDelaySec) }) : t('report.unknown')}</dd>
          </div>
          <div>
            <dt>{t('report.scenario')}</dt>
            <dd>{scenario ? scenarioName(scenario) : s.clock.scenarioId}</dd>
          </div>
        </dl>
      </header>

      <h2 className="rp-h2">{t('report.atAGlance')}</h2>
      <table className="rp-table">
        <thead>
          <tr>
            <th>{t('report.col.crew')}</th>
            <th>{t('report.col.status')}</th>
            <th>{t('report.col.summary')}</th>
            <th style={{ textAlign: 'right' }}>{t('report.col.openAlerts')}</th>
            <th style={{ textAlign: 'right' }}>{t('report.col.todo')}</th>
          </tr>
        </thead>
        <tbody>
          {snap.crew.map((c) => (
            <tr key={c.astronaut.id}>
              <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                {c.astronaut.callsign} <span className="rp-muted">{c.astronaut.roleShort}</span>
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <StatusIcon status={c.status} size={12} /> {STATUS_META[c.status].label}
              </td>
              <td className="rp-muted">{headlineText(c.headline)}</td>
              <td className="tabular" style={{ textAlign: 'right' }}>
                {c.alerts.filter((a) => a.acknowledgedAt == null && a.resolvedAt == null).length}
              </td>
              <td className="tabular" style={{ textAlign: 'right' }}>
                {c.pending.length}
              </td>
            </tr>
          ))}
          <tr>
            <td style={{ fontWeight: 600 }}>{t('report.cabin')}</td>
            <td style={{ whiteSpace: 'nowrap' }}>
              <StatusIcon status={snap.cabin.status} size={12} /> {STATUS_META[snap.cabin.status].label}
            </td>
            <td className="rp-muted">{headlineText(snap.cabin.headline)}</td>
            <td className="tabular" style={{ textAlign: 'right' }}>
              {snap.cabin.alerts.filter((a) => a.acknowledgedAt == null && a.resolvedAt == null).length}
            </td>
            <td className="tabular" style={{ textAlign: 'right' }}>
              {snap.cabin.pending.length}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="rp-h2">{t('report.details')}</h2>
      {snap.crew.map((c) => (
        <CrewBlock key={c.astronaut.id} c={c} at={snap.at} />
      ))}

      <h2 className="rp-h2">{t('report.cabinEnvironment')}</h2>
      <section className="rp-section">
        <div className="rp-crew-head">
          <h3 className="rp-h3">{t('report.cabin')}</h3>
          <StatusChip status={snap.cabin.status} />
        </div>
        <p className="rp-headline">{headlineText(snap.cabin.headline)}</p>
        <h4 className="rp-h4">{t('report.alerts')}</h4>
        {snap.cabin.alerts.length ? (
          <ul className="rp-list">
            {snap.cabin.alerts.slice(0, 8).map((a) => (
              <li key={a.id}>
                <span className="tabular rp-muted">{formatUtcTime(a.createdAt, false)}</span> {STATUS_META[a.severity].label}: {alertTitle(a)} <span className="rp-muted">({alertState(a, snap.at)})</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>{t('report.cabinAlertsNone')}</Empty>
        )}
        {snap.cabin.forecasts.length > 0 && (
          <>
            <h4 className="rp-h4">{t('report.forecasts')}</h4>
            <ul className="rp-list">
              {snap.cabin.forecasts.map((f) => (
                <li key={f.metric}>{forecastLabel(f)}</li>
              ))}
            </ul>
          </>
        )}
        {snap.cabin.pending.length > 0 && (
          <>
            <h4 className="rp-h4">{t('report.pending')}</h4>
            <ul className="rp-list">
              {snap.cabin.pending.map((r) => (
                <li key={r.id}>
                  <strong>{recTitle(r)}</strong> <span className="rp-muted">({t('report.priorityWord', { priority: PRIORITY_LABEL[r.priority] })})</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <h2 className="rp-h2">{t('report.earthLinkSection')}</h2>
      {snap.comms.length ? (
        <table className="rp-table">
          <tbody>
            {snap.comms.slice(0, 12).map((m) => (
              <tr key={m.id}>
                <td className="rp-time tabular">{formatUtcTime(m.sentAt, false)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{m.direction === 'UPLINK' ? t('report.fromEarth') : t('report.toEarth')}</td>
                <td>
                  {m.title} <span className="rp-muted">· {COMM_KIND_LABEL[m.kind]}</span>
                </td>
                <td className="rp-muted" style={{ whiteSpace: 'nowrap' }}>
                  {m.arrivesAt > snap.at ? t('report.arrives', { time: formatUtcTime(m.arrivesAt, false) }) : t('report.delivered', { time: formatUtcTime(m.arrivesAt, false) })}
                  {m.data_origin === 'SIMULATED' ? t('report.simSuffix') : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>{t('report.commsNone')}</Empty>
      )}

      <div className="rp-disclaimer">
        <p>
          <strong>{t('report.disclaimerStrong')}</strong> {t('report.disclaimer1')}
        </p>
        <p>{t('report.disclaimer2')}</p>
        <p>{t('report.model', { model: s.health[s.crew[0]?.id ?? '']?.risk.model_version ?? 'n/a' })}</p>
      </div>
    </article>
  )
}

function HandoverModal({ onClose }: { onClose: () => void }) {
  const [snap, setSnap] = useState(() => buildSnapshot(useAppStore.getState()))
  const [notice, setNotice] = useState<string | null>(null)
  useT()

  const exportFhir = () => {
    const s = snap.state
    const bundle = buildFhirBundle({ mission: s.mission, crew: s.crew, devices: s.devices, health: s.health, environment: s.environment, simNow: snap.at })
    const iso = new Date(snap.at).toISOString().replace(/[:]/g, '').replace(/\.\d+Z$/, 'Z')
    downloadJson(`ahi-fhir-r4-bundle-${iso}.json`, bundle)
    setNotice(t('report.fhirDone', { n: bundle.entry.length }))
  }
  const send = () => {
    const s = useAppStore.getState()
    const id = s.sendToGround({ astronautId: null, kind: 'HANDOVER_REPORT', title: `Shift handover report, ${stamp(snap.at)}`, body: reportText(snap) })
    const p = s.commProfiles.find((x) => x.id === s.commProfileId)
    setNotice(id ? t('report.queued', { delay: formatDelay(p?.oneWayDelaySec ?? 0) }) : t('report.queueFailed'))
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t('report.modalTitle')}
      hostClassName="ahi-print-host"
      icon={<FileText size={17} className="text-accent" aria-hidden />}
      subtitle={t('report.subtitle', { n: WINDOW_H, time: formatUtcTime(snap.at, false) })}
      headerExtra={
        <Button
          variant="subtle"
          onClick={() => {
            setSnap(buildSnapshot(useAppStore.getState()))
            setNotice(null)
          }}
          title={t('report.refreshTitle')}
        >
          <RefreshCw size={13} aria-hidden /> {t('report.refresh')}
        </Button>
      }
      footer={
        <div className="flex flex-col gap-2">
          {notice && (
            <div role="status" className="animate-fade-in flex items-start gap-2 rounded-lg bg-accent/[0.07] px-3 py-2 text-xs text-ink-100 ring-1 ring-accent/25">
              <Check size={13} className="mt-0.5 shrink-0 text-accent" aria-hidden /> {notice}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => window.print()}>
              <Printer size={13} aria-hidden /> {t('report.print')}
            </Button>
            <Button variant="ghost" onClick={exportFhir} title={t('report.fhirTitle')}>
              <FileJson size={13} aria-hidden /> {t('report.fhir')}
            </Button>
            <Button variant="primary" onClick={send}>
              <Send size={13} aria-hidden /> {t('report.send')}
            </Button>
          </div>
        </div>
      }
    >
      <style>{REPORT_CSS}</style>
      <ReportDocument snap={snap} />
    </Modal>
  )
}

/** Opens the shift handover report (print view + FHIR R4 export). */
/** Opens the shift handover report. variant="menuitem" renders it as a row of the top bar Tools menu. */
export function HandoverReportButton({ variant = 'toolbar' }: { variant?: 'toolbar' | 'menuitem' }) {
  const [open, setOpen] = useState(false)
  useT()
  return (
    <>
      {variant === 'menuitem' ? (
        <button type="button" role="menuitem" tabIndex={-1} data-tour="report" aria-haspopup="dialog" onClick={() => setOpen(true)} className={MENU_ITEM}>
          <MenuRow icon={<FileText size={16} />} label={t('report.menuLabel')} hint={t('report.menuHint')} />
        </button>
      ) : (
        <button type="button" data-tour="report" aria-haspopup="dialog" onClick={() => setOpen(true)} className={TOPBAR_BUTTON} title={t('report.buttonTitle')}>
          <FileText size={14} className="text-accent" aria-hidden />
          <span>{t('report.button')}</span>
        </button>
      )}
      {open && <HandoverModal onClose={() => setOpen(false)} />}
    </>
  )
}
