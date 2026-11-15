import clsx from 'clsx'
import { Activity, AudioWaveform, BookOpen, Box, ExternalLink, Gauge, Globe, Hourglass, Info, Moon, Orbit, Radiation, Rocket, Satellite, ShieldAlert, Sun, Users, Weight, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { autonomyGuidance } from '../../engine/comms'
import {
  HAZARD_LABEL,
  MISSION_PROFILE_ORDER,
  MISSION_SOURCES,
  NASA_CAREER_EFFECTIVE_DOSE_LIMIT,
  eventLabel,
  missionDoseExposure,
  missionProfile,
  referenceMissionDose,
  type HazardId,
  type HazardLevel,
  type MissionProfile,
  type MissionSourceId,
  type SpaceWeatherAdvisory,
} from '../../engine/missions'
import { STATUS_META } from '../../lib/status'
import { useAppStore } from '../../state/store'
import type { MissionProfileId } from '../../types/domain'
import { Badge } from '../../components/ui'
import { formatUtcDate, formatUtcTime } from '../../components/format'
import { Modal } from './Modal'
import { Details } from '../../components/viz/Details'
import { DelayClock } from '../../components/viz/DelayClock'
import { limitFraction } from '../../components/viz/scale'
import { engineText } from '../../i18n/engineText'
import { useSpaceWeatherAdvisory, useSpaceWeatherUi } from './spaceWeather'
import { formatFixed, getBcp47, getLang, t, useT } from '../../i18n'
import { tx } from '../../i18n/rich'
import { commProfileLabel, scenarioName as scenarioLabel } from '../../i18n/catalog'

const PROFILE_ICON: Record<MissionProfileId, typeof Rocket> = {
  LAUNCH: Rocket,
  ISS: Satellite,
  MOON: Moon,
  MARS_TRANSIT: Orbit,
}

const HAZARD_ICON: Record<HazardId, LucideIcon> = {
  RADIATION: Radiation,
  ISOLATION: Users,
  DISTANCE: Globe,
  GRAVITY: Weight,
  CLOSED_ENV: Box,
  ACCELERATION: Gauge,
  VIBRATION_NOISE: AudioWaveform,
}

const HAZARD_LEVEL_META: Record<HazardLevel, { readonly label: string; cls: string }> = {
  DOMINANT: {
    get label() {
      return t('mission.ctx.hazard.DOMINANT')
    },
    cls: 'bg-warning/15 text-orange-200 ring-orange-300/30',
  },
  PRESENT: {
    get label() {
      return t('mission.ctx.hazard.PRESENT')
    },
    cls: 'bg-white/[0.06] text-ink-300 ring-white/10',
  },
  MINOR: {
    get label() {
      return t('mission.ctx.hazard.MINOR')
    },
    cls: 'bg-white/[0.03] text-ink-500 ring-white/[0.06]',
  },
}

function fmtDelay(sec: number): string {
  if (sec < 0.01) return t('mission.ctx.delayUnder')
  if (sec < 60) return `${sec < 10 ? formatFixed(sec, 1) : Math.round(sec)} s`
  return t('mission.ctx.minutes', { n: Math.round(sec / 60) })
}

function fmtMSv(v: number): string {
  return v < 10 ? formatFixed(v, 1) : Math.round(v).toLocaleString(getLang() === 'en' ? 'en-US' : getBcp47())
}

function fmtRetrieved(iso: string | null): string {
  if (!iso) return t('mission.ctx.notRetrieved')
  const ms = Date.parse(iso)
  return `${formatUtcDate(ms)} ${formatUtcTime(ms, false)} UTC`
}

/** Inline citation: short source names linking to the published source. */
export function Cite({ ids, prefix }: { ids: MissionSourceId[]; prefix?: string }) {
  if (ids.length === 0) return null
  return (
    <span className="text-[10px] text-ink-500">
      {prefix ?? t('mission.ctx.source')}:{' '}
      {ids.map((id, i) => {
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
    </span>
  )
}

function Section({ title, icon, right, children }: { title: string; icon: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
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

function Fact({ label, value, sub }: { label: string; value: string; sub: ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/[0.05]">
      <div className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-ink-100">{value}</div>
      <div className="mt-0.5 leading-snug">{sub}</div>
    </div>
  )
}

/** Progress toward the career limit. Neutral accent: words carry the meaning, not color. */
function LimitBar({ fraction, projected }: { fraction: number | null; projected?: number | null }) {
  const now = Math.min(100, Math.max(0, (fraction ?? 0) * 100))
  const proj = projected == null ? null : Math.min(100, Math.max(0, projected * 100))
  return (
    <div className="relative mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
      {proj !== null && <div className="absolute inset-y-0 left-0 rounded-full bg-accent/20" style={{ width: `${proj}%` }} />}
      <div className="absolute inset-y-0 left-0 rounded-full bg-accent/80" style={{ width: `${Math.max(now, now > 0 ? 0.8 : 0)}%` }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Space weather advisory
// ---------------------------------------------------------------------------

export function SpaceWeatherCard({ advisory, compact = false }: { advisory: SpaceWeatherAdvisory; compact?: boolean }) {
  const status = useSpaceWeatherUi((s) => s.status)
  const level = advisory.level
  const color = STATUS_META[level].color
  const alarming = advisory.kind === 'SHELTER'
  const Icon = alarming ? ShieldAlert : Sun
  const t = useT()
  return (
    <div
      className={clsx('rounded-xl p-3.5 ring-1', alarming ? 'bg-warning/[0.08] ring-orange-300/35' : 'bg-white/[0.03] ring-white/[0.07]')}
      role={alarming ? 'alert' : undefined}
      data-advisory={advisory.kind}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Icon size={15} style={{ color }} aria-hidden />
        <span className="text-[13px] font-semibold text-ink-100">
          {advisory.kind === 'SHELTER' && <span className="sr-only">{t('mission.ctx.recommendationSr')}</span>}
          {status === 'loading' && advisory.kind === 'NO_DATA' ? t('mission.ctx.loadingWeather') : engineText('mission', advisory.title)}
        </span>
        <span
          className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold', level === 'NO_DATA' && 'border border-dashed')}
          style={{ color, background: `color-mix(in srgb, ${color} 13%, transparent)`, borderColor: color }}
        >
          <Activity size={11} aria-hidden />
          {STATUS_META[level].crewLabel}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          {advisory.autonomy === 'ONBOARD' && (
            <Badge tone="accent" title={t('mission.ctx.actOnboardTitle')}>
              {t('mission.ctx.actOnboard')}
            </Badge>
          )}
          <Badge tone="neutral" className="text-sky-200" title={t('mission.ctx.realPublicTitle')}>
            REAL_PUBLIC
          </Badge>
        </span>
      </div>
      <Details className="mt-1.5">{engineText('mission', advisory.body)}</Details>
      {!compact && advisory.triggers.length > 0 && (
        <ul className="mt-2 space-y-1">
          {advisory.triggers.slice(0, 4).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-2 text-[11px] text-ink-300">
              <span className="font-semibold text-ink-100">{eventLabel(e)}</span>
              <span className="tabular text-ink-500">{t('mission.ctx.started', { when: fmtRetrieved(e.startTime) })}</span>
              <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                {t('mission.ctx.donkiEvent')} <ExternalLink size={10} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-500">
        <span>
          {advisory.source}
          {advisory.mode === 'snapshot' ? t('mission.ctx.snapshot') : advisory.mode === 'live' ? t('mission.ctx.live') : ''}, {advisory.retrievedAt ? t('mission.ctx.retrieved', { when: fmtRetrieved(advisory.retrievedAt) }) : t('mission.ctx.noDataYet')}
        </span>
        <a href={advisory.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-white/20 underline-offset-2 hover:text-ink-100">
          {advisory.triggers.length > 0 ? t('mission.ctx.openDonkiEvent') : t('mission.ctx.openDonki')} <ExternalLink size={10} aria-hidden />
        </a>
        {status === 'error' && <span className="text-orange-200">{t('mission.ctx.donkiError')}</span>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile picker
// ---------------------------------------------------------------------------

function ProfilePicker({ value, onChange }: { value: MissionProfileId; onChange: (id: MissionProfileId) => void }) {
  return (
    <div role="radiogroup" aria-label={t('mission.ctx.profileGroup')} className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {MISSION_PROFILE_ORDER.map((id) => {
        const p = missionProfile(id)
        const Icon = PROFILE_ICON[id]
        const on = id === value
        const rate = p.radiation.doseEquivalentMSvPerDay?.value
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(id)}
            className={clsx(
              'focus-ring flex flex-col items-start gap-1 rounded-xl px-3 py-2.5 text-left transition-colors',
              on ? 'bg-accent/[0.12] ring-1 ring-accent/45' : 'bg-white/[0.03] ring-1 ring-white/[0.07] hover:bg-white/[0.06]',
            )}
          >
            <span className={clsx('flex items-center gap-1.5 text-[13px] font-semibold', on ? 'text-accent' : 'text-ink-100')}>
              <Icon size={14} aria-hidden />
              {p.label}
            </span>
            <span className="tabular text-[11px] text-ink-300">{rate != null ? t('mission.ctx.mSvPerDay', { v: formatFixed(rate, rate < 1 ? 2 : 1) }) : t('mission.ctx.radiationNegligible')}</span>
            <span className="tabular text-[11px] text-ink-500">
              {t('mission.ctx.delayLine', { delay: p.oneWayDelaySec.value.label.toLowerCase(), duration: p.duration.value.label.replace(/ \(.*\)$/, '') })}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Longer and farther: comparison across profiles
// ---------------------------------------------------------------------------

function ExposureComparison({ active }: { active: MissionProfileId }) {
  const rows = MISSION_PROFILE_ORDER.map((id) => {
    const p = missionProfile(id)
    const ref = referenceMissionDose(id)
    return { id, p, mSv: ref.mSv, days: ref.days }
  })
  const limit = NASA_CAREER_EFFECTIVE_DOSE_LIMIT.value
  const max = Math.max(limit, ...rows.map((r) => r.mSv ?? 0))
  return (
    <div>
      <p className="text-xs leading-relaxed text-ink-300">
        {tx('mission.ctx.exposureIntro', { rateTime: <strong className="text-ink-100">{t('mission.ctx.rateTime')}</strong> })}
      </p>
      <ul className="mt-3 space-y-2" aria-label={t('mission.ctx.exposureListAria')}>
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[110px_1fr_auto] items-center gap-2 text-[11px]">
            <span className={clsx('truncate font-semibold', r.id === active ? 'text-accent' : 'text-ink-300')}>{r.p.shortLabel}</span>
            <span className="relative h-3 rounded-full bg-white/[0.04]">
              <span className={clsx('absolute inset-y-0 left-0 rounded-full', r.id === active ? 'bg-accent/80' : 'bg-ink-300/45')} style={{ width: `${r.mSv == null ? 0 : Math.max(0.6, (r.mSv / max) * 100)}%` }} />
              <span className="absolute inset-y-[-3px] border-l border-dashed border-ink-100/60" style={{ left: `${(limit / max) * 100}%` }} aria-hidden />
            </span>
            <span className="tabular w-[150px] text-right text-ink-300">
              {r.mSv == null ? t('mission.ctx.negligibleLower') : t('mission.ctx.approxMSv', { v: fmtMSv(r.mSv) })}
              <span className="text-ink-500"> / {r.days < 1 ? t('mission.ctx.minutes', { n: Math.round(r.days * 1440) }) : t('mission.ctx.days', { n: Math.round(r.days) })}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-relaxed text-ink-500">
        {t('mission.ctx.exposureNote')}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Radiation: reference, simulated reading, mission dose vs career limit
// ---------------------------------------------------------------------------

/**
 * Mission dose as progress toward the NASA career limit (600 mSv, cited): the highest dose so far
 * in the crew (solid) and the typical projection for the whole mission (soft).
 */
function DoseProgress({ p, exposures }: { p: MissionProfile; exposures: { e: ReturnType<typeof missionDoseExposure> | null }[] }) {
  const t = useT()
  const limit = NASA_CAREER_EFFECTIVE_DOSE_LIMIT
  const sofarMSv = exposures.reduce<number | null>((m, x) => (x.e?.effectiveMSv == null ? m : Math.max(m ?? 0, x.e.effectiveMSv)), null)
  const proj = missionDoseExposure(p.id, 0)
  const now = limitFraction(sofarMSv, limit.value)
  const projected = limitFraction(proj.projectedMissionMSv, limit.value)
  const pct = (f: number | null) => (f == null ? t('visual.dose.unknown') : `${formatFixed(f * 100, f < 0.1 ? 1 : 0)}%`)
  return (
    <div
      role="img"
      aria-label={t('visual.dose.aria', { sofar: sofarMSv == null ? t('visual.dose.unknown') : `${fmtMSv(sofarMSv)} mSv`, projected: proj.projectedMissionMSv == null ? t('visual.dose.unknown') : `${fmtMSv(proj.projectedMissionMSv)} mSv`, limit: limit.value })}
      className="rounded-lg bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.05]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{t('visual.dose.title')}</span>
        <span className="tabular text-[20px] leading-none font-bold text-ink-100">{pct(projected)}</span>
      </div>
      <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
        {projected != null && <div className="absolute inset-y-0 left-0 rounded-full bg-accent/25" style={{ width: `${Math.max(projected * 100, 0.8)}%` }} />}
        {now != null && <div className="absolute inset-y-0 left-0 rounded-full bg-accent/85" style={{ width: `${Math.max(now * 100, now > 0 ? 0.8 : 0)}%` }} />}
      </div>
      <div className="tabular mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-ink-500" aria-hidden>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-accent/85" /> {t('visual.dose.sofar')} {pct(now)}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-accent/25" /> {t('visual.dose.projected')} {pct(projected)}
        </span>
        <span className="ml-auto">{t('visual.dose.limit', { limit: limit.value })}</span>
      </div>
      <div className="mt-1 text-[10px] text-ink-500">
        <Cite ids={limit.sources} />
      </div>
    </div>
  )
}

function RadiationSection({ p }: { p: MissionProfile }) {
  const { crew, health, missionDays, rateNow } = useAppStore(
    useShallow((s) => ({ crew: s.crew, health: s.health, missionDays: s.missionDays, rateNow: s.environment.metrics.RADIATION_DOSE_RATE?.current ?? null })),
  )
  const r = p.radiation
  const limit = NASA_CAREER_EFFECTIVE_DOSE_LIMIT
  const exposures = crew.map((c) => {
    const dose = health[c.id]?.metrics.RADIATION_DOSE?.current ?? missionDays[c.id]?.at(-1)?.cumulativeDoseMgy ?? null
    return { c, e: dose == null ? null : missionDoseExposure(p.id, dose) }
  })
  const proj = missionDoseExposure(p.id, 0)
  return (
    <Section title={t('mission.ctx.radiation')} icon={<Radiation size={12} />} right={<Badge tone="sim">{t('mission.ctx.simDosimeters')}</Badge>}>
      <DoseProgress p={p} exposures={exposures} />
      <Details className="mt-2">{r.plain}</Details>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Fact
          label={t('mission.ctx.refRate')}
          value={r.doseEquivalentMSvPerDay ? t('mission.ctx.mSvPerDay', { v: r.doseEquivalentMSvPerDay.value }) : t('mission.ctx.negligible')}
          sub={
            r.absorbedUGyPerHour ? (
              <>
                <span className="text-[10px] text-ink-500">
                  {t('mission.ctx.absorbed', { v: formatFixed(r.absorbedUGyPerHour.value, 1), where: r.measuredWhere })}
                </span>
                <Cite ids={[...new Set([...(r.doseEquivalentMSvPerDay?.sources ?? []), ...r.absorbedUGyPerHour.sources])]} />
              </>
            ) : (
              <span className="text-[10px] text-ink-500">{r.measuredWhere}</span>
            )
          }
        />
        <Fact
          label={t('mission.ctx.dosimeterNow')}
          value={rateNow == null ? t('mission.ctx.noData') : `${formatFixed(rateNow, rateNow < 1 ? 2 : 1)} µGy/h`}
          sub={<span className="text-[10px] text-ink-500">{t('mission.ctx.areaMonitor')}</span>}
        />
        <Fact
          label={t('mission.ctx.typicalDose')}
          value={proj.projectedMissionMSv == null ? t('mission.ctx.negligible') : t('mission.ctx.approxMSv', { v: fmtMSv(proj.projectedMissionMSv) })}
          sub={
            <span className="text-[10px] text-ink-500">
              {proj.projectedCareerFraction == null
                ? t('mission.ctx.noMeasurable')
                : t('mission.ctx.careerPct', { pct: Math.round(proj.projectedCareerFraction * 100), duration: p.duration.value.label.toLowerCase() })}
            </span>
          }
        />
      </div>
      {r.effectiveMSvPerDayRange && (
        <p className="mt-2 text-[11px] text-ink-500">
          {tx('mission.ctx.issTypical', { a: r.effectiveMSvPerDayRange.value[0], b: r.effectiveMSvPerDayRange.value[1], cite: <Cite ids={r.effectiveMSvPerDayRange.sources} /> })}
        </p>
      )}

      <div className="mt-4 text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{t('mission.ctx.soFar')}</div>
      <ul className="mt-1.5 space-y-2">
        {exposures.map(({ c, e }) => (
          <li key={c.id} className="text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-semibold text-ink-100">
                <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden />
                {c.callsign}
              </span>
              <span className="tabular text-ink-300">
                {e == null
                  ? t('mission.ctx.noData')
                  : e.effectiveMSv == null
                    ? t('mission.ctx.absorbedNegligible', { v: formatFixed(e.absorbedMGy, 2) })
                    : t('mission.ctx.ofLimit', { v: fmtMSv(e.effectiveMSv), limit: limit.value, pct: formatFixed((e.careerFraction ?? 0) * 100, 1) })}
              </span>
            </div>
            <LimitBar fraction={e?.careerFraction ?? null} />
          </li>
        ))}
      </ul>
      <p className="mt-3 flex gap-1.5 text-[10px] leading-relaxed text-ink-500">
        <Info size={11} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          <strong className="font-semibold text-ink-300">{t('mission.ctx.officialStd')}</strong> {tx('mission.ctx.officialBody', { standard: limit.standard, limit: limit.value, cite: <Cite ids={limit.sources} /> })}
        </span>
      </p>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Distance and autonomy
// ---------------------------------------------------------------------------

function DistanceSection({ p }: { p: MissionProfile }) {
  const link = useAppStore(useShallow((s) => s.commProfiles.find((c) => c.id === s.commProfileId) ?? null))
  const guide = autonomyGuidance(link?.oneWayDelaySec ?? 0)
  const d = p.distanceKm.value
  const delay = p.oneWayDelaySec.value
  return (
    <Section title={t('mission.ctx.distance')} icon={<Globe size={12} />}>
      <div className="grid gap-2 sm:grid-cols-3">
        <Fact label={t('mission.ctx.distFromEarth')} value={d.label} sub={<Cite ids={p.distanceKm.sources} />} />
        <Fact
          label={t('mission.ctx.oneWayDelay')}
          value={delay.min === delay.max ? fmtDelay(delay.max) : t('mission.ctx.range', { a: fmtDelay(delay.min), b: fmtDelay(delay.max) })}
          sub={
            <>
              <span className="text-[10px] text-ink-500">{p.oneWayDelaySec.note} </span>
              <Cite ids={p.oneWayDelaySec.sources} prefix={p.oneWayDelaySec.derived ? t('mission.ctx.derivedFrom') : t('mission.ctx.source')} />
            </>
          }
        />
        <Fact
          label={t('mission.ctx.linkInDemo')}
          value={link ? `${commProfileLabel(link)}, ${fmtDelay(link.oneWayDelaySec)}` : t('mission.ctx.unknown')}
          sub={<span className="text-[10px] text-ink-500">{t('mission.ctx.changeLink')}</span>}
        />
      </div>
      <div className={clsx('mt-3 flex items-center gap-3 rounded-lg px-3 py-2.5 ring-1', guide.mode === 'CREW_FIRST' ? 'bg-accent/[0.07] ring-accent/30' : 'bg-white/[0.03] ring-white/[0.06]')}>
        <DelayClock seconds={link?.oneWayDelaySec ?? 0} label={`${t('visual.delay.title')}: ${fmtDelay(link?.oneWayDelaySec ?? 0)} ${t('visual.delay.oneWay')}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{t('visual.delay.title')}</div>
          <div className="tabular text-[18px] leading-tight font-bold text-ink-100">
            {fmtDelay(link?.oneWayDelaySec ?? 0)} <span className="text-[11px] font-normal text-ink-500">{t('visual.delay.oneWay')}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold text-ink-100">
            <Hourglass size={12} className="shrink-0 text-accent" aria-hidden />
            {engineText('mission', guide.title)}
          </div>
          <Details className="mt-1">
            {engineText('mission', guide.body)} {p.autonomy}
          </Details>
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

export function MissionContextDialog({ onClose }: { onClose: () => void }) {
  const { profileId, setMissionProfile, scenario } = useAppStore(
    useShallow((s) => ({ profileId: s.missionProfileId, setMissionProfile: s.setMissionProfile, scenario: s.scenarios.find((x) => x.id === s.clock.scenarioId) })),
  )
  const advisory = useSpaceWeatherAdvisory()
  const t = useT()
  const scenarioName = scenario ? scenarioLabel(scenario) : ''
  const p = missionProfile(profileId)
  const Icon = PROFILE_ICON[profileId]
  const usedSources = useMemo(() => {
    const ids = new Set<MissionSourceId>()
    const add = (xs: MissionSourceId[] | undefined) => xs?.forEach((x) => ids.add(x))
    add(p.radiation.absorbedUGyPerHour?.sources)
    add(p.radiation.doseEquivalentMSvPerDay?.sources)
    add(p.radiation.effectiveMSvPerDayRange?.sources)
    add(p.gravity.sources)
    add(p.distanceKm.sources)
    add(p.oneWayDelaySec.sources)
    add(p.duration.sources)
    add(NASA_CAREER_EFFECTIVE_DOSE_LIMIT.sources)
    add(['NASA_HRP_5_HAZARDS', 'NOAA_SWPC_FLARES', 'NASA_DONKI'])
    return [...ids].map((id) => MISSION_SOURCES[id])
  }, [p])

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t('mission.ctx.title')}
      icon={<Icon size={17} className="text-accent" aria-hidden />}
      subtitle={<span>{p.label}: {p.summary}</span>}
      headerExtra={<Badge tone="sim">{t('mission.ctx.simCrewData')}</Badge>}
      footer={
        <div className="flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-500">
          <Info size={12} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold text-ink-300">{t('mission.ctx.footerStrong')}</strong> {t('mission.ctx.footerBody', { scenario: scenarioName })}
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <ProfilePicker value={profileId} onChange={setMissionProfile} />

        <SpaceWeatherCard advisory={advisory} />

        <Section title={t('mission.ctx.bodyEffects')} icon={<Weight size={12} />}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Fact label={t('mission.ctx.gravity')} value={p.gravity.value.label} sub={<Cite ids={p.gravity.sources} />} />
            <Fact label={t('mission.ctx.typicalDuration')} value={p.duration.value.label} sub={<Cite ids={p.duration.sources} />} />
          </div>
          <div className="mt-3 text-[10px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{t('mission.ctx.hazardsTitle')}</div>
          <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {p.hazards.map((h) => (
              <li key={h.id} className="rounded-lg bg-white/[0.025] px-2.5 py-1.5 text-[11px]">
                <span className="flex items-center gap-2">
                  {(() => {
                    const HIcon = HAZARD_ICON[h.id]
                    return <HIcon size={15} className={h.level === 'DOMINANT' ? 'shrink-0 text-orange-200' : 'shrink-0 text-ink-300'} aria-hidden />
                  })()}
                  <strong className="min-w-0 flex-1 truncate font-semibold text-ink-100">{HAZARD_LABEL[h.id].label}</strong>
                  <span className={clsx('shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ring-1', HAZARD_LEVEL_META[h.level].cls)}>{HAZARD_LEVEL_META[h.level].label}</span>
                </span>
                <Details className="pl-[23px]">{h.why}</Details>
              </li>
            ))}
          </ul>
          <Details className="mt-2" label={t('mission.ctx.bodyEffects')}>
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-300 marker:text-ink-500">
              {p.bodyEffects.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </Details>
          <p className="mt-2 text-[10px] text-ink-500">
            {tx('mission.ctx.hazardsNote', { cite: <Cite ids={['NASA_HRP_5_HAZARDS']} /> })}
          </p>
          <Details className="mt-3" label={t('mission.ctx.countermeasures')}>
            <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-300 marker:text-ink-500">
              {p.countermeasures.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Details>
        </Section>

        <RadiationSection p={p} />

        <DistanceSection p={p} />

        <Section title={t('mission.ctx.longer')} icon={<Orbit size={12} />}>
          <ExposureComparison active={profileId} />
        </Section>

        <details className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/[0.06]">
          <summary className="focus-ring flex cursor-pointer items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">
            <BookOpen size={12} className="text-accent" aria-hidden /> {t('mission.ctx.sources', { n: usedSources.length })}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {usedSources.map((s) => (
              <li key={s.id} className="text-[11px] leading-snug text-ink-300">
                <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold text-ink-100 underline decoration-white/20 underline-offset-2 hover:text-accent">
                  {s.short}
                </a>
                {s.officialStandard && <span className="ml-1.5 rounded bg-accent/10 px-1 py-px text-[9px] font-bold text-accent uppercase">{t('mission.ctx.officialStandard')}</span>}
                <span className="text-ink-500">. {s.title}. {s.publisher}, {s.year}.</span>
                <div className="text-[10px] text-ink-500 italic">&ldquo;{s.quote}&rdquo;</div>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Top bar control
// ---------------------------------------------------------------------------

/**
 * Mission profile selector for the top bar. Shows the active profile and opens the mission
 * context dialog (profile picker, body effects, dose vs the NASA career limit, autonomy, space
 * weather). A dot flags a space weather advisory for the active profile.
 */
export function MissionProfileControl({ showLabel = true }: { showLabel?: boolean }) {
  const [open, setOpen] = useState(false)
  const profileId = useAppStore((s) => s.missionProfileId)
  const load = useSpaceWeatherUi((s) => s.load)
  const advisory = useSpaceWeatherAdvisory()
  useEffect(() => {
    load()
  }, [load])
  const p = missionProfile(profileId)
  const Icon = PROFILE_ICON[profileId]
  const flagged = advisory.kind === 'SHELTER' || advisory.kind === 'MONITOR' || advisory.kind === 'PRE_LAUNCH'
  const flagColor = flagged ? STATUS_META[advisory.level].color : null
  const t = useT()
  const label = t('mission.ctx.controlAria', { label: p.label, weather: flagged ? t('mission.ctx.controlWeather', { title: advisory.title }) : '' })
  return (
    <>
      <button
        type="button"
        data-tour="mission-profile"
        aria-haspopup="dialog"
        aria-label={label}
        title={t('mission.ctx.controlTitle', { label: p.label, summary: p.summary })}
        onClick={() => setOpen(true)}
        className={clsx(
          'focus-ring relative flex h-9 shrink-0 items-center gap-1.5 rounded-xl text-xs font-semibold whitespace-nowrap text-ink-300 ring-1 ring-white/[0.08] transition-colors hover:bg-white/[0.06] hover:text-ink-100',
          showLabel ? 'px-2.5' : 'w-9 justify-center',
        )}
      >
        <Icon size={14} className="text-accent" aria-hidden />
        {showLabel && <span>{p.shortLabel}</span>}
        {flagColor && (
          <span className={clsx('absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-space-900', advisory.kind === 'SHELTER' && 'animate-pulse')} style={{ background: flagColor }} aria-hidden />
        )}
      </button>
      {open && <MissionContextDialog onClose={() => setOpen(false)} />}
    </>
  )
}

/** One line mission context for other views (mission overview). */
export function MissionContextStrip() {
  const profileId = useAppStore((s) => s.missionProfileId)
  const p = missionProfile(profileId)
  const Icon = PROFILE_ICON[profileId]
  const rate = p.radiation.doseEquivalentMSvPerDay
  const t = useT()
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-white/[0.03] px-3.5 py-2.5 text-[11px] text-ink-300 ring-1 ring-white/[0.06]">
      <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-100">
        <Icon size={14} className="text-accent" aria-hidden /> {p.label}
      </span>
      <span>{tx('mission.ctx.stripRadiation', { value: <strong className="text-ink-100">{rate ? t('mission.ctx.mSvPerDay', { v: rate.value }) : t('mission.ctx.negligibleLower')}</strong> })}</span>
      <span>{tx('mission.ctx.stripGravity', { value: <strong className="text-ink-100">{p.gravity.value.label}</strong> })}</span>
      <span>{tx('mission.ctx.stripDelay', { value: <strong className="text-ink-100">{p.oneWayDelaySec.value.label}</strong> })}</span>
      <span className="ml-auto text-ink-500">{t('mission.ctx.stripHint')}</span>
    </div>
  )
}
