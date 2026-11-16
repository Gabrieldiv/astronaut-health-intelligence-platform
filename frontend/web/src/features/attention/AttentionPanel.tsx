import clsx from 'clsx'
import { ArrowDown, ArrowRight, ArrowUp, Check, ClipboardList, Clock, Info, ListChecks, Minus, MoveRight, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../state/store'
import { STATUS_META } from '../../lib/status'
import type { BodyRegionId, MetricCode, MetricState, Prediction, Recommendation, Status } from '../../types/domain'
import { METRIC_CATALOG } from '../../engine/catalog'
import { t, translatedRecord, useI18n, useT } from '../../i18n'
import { engineText, recRationale, recTitle } from '../../i18n/engineText'
import { tx } from '../../i18n/rich'
import { metricLabel, regionLabel } from '../../i18n/catalog'
import { lowerLabel } from './text'
import { RiskGauge } from '../../components/RiskGauge'
import { StatusIcon } from '../../components/Status'
import { Badge, Button, PANEL_HEADER, PANEL_TITLE, SectionLabel } from '../../components/ui'
import { WhatIfButton } from '../whatif'
import { AutonomyBadge } from './AutonomyBadge'
import { fmtMetric, formatHours, formatUtcTime, relTime } from '../../components/format'
import { BandGauge } from '../../components/viz/BandGauge'
import { Details } from '../../components/viz/Details'
import { metricChange } from '../../components/viz/scale'
import { REGION_ICON } from '../stage/CenterStage'
import { actionIcon, actionTiming, metricIcon } from './visual'
import { metricFeedState } from './feedState'
import { FeedLabel, PAUSED_COLOR } from './FeedStatus'
import { EXAM_REGION_IDS } from '../anatomy/regions'
import { BODY_REGIONS, focusTarget, useActions, useEscapeClearsStructure, usePendingActions, useSelectedStructure, useSignalLost } from '../shared/hooks'
import { RegionDetail } from './RegionDetail'
import { MultivariateNote } from './MultivariateNote'
import { AstraNote } from '../astra/AstraNote'
import { forHorizon, forecastMessage, historyNote, horizonText, useForecastHorizon } from './forecastHorizon'
import { HorizonPicker } from './HorizonPicker'
import { StructureDetail, StructureUnavailable } from './StructureDetail'

export const DISCLAIMER = 'Decision support only. Not a diagnosis. Simulated data.'

function StatusCard({ astronautId }: { astronautId: string }) {
  const risk = useAppStore((s) => s.health[astronautId]?.risk)
  const signalLost = useSignalLost(astronautId)
  const t = useT()
  if (!risk) return null
  const status: Status = signalLost && risk.risk_level === 'LOW' ? 'NO_DATA' : risk.risk_level
  const meta = STATUS_META[status]
  const lowConf = risk.confidence < 0.6
  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 ring-1"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${meta.color} 13%, transparent) 0%, rgba(255,255,255,0.02) 70%)`,
        ['--tw-ring-color' as string]: `color-mix(in srgb, ${meta.color} 30%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase">{t('attention.overallStatus')}</div>
          <div className="mt-1 flex items-center gap-2">
            <StatusIcon status={status} size={24} className={clsx(status === 'CRITICAL' && 'animate-breathe')} />
            <span className="text-[28px] leading-none font-bold tracking-tight" style={{ color: meta.color }}>
              {meta.crewLabel}
            </span>
          </div>
          <div className="mt-2 text-xs text-ink-300">
            {status === 'NO_DATA' ? (
              <span>{t('attention.coreMissing')}</span>
            ) : (
              tx('attention.level', { level: <span className="font-semibold text-ink-100">{meta.label}</span> })
            )}
          </div>
        </div>
        <RiskGauge score={risk.risk_score} status={status} size={120} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-2.5 text-[11px] text-ink-500 present:hidden">
        <span className={clsx('tabular', lowConf && 'font-semibold text-watch')} title={t('attention.confidenceTitle')}>
          {t(lowConf ? 'attention.confidenceLow' : 'attention.confidence', { pct: Math.round(risk.confidence * 100) })}
        </span>
        <span aria-hidden>·</span>
        <span title={engineText('other', risk.data_window)}>{t('attention.model', { version: risk.model_version })}</span>
        <span aria-hidden>·</span>
        <span className="tabular">{t('attention.updated', { time: formatUtcTime(risk.evaluated_at, false) })}</span>
      </div>
    </div>
  )
}

interface Issue {
  key: string
  kind: 'factor' | 'missing' | 'paused' | 'region'
  /** Short visual title (metric or region name). */
  title: string
  /** Full sentence, behind Details. */
  sentence: string
  status: Status
  weight: number | null
  metric: MetricCode | null
  region: BodyRegionId | null
}

const isExamRegion = (r: string) => r === 'eyes' || r === 'ears'

/** One "Why" chip: signal icon, metric, direction and size of the change, mini gauge; sentence in Details. */
function FactorChip({ astronautId, it }: { astronautId: string; it: Issue }) {
  const ms = useAppStore((s) => (it.metric ? s.health[astronautId]?.metrics[it.metric] : undefined))
  const t = useT()
  const change = metricChange(ms)
  const meta = STATUS_META[it.status]
  const Icon = it.kind === 'region' && it.region ? REGION_ICON[it.region] : metricIcon(it.metric)
  const DirIcon = change.direction === 'up' ? ArrowUp : change.direction === 'down' ? ArrowDown : Minus
  const b = ms?.baseline
  const ready = b && b.status === 'READY'
  const aria =
    it.kind === 'factor' && change.pct != null
      ? t('visual.factorAria', { metric: it.title, dir: t(`visual.dir.${change.direction}`), pct: change.pct })
      : t('visual.factorAriaNoPct', { metric: it.title })
  const tint = it.kind === 'paused' ? PAUSED_COLOR : meta.color
  return (
    <li className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.05]">
      <button
        type="button"
        onClick={() => focusTarget({ astronautId, region: it.region, metric: it.metric })}
        disabled={!it.region}
        aria-label={aria}
        className="focus-ring group flex w-full items-center gap-2.5 rounded-xl px-3 pt-2.5 pb-1.5 text-left transition-colors enabled:hover:bg-white/[0.04]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${tint} 14%, transparent)`, color: tint }} aria-hidden>
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[13px] font-semibold text-ink-100">{it.title}</span>
            {it.kind === 'factor' && change.pct != null ? (
              <span className="tabular flex shrink-0 items-center gap-0.5 text-[14px] font-bold" style={{ color: meta.color }}>
                <DirIcon size={14} strokeWidth={2.75} aria-hidden />
                {change.pct}%
              </span>
            ) : it.kind === 'paused' ? (
              <FeedLabel feed="PAUSED" size={12} className="text-[11px]" />
            ) : it.kind === 'missing' ? (
              <FeedLabel feed="LOST" size={12} className="text-[11px]" />
            ) : (
              <StatusIcon status={it.status} size={14} className="shrink-0" />
            )}
          </span>
          {it.kind === 'factor' && ready && <BandGauge value={ms?.current} low={b.low} high={b.high} color={meta.color} label="" height={6} className="mt-1.5" />}
          {it.weight != null && (
            <span className="mt-1 flex items-center gap-1.5">
              <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]" aria-hidden>
                <span className="block h-full rounded-full" style={{ width: `${Math.round(it.weight * 100)}%`, background: meta.color, opacity: 0.55 }} />
              </span>
              <span className="tabular text-[9.5px] text-ink-500 present:hidden">{t('attention.pctOfScore', { pct: Math.round(it.weight * 100) })}</span>
            </span>
          )}
        </span>
        {it.region && <ArrowRight size={14} className="shrink-0 text-ink-500 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />}
      </button>
      <Details className="px-3 pb-2 pl-[54px]">{it.sentence}</Details>
    </li>
  )
}

function Issues({ astronautId }: { astronautId: string }) {
  const { factors, regions, metrics, devices } = useAppStore(
    useShallow((s) => ({ factors: s.health[astronautId]?.risk.contributing_factors, regions: s.health[astronautId]?.regions, metrics: s.health[astronautId]?.metrics, devices: s.devices })),
  )
  const lang = useI18n((s) => s.lang)
  const issues = useMemo<Issue[]>(() => {
    void lang // rebuild the titles when the language changes
    const out: Issue[] = []
    const covered = new Set<string>()
    for (const f of [...(factors ?? [])].sort((a, b) => b.weight - a.weight)) {
      const region = f.metric ? METRIC_CATALOG[f.metric].region : null
      const ms = f.metric ? metrics?.[f.metric] : undefined
      if (region && region !== 'environment') covered.add(region)
      const sentence = engineText('factor', f.label, f.metric)
      out.push({
        key: `f-${f.label}`,
        kind: 'factor',
        title: f.metric ? metricLabel(f.metric) : sentence,
        sentence,
        status: ms?.status && ms.status !== 'LOW' ? ms.status : 'MODERATE',
        weight: f.weight,
        metric: f.metric,
        region: region && region !== 'environment' ? region : null,
      })
    }
    const missingAll = (Object.values(metrics ?? {}) as MetricState[])
      // exam measures (eyes, ears) are periodic: 'no exam yet' is said by their region, not as a sensor problem
      .filter((m) => m && (m.current == null || m.status === 'NO_DATA') && !isExamRegion(METRIC_CATALOG[m.metric].region))
    // A pause (or the wait right after a resume) is an operator decision, not a sensor to check.
    const held = missingAll.filter((m) => metricFeedState(m, devices, astronautId, m.metric) !== 'LOST').map((m) => m.metric)
    const lost = missingAll.filter((m) => metricFeedState(m, devices, astronautId, m.metric) === 'LOST').map((m) => m.metric)
    const listOf = (list: MetricCode[]) => {
      const names = list.map((m) => lowerLabel(metricLabel(m)))
      return names.length > 3 ? t('attention.missingList', { list: names.slice(0, 3).join(', '), n: names.length - 3 }) : names.join(', ')
    }
    const groups: [Issue['kind'], MetricCode[]][] = [
      ['paused', held],
      ['missing', lost],
    ]
    for (const [kind, group] of groups) {
      if (!group.length) continue
      const first = METRIC_CATALOG[group[0]!].region
      out.unshift({
        key: kind,
        kind,
        title: group.length > 1 ? `${metricLabel(group[0]!)} +${group.length - 1}` : metricLabel(group[0]!),
        sentence: kind === 'paused' ? `${t('visual.feed.PAUSED')}: ${listOf(group)}. ${t('visual.feed.pausedHint')}` : t('attention.missingLabel', { list: listOf(group) }),
        status: 'NO_DATA',
        weight: null,
        metric: group[0]!,
        region: first === 'environment' ? null : first,
      })
      for (const m of group) {
        const r = METRIC_CATALOG[m].region
        if (r !== 'environment') covered.add(r)
      }
    }
    if (regions) {
      for (const r of [...BODY_REGIONS, ...EXAM_REGION_IDS]) {
        const rs = regions[r]
        if (!rs || rs.status === 'LOW' || rs.metrics.length === 0 || covered.has(r)) continue
        out.push({
          key: `r-${r}`,
          kind: 'region',
          title: regionLabel(r),
          sentence: rs.status === 'NO_DATA' && !isExamRegion(r) ? t('attention.regionNoData') : engineText('regionSummary', rs.summary, r),
          status: rs.status,
          weight: null,
          metric: null,
          region: r,
        })
      }
    }
    return out
  }, [factors, regions, metrics, devices, astronautId, lang])

  const [showAllIssues, setShowAllIssues] = useState(false)
  const shownIssues = showAllIssues ? issues : issues.slice(0, 3)
  return (
    <section aria-label={t('attention.why')}>
      <SectionLabel right={issues.length > 0 ? <span className="tabular text-[11px] text-ink-500">{issues.length}</span> : null}>{t('attention.why')}</SectionLabel>
      {issues.length === 0 ? (
        <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-nominal/[0.06] px-3 py-2.5 text-[13px] text-ink-300 ring-1 ring-nominal/20">
          <StatusIcon status="LOW" size={16} />
          {t('attention.nothingStandsOut')}
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {shownIssues.map((it) => (
            <FactorChip key={it.key} astronautId={astronautId} it={it} />
          ))}
        </ul>
      )}
      {issues.length > 3 && (
        <button type="button" onClick={() => setShowAllIssues((v) => !v)} className="focus-ring mt-1.5 rounded px-2 text-[11px] font-semibold text-accent hover:underline">
          {showAllIssues ? t('attention.showLess') : t('attention.showMore', { n: issues.length - 3 })}
        </button>
      )}
      <MultivariateNote astronautId={astronautId} />
      <AstraNote astronautId={astronautId} />
    </section>
  )
}

const AUDIENCE_LABEL: Record<Recommendation['audience'], string> = translatedRecord(['CREW', 'FLIGHT_SURGEON', 'MISSION_CONTROL'] as const, (k) => t(`attention.audience.${k}`))
const PRIORITY_LABEL: Record<Recommendation['priority'], string> = translatedRecord(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as const, (k) => t(`attention.priority.${k}`))

function ActionCard({ rec }: { rec: Recommendation }) {
  const { logIntervention, dismissRecommendation } = useActions()
  const meta = STATUS_META[rec.priority]
  const t = useT()
  const Icon = actionIcon(rec)
  const timing = actionTiming(rec.priority)
  const title = recTitle(rec)
  return (
    <li className="relative overflow-hidden rounded-xl bg-white/[0.035] p-3 ring-1 ring-white/[0.06]">
      <span className="absolute top-0 bottom-0 left-0 w-[3px]" style={{ background: meta.color }} aria-hidden />
      <div className="flex items-start gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }} aria-hidden>
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-bold tracking-wide uppercase"
              style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}
              aria-label={t('visual.whenAria', { when: t(`visual.when.${timing}`) })}
            >
              <Clock size={10} aria-hidden />
              {t(`visual.when.${timing}`)}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase" style={{ color: meta.color }}>
              <StatusIcon status={rec.priority} size={11} />
              {PRIORITY_LABEL[rec.priority]}
            </span>
            {!(rec.audience === 'FLIGHT_SURGEON' && (rec.autonomy ?? (rec.requiresHumanReview ? 'GROUND_REVIEW' : null)) === 'GROUND_REVIEW') && (
              <Badge tone="muted" className="present:hidden">
                {AUDIENCE_LABEL[rec.audience]}
              </Badge>
            )}
            <AutonomyBadge rec={rec} />
          </div>
          <div className="mt-1 text-[14px] leading-snug font-semibold text-ink-100">{title}</div>
        </div>
      </div>
      <Details className="mt-1 pl-[46px]">{recRationale(rec)}</Details>
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-[46px]">
        {rec.interventionKind && (
          <Button
            variant="primary"
            onClick={() => logIntervention({ astronautId: rec.astronautId, kind: rec.interventionKind!, recommendationId: rec.id })}
            aria-label={t('attention.markDoneAria', { title })}
          >
            <Check size={13} strokeWidth={3} /> {t('attention.markDone')}
          </Button>
        )}
        <Button variant="subtle" onClick={() => dismissRecommendation(rec.id)} aria-label={t('attention.dismissAria', { title })}>
          <X size={13} /> {t('attention.dismiss')}
        </Button>
        <span className="ml-auto">
          <WhatIfButton recommendation={rec} />
        </span>
      </div>
    </li>
  )
}
function Actions({ astronautId }: { astronautId: string }) {
  const interventions = useAppStore((s) => s.interventions)
  const simNow = useAppStore((s) => Math.floor(s.clock.simNow / 60000) * 60000)
  const pending = usePendingActions(astronautId)
  const [showAllActions, setShowAllActions] = useState(false)
  const shownActions = showAllActions ? pending : pending.slice(0, 2)
  const logged = useMemo(() => interventions.filter((i) => i.astronautId === astronautId).sort((a, b) => b.loggedAt - a.loggedAt), [interventions, astronautId])
  const t = useT()
  return (
    <section aria-label={t('attention.actions')} data-tour="actions">
      <SectionLabel right={pending.length > 0 ? <span className="tabular text-[11px] text-ink-500">{t('attention.toDo', { n: pending.length })}</span> : null}>{t('attention.actions')}</SectionLabel>
      {pending.length === 0 ? (
        <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5 text-[13px] text-ink-300 ring-1 ring-white/[0.05]">
          <ListChecks size={16} className="text-ink-500" aria-hidden />
          {t('attention.noActions')}
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {shownActions.map((r) => (
            <ActionCard key={r.id} rec={r} />
          ))}
        </ul>
      )}
      {pending.length > 2 && (
        <button type="button" onClick={() => setShowAllActions((v) => !v)} className="focus-ring mt-1.5 rounded px-2 text-[11px] font-semibold text-accent hover:underline">
          {showAllActions ? t('attention.showLess') : t('attention.showMore', { n: pending.length - 2 })}
        </button>
      )}
      {logged.length > 0 && (
        <div className="mt-2 flex items-start gap-2 rounded-lg px-1 text-[11px] text-ink-500">
          <ClipboardList size={12} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            {tx('attention.lastLogged', { kind: <span className="text-ink-300">{logged[0]!.kind.replaceAll('_', ' ').toLowerCase()}</span>, when: relTime(logged[0]!.loggedAt, simNow) })}
            {logged.length > 1 ? ` ${t('attention.loggedTotal', { n: logged.length })}` : ''}
          </span>
        </div>
      )}
    </section>
  )
}

function ForecastRow({ p, astronautId, className }: { p: Prediction; astronautId: string; className?: string }) {
  const t = useT()
  const exits = p.eligible && p.hoursToBandExit != null
  const message = engineText('forecast', forecastMessage(p, formatHours), p.metric)
  const last = p.points[p.points.length - 1]
  const first = p.points[0]
  const def = METRIC_CATALOG[p.metric]
  const delta = last && first ? last.v - first.v : 0
  const flat = !last || !first || Math.abs(delta) < Math.max(Math.abs(first.v) * 0.01, 10 ** -def.decimals)
  const trend: 'up' | 'down' | 'flat' = flat ? 'flat' : delta > 0 ? 'up' : 'down'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : MoveRight
  const color = !p.eligible ? STATUS_META.NO_DATA.color : exits ? STATUS_META.MODERATE.color : STATUS_META.LOW.color
  const range = p.eligible && last ? t('visual.forecastRange', { lo: fmtMetric(p.metric, last.lo), hi: fmtMetric(p.metric, last.hi), unit: def.unit }) : null
  const noProjection = p.ineligibleReason === 'HISTORY_TOO_SHORT' ? t('attention.forecast.historyShort') : t('visual.forecastNoData')
  const chip = !p.eligible
    ? noProjection
    : exits
      ? t('visual.forecastExit', { h: p.hoursToBandExit! >= 48 ? t('attention.span.aboutDays', { n: Math.round(p.hoursToBandExit! / 24) }) : formatHours(p.hoursToBandExit!) })
      : t('visual.forecastStays')
  return (
    <li className={className}>
      <button
        type="button"
        onClick={() => focusTarget({ astronautId, metric: p.metric })}
        aria-label={t('visual.forecastAria', { metric: metricLabel(p.metric), trend: t(`visual.trend.${trend}`), range: range ?? noProjection, message })}
        className="focus-ring flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 13%, transparent)`, color }} aria-hidden>
          {p.eligible ? <TrendIcon size={15} /> : <Info size={13} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink-100">{metricLabel(p.metric)}</span>
          {range && <span className="tabular block text-[11px] text-ink-500">{range}</span>}
        </span>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
          {chip}
        </span>
      </button>
      <Details className="px-3 pb-1 pl-[50px]">
        {message}
        {p.eligible && ` ${engineText('forecast', p.method, p.methodMsg)} · ${engineText('forecast', p.intervalLabel, p.intervalLabelMsg)}.`}
        {p.ineligibleReason === 'HISTORY_TOO_SHORT' && ` ${historyNote(p)}`}
      </Details>
    </li>
  )
}
function Forecasts({ astronautId }: { astronautId: string }) {
  const predictions = useAppStore((s) => s.health[astronautId]?.predictions)
  const horizon = useForecastHorizon((s) => s.hours)
  const list = useMemo(() => {
    const arr = Object.values(predictions ?? {})
      .map((p) => forHorizon(p, horizon))
      .filter((p): p is Prediction => !!p)
    const rank = (p: Prediction) => (!p.eligible ? 2 : p.hoursToBandExit != null ? 0 : 1)
    return arr.sort((a, b) => rank(a) - rank(b) || (a.hoursToBandExit ?? 0) - (b.hoursToBandExit ?? 0))
  }, [predictions, horizon])
  const exits = list.filter((p) => p.eligible && p.hoursToBandExit != null).length
  const [showAll, setShowAll] = useState(false)
  // Large screens (roomy) show every forecast: the extra rows are rendered but hidden by CSS elsewhere.
  const base = Math.max(3, exits)
  const t = useT()
  return (
    <section aria-label={t('attention.forecast')}>
      <SectionLabel
        right={
          <span className="flex items-center gap-1 text-[11px] text-ink-500">
            <Sparkles size={11} aria-hidden /> {t('attention.forecastNext', { horizon: horizonText(horizon) })}
          </span>
        }
      >
        {t('attention.forecast')}
      </SectionLabel>
      <HorizonPicker size="xs" className="mt-1.5 w-fit" />
      {list.length === 0 ? (
        <div className="mt-2 rounded-xl bg-white/[0.03] px-3 py-2.5 text-[13px] text-ink-500 ring-1 ring-white/[0.05]">{t('attention.forecastEmpty')}</div>
      ) : (
        <>
          <ul className="mt-1 -mx-1 flex flex-col">
            {list.map((p, i) => (
              <ForecastRow key={p.metric} p={p} astronautId={astronautId} className={!showAll && i >= base ? 'hidden roomy:block' : undefined} />
            ))}
          </ul>
          {list.length > base ? (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="focus-ring mt-1 rounded px-2 text-[11px] font-semibold text-accent hover:underline roomy:hidden">
              {showAll ? t('attention.showLess') : t('attention.showAll', { n: list.length })}
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}

function Overview({ astronautId }: { astronautId: string }) {
  return (
    <div className="flex flex-col gap-5">
      <StatusCard astronautId={astronautId} />
      <Actions astronautId={astronautId} />
      <Issues astronautId={astronautId} />
      <Forecasts astronautId={astronautId} />
    </div>
  )
}

/**
 * Right panel. Three levels, most specific first:
 * a structure selected in the 3D atlas (what it is, plus the data of the region it is monitored
 * with, or a "context only" note), a body region (metrics, alerts and flags), or the overview.
 */
export function AttentionPanel({ className }: { className?: string }) {
  const astronautId = useAppStore((s) => s.selectedAstronautId)
  const callsign = useAppStore((s) => s.crew.find((c) => c.id === s.selectedAstronautId)?.callsign)
  const region = useAppStore((s) => s.selectedRegion)
  const { structureId, structure, manifest, pending } = useSelectedStructure()
  useEscapeClearsStructure()
  const t = useT()
  let title = t('attention.title.overview')
  let body = <Overview astronautId={astronautId} />
  if (structure && manifest) {
    title = t('attention.title.anatomy')
    body = <StructureDetail astronautId={astronautId} structure={structure} manifest={manifest} />
  } else if (region) {
    // Also the fallback while the atlas loads or when it is unavailable: the region data never waits for anatomy.
    title = t('attention.title.region')
    body = <RegionDetail astronautId={astronautId} region={region} />
  } else if (structureId) {
    title = t('attention.title.anatomy')
    body = <StructureUnavailable loading={pending} />
  }
  return (
    <aside aria-label={t('attention.title.overview')} data-tour="attention" className={clsx('glass flex min-h-0 flex-col rounded-2xl', className)}>
      <header className={PANEL_HEADER}>
        <h2 className={PANEL_TITLE}>{title}</h2>
        <span className="text-[11px] leading-none font-semibold tracking-wide text-ink-300">{callsign}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4" key={`${astronautId}-${structure ? `s-${structure.id}` : (region ?? (structureId ? 'structure' : 'overview'))}`}>
        <div className="animate-fade-in">{body}</div>
      </div>
      <footer className="flex items-center gap-1.5 border-t border-white/[0.06] px-4 py-2 text-[10.5px] text-ink-500 present:py-1.5">
        <Info size={11} className="shrink-0" aria-hidden />
        {t('attention.disclaimer')}
      </footer>
    </aside>
  )
}

