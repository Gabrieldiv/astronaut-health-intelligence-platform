/**
 * Sections of the crew profile dialog. Visual first: icon, color and number lead, sentences sit
 * behind a Details toggle. Every section says "No data" explicitly when its data is missing.
 */
import clsx from 'clsx'
import { Battery, BatteryLow, Bell, CalendarClock, ClipboardCheck, Cpu, Eye, Gauge, Radiation, ScrollText, Smile } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useAppStore } from '../../state/store'
import { STATUS_META } from '../../lib/status'
import type { Alert, Astronaut, AstronautHealth, CheckIn, Device, ExamRegionId, ExamRegionState, MissionDaySummary, MissionProfileId, RiskLevel, Status } from '../../types/domain'
import { METRIC_CATALOG } from '../../engine/catalog'
import { NASA_CAREER_EFFECTIVE_DOSE_LIMIT, MISSION_SOURCES } from '../../engine/missions'
import { limitFraction } from '../../components/viz/scale'
import { BandGauge } from '../../components/viz/BandGauge'
import { Details } from '../../components/viz/Details'
import { StatusDot, StatusPill } from '../../components/Status'
import { Badge } from '../../components/ui'
import { ORIGIN_LABEL, fmtNum, formatUtcDate, formatUtcTime, relTime } from '../../components/format'
import { formatFixed, tp, useT } from '../../i18n'
import { metricLabel, metricPlain, metricShort, regionLabel } from '../../i18n/catalog'
import { engineText } from '../../i18n/engineText'
import { DEVICE_STATE_META } from '../vitals/deviceMeta'
import { DEVICE_KIND_LABEL } from '../topbar/ProvenancePopover'
import { NextDue } from '../attention/ExamHistory'
import { metricFeedState } from '../attention/feedState'
import { checkInRows, doseFor, groupBaselines, latestCheckIn, openAlertCount, profileDevices, recentEvents, symptomWords, type BaselineRow, type ProfileEvent } from './profileData'
import { summarizeIndicators } from '../stage/indicators'
import { REGION_ICON } from '../stage/CenterStage'

/** Calm color of a normal reading on the gauge (same convention as the body system detail). */
const CALM = '#5eead4'
const gaugeColor = (s: Status) => (s === 'LOW' ? CALM : STATUS_META[s].color)

export function SimBadge() {
  const t = useT()
  return (
    <Badge tone="sim" title={t('attention.dataOrigin')}>
      {ORIGIN_LABEL.SIMULATED}
    </Badge>
  )
}

export function Section({ title, icon, right, children, className, id }: { title: string; icon: ReactNode; right?: ReactNode; children: ReactNode; className?: string; id: string }) {
  return (
    <section aria-labelledby={id} className={clsx('rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id={id} className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
          <span className="text-accent" aria-hidden>
            {icon}
          </span>
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-nodata/40 px-3 py-2.5 text-[12px] text-ink-300">{children}</p>
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-semibold text-ink-100" title={typeof children === 'string' ? children : undefined}>
        {children}
      </dd>
    </div>
  )
}

export function IdentitySection({ astronaut, roleText, missionName, vehicle, context }: { astronaut: Astronaut; roleText: string; missionName: string; vehicle: string; context: string }) {
  const t = useT()
  return (
    <Section id="profile-identity" title={t('profile.identity')} icon={<ScrollText size={12} />} right={<SimBadge />}>
      <div className="flex items-center gap-3">
        <span
          className="flex size-14 shrink-0 items-center justify-center rounded-full text-[16px] font-bold tracking-wide"
          style={{ background: `color-mix(in srgb, ${astronaut.color} 18%, #0a1120)`, color: astronaut.color, boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${astronaut.color} 45%, transparent)` }}
          aria-hidden
        >
          {astronaut.callsign.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <div className="text-[22px] leading-tight font-bold tracking-wide text-ink-100">{astronaut.callsign}</div>
          <div className="text-xs text-ink-500">{roleText}</div>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Fact label={t('profile.id')}>
          <span className="font-mono">{astronaut.id}</span>
        </Fact>
        <Fact label={t('profile.missionDay')}>{t('profile.missionDayValue', { n: astronaut.missionDay })}</Fact>
        <Fact label={t('profile.age')}>{t('profile.ageYears', { n: astronaut.age })}</Fact>
        <Fact label={t('profile.sex')}>{t(astronaut.sex === 'F' ? 'profile.sex.F' : 'profile.sex.M')}</Fact>
        <Fact label={t('profile.mission')}>{missionName}</Fact>
        <Fact label={t('profile.vehicle')}>{vehicle}</Fact>
        <Fact label={t('profile.context')}>{context}</Fact>
      </dl>
      <p className="mt-3 rounded-lg bg-violet-400/[0.07] px-3 py-2 text-[11.5px] leading-snug text-ink-300 ring-1 ring-violet-300/20">{t('profile.simNote')}</p>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

export function TodaySection({
  astronautId,
  status,
  statusLabel,
  sentence,
  health,
  alerts,
}: {
  astronautId: string
  status: Status
  statusLabel?: string
  sentence: string
  health: AstronautHealth | undefined
  alerts: Alert[]
}) {
  const t = useT()
  const sum = useMemo(() => summarizeIndicators(health?.metrics), [health?.metrics])
  const open = openAlertCount(alerts, astronautId)
  const score = health?.risk.risk_score
  const meta = STATUS_META[status]
  return (
    <Section id="profile-today" title={t('profile.today')} icon={<Gauge size={12} />}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={status} size="lg" label={statusLabel} />
        <div className="flex items-baseline gap-1.5" title={t('profile.score')}>
          <span className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{t('profile.score')}</span>
          {score == null ? (
            <span className="text-[13px] font-semibold text-nodata">{t('profile.noData')}</span>
          ) : (
            <span className="tabular text-[26px] leading-none font-bold" style={{ color: meta.color }} aria-label={t('profile.scoreValue', { n: Math.round(score) })}>
              {Math.round(score)}
              <span className="ml-0.5 text-[11px] font-medium text-ink-500">/100</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{t('profile.indicators')}</div>
        {sum.total === 0 ? (
          <p className="mt-1 text-[12px] text-ink-300">{t('profile.indicatorsNone')}</p>
        ) : (
          <div className="mt-1.5 flex items-center gap-2.5">
            <div role="img" aria-label={t('stage.ind.aria', { ok: sum.ok, total: sum.total, flagged: sum.flagged, missing: sum.missing })} className="flex h-4 min-w-0 flex-1 items-stretch gap-[2px]">
              {sum.items.map((i) => {
                const m = STATUS_META[i.status]
                return (
                  <span
                    key={i.metric}
                    title={`${metricLabel(i.metric)}: ${m.crewLabel}`}
                    className={clsx('block max-w-[10px] min-w-[2px] flex-1 rounded-[2px]', i.status === 'NO_DATA' && 'border border-dashed')}
                    style={i.status === 'NO_DATA' ? { borderColor: m.color } : { background: m.color }}
                  />
                )
              })}
            </div>
            <span aria-hidden className="shrink-0 font-mono text-[12px] font-medium whitespace-nowrap text-ink-300 tabular-nums">
              {t('stage.ind.inRange', { ok: sum.ok, total: sum.total })}
            </span>
            {sum.missing > 0 && (
              <span aria-hidden className="shrink-0 rounded-md border border-dashed border-nodata/50 px-1.5 py-0.5 text-[11px] whitespace-nowrap text-ink-400">
                {t('stage.ind.noData', { n: sum.missing })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-300">
        <Bell size={14} className={open > 0 ? 'text-watch' : 'text-ink-500'} aria-hidden />
        <span className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{t('profile.openAlerts')}</span>
        <span className="tabular text-[15px] font-bold text-ink-100">{open}</span>
        {open === 0 && <span className="text-ink-500">{t('profile.noOpenAlerts')}</span>}
      </div>
      <Details className="mt-2" label={t('profile.headline')}>
        {sentence}
      </Details>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Personal baselines
// ---------------------------------------------------------------------------

function BaselineRowView({ row, astronautId, devices }: { row: BaselineRow; astronautId: string; devices: Device[] }) {
  const t = useT()
  const ms = useAppStore((s) => s.health[astronautId]?.metrics[row.metric])
  const def = METRIC_CATALOG[row.metric]
  const meta = STATUS_META[row.status]
  const feed = metricFeedState(ms, devices, astronautId, row.metric)
  const live = feed === 'LIVE' && row.status !== 'NO_DATA'
  const fmt = (v: number | null) => fmtNum(v, def.decimals)
  const band = row.hasBand ? t('attention.range', { low: fmt(row.low), high: fmt(row.high), unit: def.unit }) : t('profile.learning')
  const state = live ? `${fmt(row.current)} ${def.unit}, ${meta.crewLabel}${row.side ? `, ${t(`profile.side.${row.side}`)}` : ''}` : feed === 'LIVE' ? t('profile.noData') : t(`visual.feed.${feed}`)
  return (
    <li className={clsx('rounded-lg px-3 py-2.5 ring-1', live ? 'bg-white/[0.03] ring-white/[0.06]' : 'border border-dashed border-nodata/40 ring-0')} aria-label={t('profile.rowAria', { metric: metricLabel(row.metric), state })}>
      <div className="flex items-baseline gap-2">
        <StatusDot status={row.status} size={8} className="self-center" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-100" title={metricPlain(row.metric)}>
          {metricLabel(row.metric)}
        </span>
        {live ? (
          <span className="tabular shrink-0 text-[18px] leading-none font-semibold text-ink-100">
            {fmt(row.current)}
            <span className="ml-1 text-[11px] font-normal text-ink-500">{def.unit}</span>
          </span>
        ) : (
          <span className="shrink-0 text-[12px] font-semibold text-nodata">{feed === 'LIVE' ? t('profile.noData') : t(`visual.feed.${feed}`)}</span>
        )}
      </div>
      <BandGauge value={live ? row.current : null} low={row.low} high={row.high} color={gaugeColor(row.status)} label="" className="mt-2" />
      <div className="tabular mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-[11px] text-ink-500">
        <span>{band}</span>
        {row.median != null && <span>{t('profile.typical', { value: fmt(row.median), unit: def.unit })}</span>}
        {row.readings != null && <span>{tp('profile.readings', row.readings)}</span>}
      </div>
      <Details className="mt-1">
        <span className="block">{metricPlain(row.metric)}</span>
        {live && row.side && (
          <span className="block" style={{ color: row.status === 'LOW' ? undefined : meta.color }}>
            {t(`profile.side.${row.side}`)} · {meta.crewLabel}
          </span>
        )}
        {row.windowLabel && <span className="block">{t('profile.window', { window: row.windowLabel.charAt(0).toLowerCase() + row.windowLabel.slice(1) })}</span>}
      </Details>
    </li>
  )
}

export function BaselinesSection({ astronautId, health, devices }: { astronautId: string; health: AstronautHealth | undefined; devices: Device[] }) {
  const t = useT()
  const groups = useMemo(() => groupBaselines(health?.metrics), [health?.metrics])
  return (
    <Section id="profile-baselines" title={t('profile.baselines')} icon={<Gauge size={12} />} right={<SimBadge />} className="md:col-span-2">
      {groups.length === 0 ? (
        <Empty>{t('profile.baselinesNone')}</Empty>
      ) : (
        <>
          <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
            {groups.map((g) => (
              <div key={g.id} className="min-w-0" role="group" aria-label={t(`profile.domain.${g.id}`)}>
                <div className="mb-1.5 text-[11px] font-semibold tracking-[0.1em] text-ink-300 uppercase">{t(`profile.domain.${g.id}`)}</div>
                <ul className="flex flex-col gap-1.5">
                  {g.rows.map((r) => (
                    <BaselineRowView key={r.metric} row={r} astronautId={astronautId} devices={devices} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Details className="mt-3">{t('profile.baselinesNote')}</Details>
        </>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export function DevicesSection({ astronautId, devices }: { astronautId: string; devices: Device[] }) {
  const t = useT()
  const now = useAppStore((s) => Math.floor(s.clock.simNow / 30000) * 30000)
  const mine = useMemo(() => profileDevices(devices, astronautId), [devices, astronautId])
  return (
    <Section id="profile-devices" title={t('profile.devices')} icon={<Cpu size={12} />} right={<SimBadge />}>
      {mine.length === 0 ? (
        <Empty>{t('profile.devicesNone')}</Empty>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {mine.map((d) => {
            const meta = DEVICE_STATE_META[d.state]
            const Icon = meta.icon
            const low = d.batteryPct != null && d.batteryPct < 20
            return (
              <li key={d.id} className={clsx('rounded-lg px-3 py-2', d.state === 'ONLINE' ? 'bg-white/[0.03] ring-1 ring-white/[0.06]' : 'border border-dashed border-white/15')}>
                <div className="flex items-center gap-2">
                  <Icon size={14} aria-hidden className="shrink-0" style={{ color: meta.color }} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-100" title={DEVICE_KIND_LABEL[d.kind]}>
                    {d.name}
                  </span>
                  <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 14%, transparent)` }}>
                    {meta.label}
                  </span>
                  <span className={clsx('tabular flex shrink-0 items-center gap-0.5 text-[11px]', low ? 'text-watch' : 'text-ink-500')}>
                    {low ? <BatteryLow size={12} aria-hidden /> : <Battery size={12} aria-hidden />}
                    {d.batteryPct == null ? t('attention.notAvailable') : t('profile.battery', { pct: `${Math.round(d.batteryPct)}%` })}
                  </span>
                </div>
                <Details className="pl-[22px]">
                  <span className="block">{t('profile.lastSeen', { when: relTime(d.lastSeenAt, now) })}</span>
                  <span className="block">{t('profile.feeds', { list: d.metrics.map((m) => metricShort(m)).join(', ') })}</span>
                </Details>
                <div className="mt-1 flex flex-wrap gap-1 pl-[22px]" aria-hidden>
                  {d.metrics.map((m) => (
                    <span key={m} className="rounded bg-white/[0.05] px-1 py-px text-[10px] text-ink-300">
                      {metricShort(m)}
                    </span>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------

function Pips({ value }: { value: number }) {
  return (
    <span className="flex gap-[3px]" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={clsx('h-1.5 w-3.5 rounded-full', i <= value ? 'bg-accent/80' : 'bg-white/[0.08]')} />
      ))}
    </span>
  )
}

export function CheckInSection({ checkIns, astronautId }: { checkIns: CheckIn[] | undefined; astronautId: string }) {
  const t = useT()
  const now = useAppStore((s) => s.clock.simNow)
  const c = useMemo(() => latestCheckIn(checkIns ?? [], astronautId, now), [checkIns, astronautId, now])
  const symptoms = c ? symptomWords(c.symptoms) : []
  return (
    <Section id="profile-checkin" title={t('profile.checkin')} icon={<Smile size={12} />} right={c ? <Badge tone="sim">{ORIGIN_LABEL[c.data_origin]}</Badge> : undefined}>
      {!c ? (
        <Empty>{t('profile.checkinNone')}</Empty>
      ) : (
        <>
          <p className="tabular mb-2 text-[11px] text-ink-500">{t('profile.checkinWhen', { rel: relTime(c.at, now), time: formatUtcTime(c.at, false) })}</p>
          <ul className="flex flex-col gap-1.5">
            {checkInRows(c).map((r) => (
              <li key={r.key} className="flex items-center gap-3 text-[12px]" aria-label={`${r.label}: ${r.word}, ${t('profile.checkinScale', { value: r.value })}`}>
                <span className="w-16 shrink-0 text-ink-500">{r.label}</span>
                <Pips value={r.value} />
                <span className="min-w-0 truncate font-semibold text-ink-100 first-letter:uppercase">{r.word}</span>
              </li>
            ))}
          </ul>
          <Details className="mt-2">
            <span className="block">
              {t('profile.symptoms')}: {symptoms.length ? symptoms.join(', ') : t('profile.symptomsNone')}
            </span>
            {c.note && (
              <span className="block italic">
                {t('profile.checkinNote')}: "{c.note}"
              </span>
            )}
          </Details>
        </>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

function ExamCard({ region, ex }: { region: ExamRegionId; ex: ExamRegionState | undefined }) {
  const t = useT()
  const latest = ex?.latest ?? null
  const status: Status = latest ? latest.status : 'NO_DATA'
  const meta = STATUS_META[status]
  const Icon = REGION_ICON[region]
  return (
    <li className={clsx('rounded-lg px-3 py-2.5', latest ? 'bg-white/[0.03] ring-1 ring-white/[0.06]' : 'border border-dashed border-nodata/40')}>
      <div className="flex items-center gap-2">
        <Icon size={15} aria-hidden style={{ color: meta.color }} />
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-100">{regionLabel(region)}</span>
        <StatusPill status={status} size="sm" label={latest ? undefined : t('profile.examNoSession')} />
      </div>
      {latest && (
        <p className="mt-1.5 text-[12px] text-ink-300">
          <span className="text-ink-500">{t('profile.examLatest')}: </span>
          {t('profile.examDate', { label: engineText('other', latest.label, latest.labelMsg), date: formatUtcDate(latest.at) })}
        </p>
      )}
      {ex && <NextDue ex={ex} className="mt-1.5" />}
      {!ex && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-500">
          <CalendarClock size={13} aria-hidden /> {t('profile.noData')}
        </p>
      )}
      {ex && (
        <Details className="mt-1">
          <span className="flex items-start gap-1.5">
            <Icon size={12} className="mt-0.5 shrink-0" aria-hidden />
            {engineText('regionSummary', ex.summary, ex.summaryMsg)}
          </span>
        </Details>
      )}
    </li>
  )
}

export function ExamsSection({ health }: { health: AstronautHealth | undefined }) {
  const t = useT()
  const exams = health?.exams
  return (
    <Section id="profile-exams" title={t('profile.exams')} icon={<Eye size={12} />} right={<SimBadge />}>
      {!exams || (!exams.eyes && !exams.ears) ? (
        <Empty>{t('profile.examsNone')}</Empty>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <ExamCard region="eyes" ex={exams.eyes} />
          <ExamCard region="ears" ex={exams.ears} />
        </ul>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Radiation
// ---------------------------------------------------------------------------

export function RadiationSection({ health, days, profileId }: { health: AstronautHealth | undefined; days: MissionDaySummary[] | undefined; profileId: MissionProfileId }) {
  const t = useT()
  const current = health?.metrics.RADIATION_DOSE?.current
  const e = useMemo(() => doseFor(profileId, current, days), [profileId, current, days])
  const limit = NASA_CAREER_EFFECTIVE_DOSE_LIMIT
  const frac = limitFraction(e?.effectiveMSv, limit.value)
  const pct = frac == null ? null : `${formatFixed(frac * 100, frac < 0.1 ? 1 : 0)}%`
  const sofar = e == null ? t('profile.noData') : e.effectiveMSv == null ? t('profile.doseAbsorbed', { v: formatFixed(e.absorbedMGy, 2) }) : `${t('profile.doseEffective', { v: formatFixed(e.effectiveMSv, e.effectiveMSv < 10 ? 1 : 0) })}`
  return (
    <Section id="profile-radiation" title={t('profile.radiation')} icon={<Radiation size={12} />} right={<SimBadge />}>
      {e == null ? (
        <Empty>{t('profile.doseNone')}</Empty>
      ) : (
        <div role="img" aria-label={t('profile.doseAria', { sofar, limit: limit.value })}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{t('profile.doseSoFar')}</span>
            <span className="tabular text-[24px] leading-none font-bold text-ink-100">{pct ?? t('profile.noData')}</span>
          </div>
          <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
            {frac != null && <div className="absolute inset-y-0 left-0 rounded-full bg-accent/85" style={{ width: `${Math.max(frac * 100, frac > 0 ? 0.8 : 0)}%` }} />}
          </div>
          <div className="tabular mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-[11px] text-ink-500" aria-hidden>
            <span>{pct != null ? t('profile.doseOfLimit', { pct }) : sofar}</span>
            <span>{t('profile.doseLimit', { limit: limit.value })}</span>
          </div>
        </div>
      )}
      <Details className="mt-2">
        {e != null && (
          <span className="block">
            {sofar}
            {e.effectiveMSv != null && `, ${t('profile.doseAbsorbed', { v: formatFixed(e.absorbedMGy, 2) })}`}
          </span>
        )}
        <span className="block">{t('profile.doseNote', { standard: limit.standard, limit: limit.value })}</span>
      </Details>
      <p className="mt-1.5 text-[10px] text-ink-500">
        {limit.sources.map((id, i) => {
          const s = MISSION_SOURCES[id]
          return (
            <span key={id}>
              {i > 0 && '; '}
              <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-ink-100" title={`${s.title}. ${s.publisher}.`}>
                {s.short}
              </a>
            </span>
          )
        })}
      </p>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Recent events
// ---------------------------------------------------------------------------

const SEVERITY_STATUS: Record<RiskLevel, Status> = { LOW: 'LOW', MODERATE: 'MODERATE', HIGH: 'HIGH', CRITICAL: 'CRITICAL' }

function EventRow({ e, now }: { e: ProfileEvent; now: number }) {
  const t = useT()
  return (
    <li className="flex items-start gap-2.5 text-[12px]">
      {e.severity ? <StatusDot status={SEVERITY_STATUS[e.severity]} size={8} className="mt-1" /> : <ClipboardCheck size={12} className="mt-0.5 shrink-0 text-ink-500" aria-hidden />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate font-semibold text-ink-100">
            <span className="mr-1.5 text-[10px] font-semibold tracking-[0.1em] text-ink-500 uppercase">{t(`profile.event.${e.kind}`)}</span>
            {e.title}
          </span>
          <span className="tabular shrink-0 text-[11px] text-ink-500">{relTime(e.at, now)}</span>
        </div>
        {e.detail && <Details className="mt-0.5">{e.detail}</Details>}
      </div>
    </li>
  )
}

export function EventsSection({ astronaut }: { astronaut: Astronaut }) {
  const t = useT()
  const alerts = useAppStore((s) => s.alerts)
  const interventions = useAppStore((s) => s.interventions)
  const audit = useAppStore((s) => s.audit)
  const now = useAppStore((s) => Math.floor(s.clock.simNow / 30000) * 30000)
  const events = useMemo(() => recentEvents({ astronaut, alerts, interventions, audit }), [astronaut, alerts, interventions, audit])
  return (
    <Section id="profile-events" title={t('profile.events')} icon={<ScrollText size={12} />} right={<SimBadge />} className="md:col-span-2">
      {events.length === 0 ? (
        <Empty>{t('profile.eventsNone')}</Empty>
      ) : (
        <ol className="flex flex-col gap-2" aria-label={t('profile.eventsAria', { callsign: astronaut.callsign })}>
          {events.map((e) => (
            <EventRow key={e.id} e={e} now={now} />
          ))}
        </ol>
      )}
    </Section>
  )
}
