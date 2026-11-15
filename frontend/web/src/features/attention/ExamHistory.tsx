/**
 * Exam history of a periodic exam region (eyes: SANS monitoring; ears: hearing and noise).
 *
 * Shows when each exam happened, every measure per eye or ear with its change from the
 * pre-flight baseline, when the next exam is due, and the origin of the data (SIMULATED).
 * An exam not yet done reads "No exam yet", never normal.
 */
import clsx from 'clsx'
import { CalendarClock, FlaskConical, Info } from 'lucide-react'
import { useAppStore } from '../../state/store'
import { STATUS_META } from '../../lib/status'
import type { ExamMeasureResult, ExamRegionId, ExamRegionState, ExamSession, HealthObservation, MetricCode, NoiseDay } from '../../types/domain'
import { METRIC_CATALOG } from '../../engine/catalog'
import { EXAMS } from '../../engine/config'
import { EXAM_DEVICE } from '../../engine/exams'
import { fmtDuration } from '../../engine/text'
import { StatusDot, StatusPill } from '../../components/Status'
import { Badge } from '../../components/ui'
import { ChangeBar } from '../../components/viz/ChangeBar'
import { Details } from '../../components/viz/Details'
import { ORIGIN_LABEL } from '../../components/format'
import { examChangeText } from '../anatomy/regions'
import { formatFixed, t, useT } from '../../i18n'
import { tx } from '../../i18n/rich'
import { metricLabel } from '../../i18n/catalog'
import { engineText } from '../../i18n/engineText'

/** The ear is not part of the 3D atlas: said plainly wherever the ears region is shown. */
export const EAR_NOT_MODELED_NOTE =
  'The ear is not modeled in the 3D body: the inner ear model is excluded for license reasons. The marker on the sides of the head only shows where hearing is tracked.'

const MEASURES: Record<ExamRegionId, MetricCode[]> = {
  eyes: ['RETINAL_THICKNESS', 'CHOROIDAL_FOLDS', 'OPTIC_NERVE_SHEATH_DIAMETER', 'VISUAL_ACUITY'],
  ears: ['HEARING_THRESHOLD_HIGH', 'HEARING_THRESHOLD_LOW'],
}

const fmtDate = (t: number) => new Date(t).toISOString().slice(0, 10)
const dayLabel = (d: number) => (d < 0 ? t('attention.exam.daysBeforeLaunch', { n: -d }) : t('attention.exam.flightDay', { n: d }))

function useExamState(astronautId: string, region: ExamRegionId): ExamRegionState | undefined {
  return useAppStore((s) => s.health[astronautId]?.exams?.[region])
}

function fmtValue(metric: MetricCode, v: number | null): string {
  if (v === null) return t('attention.exam.noValue')
  if (metric === 'CHOROIDAL_FOLDS') return v >= 1 ? t('attention.exam.present') : t('attention.exam.none')
  const def = METRIC_CATALOG[metric]
  return `${formatFixed(v, def.decimals)} ${def.unit}`
}

/** "Next exam: Flight day 90 eye exam, in 46 days." */
export function NextDue({ ex, className }: { ex: ExamRegionState; className?: string }) {
  const now = useAppStore((s) => s.clock.simNow)
  const nd = ex.nextDue
  const t = useT()
  return (
    <p className={clsx('flex items-start gap-1.5 text-xs leading-snug text-ink-300', className)}>
      <CalendarClock size={13} className="mt-px shrink-0 text-accent" aria-hidden />
      {nd ? (
        <span>
          {tx('attention.exam.nextDue', {
            label: <span className="font-semibold text-ink-100">{engineText('other', nd.label, nd.labelMsg)}</span>,
            date: fmtDate(nd.at),
            when: nd.at > now ? t('attention.exam.in', { duration: fmtDuration(nd.at - now) }) : t('attention.exam.now'),
          })}
        </span>
      ) : (
        <span>{t('attention.exam.noMore')}</span>
      )}
    </p>
  )
}

/** Short note for region cards (crew view): next exam due and, for the ears, the anatomy note. */
export function ExamCardNote({ astronautId, region }: { astronautId: string; region: ExamRegionId }) {
  const ex = useExamState(astronautId, region)
  const t = useT()
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {ex && <NextDue ex={ex} />}
      {region === 'ears' && <p className="text-[12px] leading-snug text-ink-500">{t('attention.exam.earNote')}</p>}
    </div>
  )
}

function ResultCell({ r }: { r: ExamMeasureResult | undefined }) {
  if (!r) return <td className="px-1.5 py-1 text-ink-500">{t('attention.exam.notMeasured')}</td>
  const meta = STATUS_META[r.status]
  const color = r.status === 'LOW' ? '#5eead4' : meta.color
  return (
    <td className="px-1.5 py-1 align-top" title={engineText('other', r.note, r.noteMsg)}>
      <span className="flex items-center gap-1.5">
        <StatusDot status={r.status} size={7} />
        <span className="tabular text-ink-100">{fmtValue(r.metric, r.value)}</span>
      </span>
      <ChangeBar change={r.change} baseline={r.baseline} color={color} className="mt-1 block pl-[13px]" />
      <span className="tabular block pl-[13px] text-[10px]" style={{ color: r.status === 'LOW' ? '#a9b6cf' : r.status === 'NO_DATA' ? undefined : meta.color }}>
        {examChangeText(r)}
      </span>
    </td>
  )
}

function BaselineCell({ o }: { o: HealthObservation | undefined }) {
  return <td className="tabular px-1.5 py-1 text-ink-300">{o ? fmtValue(o.metric_code, o.value) : <span className="text-ink-500">{t('attention.exam.none')}</span>}</td>
}

function SessionCard({ s, region }: { s: ExamSession; region: ExamRegionId }) {
  const metrics = MEASURES[region].filter((m) => s.observations.some((o) => o.metric_code === m))
  const find = (m: MetricCode, side: 'RIGHT' | 'LEFT') => s.results.find((r) => r.metric === m && r.laterality === side)
  const findObs = (m: MetricCode, side: 'RIGHT' | 'LEFT') => s.observations.find((o) => o.metric_code === m && o.exam?.laterality === side)
  const eyes = region === 'eyes'
  const t = useT()
  const label = engineText('other', s.label, s.labelMsg)
  const caption = s.isBaseline
    ? t(eyes ? 'attention.exam.captionEye' : 'attention.exam.captionEar', { label })
    : t(eyes ? 'attention.exam.captionEyeChange' : 'attention.exam.captionEarChange', { label })
  const devices = [...new Set(s.kinds.map((k) => EXAM_DEVICE[k].name))].join(', ')
  return (
    <li className={clsx('rounded-xl px-3 py-2.5 ring-1', s.isBaseline ? 'bg-white/[0.02] ring-white/[0.05]' : 'bg-white/[0.035] ring-white/[0.07]')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] leading-tight font-semibold text-ink-100">{label}</div>
          <div className="tabular text-[11px] text-ink-500">
            {fmtDate(s.at)} · {dayLabel(s.flightDay)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge tone="sim" icon={<FlaskConical size={10} aria-hidden />} title={t('attention.exam.devicesTitle', { devices })}>
            {ORIGIN_LABEL[s.data_origin]}
          </Badge>
          {s.isBaseline ? <Badge tone="muted">{t('attention.exam.baseline')}</Badge> : <StatusPill status={s.status} size="sm" />}
        </div>
      </div>
      <table className="mt-2 w-full text-left text-[11px]">
        <caption className="sr-only">
          {caption}
        </caption>
        <thead>
          <tr className="text-[10px] tracking-wide text-ink-500 uppercase">
            <th scope="col" className="px-1.5 py-0.5 font-semibold">
              {t('attention.exam.measure')}
            </th>
            <th scope="col" className="px-1.5 py-0.5 font-semibold">
              {t(eyes ? 'attention.exam.rightEye' : 'attention.exam.rightEar')}
            </th>
            <th scope="col" className="px-1.5 py-0.5 font-semibold">
              {t(eyes ? 'attention.exam.leftEye' : 'attention.exam.leftEar')}
            </th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m} className="border-t border-white/[0.05]">
              <th scope="row" className="px-1.5 py-1 align-top font-medium text-ink-300">
                {metricLabel(m)}
              </th>
              {s.isBaseline ? (
                <>
                  <BaselineCell o={findObs(m, 'RIGHT')} />
                  <BaselineCell o={findObs(m, 'LEFT')} />
                </>
              ) : (
                <>
                  <ResultCell r={find(m, 'RIGHT')} />
                  <ResultCell r={find(m, 'LEFT')} />
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </li>
  )
}

function NoiseList({ days }: { days: NoiseDay[] }) {
  if (!days.length) return <p className="rounded-xl border border-dashed border-nodata/40 px-3 py-2 text-xs text-nodata">{t('attention.exam.noNoise')}</p>
  const max = Math.max(EXAMS.noise.workLeqDba + 6, ...days.map((d) => d.leqDba))
  const min = 50
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`
  return (
    <div>
      <div className="relative">
        <ol className="flex flex-col gap-0.5" aria-label={t('attention.exam.noiseAria')}>
          {days.map((d) => (
            <li key={d.flightDay} className="grid grid-cols-[52px_1fr_92px] items-center gap-2 text-[11px]">
              <span className="tabular text-ink-500">{t('attention.exam.fd', { n: d.flightDay })}</span>
              <span className="relative h-2 rounded bg-white/[0.04]">
                <span className="absolute inset-y-0 left-0 rounded" style={{ width: pct(d.leqDba), background: d.status === 'LOW' ? 'rgba(94,234,212,0.55)' : STATUS_META[d.status].color }} />
                <span className="absolute -inset-y-0.5 w-px bg-amber-300/70" style={{ left: pct(EXAMS.noise.workLeqDba) }} aria-hidden />
              </span>
              <span className="tabular text-right text-ink-300">
                {formatFixed(d.leqDba, 1)} dBA · {formatFixed(d.dosePct, 0)}%
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-ink-500">
        {t('attention.exam.noiseNote', { level: EXAMS.noise.workLeqDba })}
      </p>
    </div>
  )
}

/** Full exam history for the attention panel. */
export function ExamHistory({ astronautId, region }: { astronautId: string; region: ExamRegionId }) {
  const ex = useExamState(astronautId, region)
  const t = useT()
  if (!ex) return <div className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-xs text-ink-500">{t('attention.exam.notComputed')}</div>
  const title = region === 'eyes' ? t('attention.exam.eyeExams') : t('attention.exam.hearingTests')
  const sessions = [...ex.sessions].reverse()
  return (
    <section aria-label={t('attention.exam.historyAria', { title })} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">{title}</h3>
        <NextDue ex={ex} />
      </div>
      {sessions.length === 0 && (
        <p className="rounded-xl border border-dashed border-nodata/40 px-3 py-2.5 text-xs leading-snug text-ink-300" role="status">
          <span className="font-semibold text-nodata">{t('attention.exam.noExamYet')}</span> {t(region === 'eyes' ? 'attention.exam.noEyeExam' : 'attention.exam.noHearingTest')}
        </p>
      )}
      {(() => {
        // Newest exam up front; earlier ones and the pre-flight baseline behind a disclosure.
        const all = [...sessions, ...[...ex.baselineSessions].reverse()]
        const [latest, ...earlier] = all
        return (
          <>
            <ul className="flex flex-col gap-2" aria-label={t('attention.exam.newestFirst', { title })}>
              {latest && <SessionCard s={latest} region={region} />}
            </ul>
            {earlier.length > 0 && (
              <Details label={t('visual.earlierExams', { n: earlier.length })}>
                <ul className="mt-1 flex flex-col gap-2">
                  {earlier.map((s) => (
                    <SessionCard key={s.id} s={s} region={region} />
                  ))}
                </ul>
              </Details>
            )}
          </>
        )
      })()}
      {region === 'ears' && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">{t('attention.exam.noiseTitle', { n: EXAMS.noise.keepDays })}</h3>
          <NoiseList days={ex.noise ?? []} />
        </div>
      )}
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-500">
        <Info size={12} className="mt-px shrink-0" aria-hidden />
        <span>
          {engineText('other', ex.method, ex.methodMsg)} {t('attention.exam.decisionSupport')}{region === 'ears' ? ` ${t('attention.exam.earNote')}` : ''}
        </span>
      </p>
    </section>
  )
}
