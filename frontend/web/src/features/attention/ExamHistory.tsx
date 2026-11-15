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
import { ORIGIN_LABEL } from '../../components/format'
import { examChangeText } from '../anatomy/regions'

/** The ear is not part of the 3D atlas: said plainly wherever the ears region is shown. */
export const EAR_NOT_MODELED_NOTE =
  'The ear is not modeled in the 3D body: the inner ear model is excluded for license reasons. The marker on the sides of the head only shows where hearing is tracked.'

const MEASURES: Record<ExamRegionId, MetricCode[]> = {
  eyes: ['RETINAL_THICKNESS', 'CHOROIDAL_FOLDS', 'OPTIC_NERVE_SHEATH_DIAMETER', 'VISUAL_ACUITY'],
  ears: ['HEARING_THRESHOLD_HIGH', 'HEARING_THRESHOLD_LOW'],
}

const fmtDate = (t: number) => new Date(t).toISOString().slice(0, 10)
const dayLabel = (d: number) => (d < 0 ? `${-d} days before launch` : `Flight day ${d}`)

function useExamState(astronautId: string, region: ExamRegionId): ExamRegionState | undefined {
  return useAppStore((s) => s.health[astronautId]?.exams?.[region])
}

function fmtValue(metric: MetricCode, v: number | null): string {
  if (v === null) return 'no value'
  if (metric === 'CHOROIDAL_FOLDS') return v >= 1 ? 'present' : 'none'
  const def = METRIC_CATALOG[metric]
  return `${v.toFixed(def.decimals)} ${def.unit}`
}

/** "Next exam: Flight day 90 eye exam, in 46 days." */
export function NextDue({ ex, className }: { ex: ExamRegionState; className?: string }) {
  const now = useAppStore((s) => s.clock.simNow)
  const nd = ex.nextDue
  return (
    <p className={clsx('flex items-start gap-1.5 text-xs leading-snug text-ink-300', className)}>
      <CalendarClock size={13} className="mt-px shrink-0 text-accent" aria-hidden />
      {nd ? (
        <span>
          Next exam due: <span className="font-semibold text-ink-100">{nd.label}</span>, {fmtDate(nd.at)} ({nd.at > now ? `in ${fmtDuration(nd.at - now)}` : 'now'}).
        </span>
      ) : (
        <span>No more in-flight exams planned. The post-flight exam follows landing.</span>
      )}
    </p>
  )
}

/** Short note for region cards (crew view): next exam due and, for the ears, the anatomy note. */
export function ExamCardNote({ astronautId, region }: { astronautId: string; region: ExamRegionId }) {
  const ex = useExamState(astronautId, region)
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {ex && <NextDue ex={ex} />}
      {region === 'ears' && <p className="text-[12px] leading-snug text-ink-500">{EAR_NOT_MODELED_NOTE}</p>}
    </div>
  )
}

function ResultCell({ r }: { r: ExamMeasureResult | undefined }) {
  if (!r) return <td className="px-1.5 py-1 text-ink-500">not measured</td>
  const meta = STATUS_META[r.status]
  return (
    <td className="px-1.5 py-1 align-top" title={r.note}>
      <span className="flex items-center gap-1.5">
        <StatusDot status={r.status} size={7} />
        <span className="tabular text-ink-100">{fmtValue(r.metric, r.value)}</span>
      </span>
      <span className="tabular block pl-[13px] text-[10px]" style={{ color: r.status === 'LOW' ? '#a9b6cf' : r.status === 'NO_DATA' ? undefined : meta.color }}>
        {examChangeText(r)}
      </span>
    </td>
  )
}

function BaselineCell({ o }: { o: HealthObservation | undefined }) {
  return <td className="tabular px-1.5 py-1 text-ink-300">{o ? fmtValue(o.metric_code, o.value) : <span className="text-ink-500">none</span>}</td>
}

function SessionCard({ s, region }: { s: ExamSession; region: ExamRegionId }) {
  const metrics = MEASURES[region].filter((m) => s.observations.some((o) => o.metric_code === m))
  const find = (m: MetricCode, side: 'RIGHT' | 'LEFT') => s.results.find((r) => r.metric === m && r.laterality === side)
  const findObs = (m: MetricCode, side: 'RIGHT' | 'LEFT') => s.observations.find((o) => o.metric_code === m && o.exam?.laterality === side)
  const sideWord = region === 'eyes' ? 'eye' : 'ear'
  const devices = [...new Set(s.kinds.map((k) => EXAM_DEVICE[k].name))].join(', ')
  return (
    <li className={clsx('rounded-xl px-3 py-2.5 ring-1', s.isBaseline ? 'bg-white/[0.02] ring-white/[0.05]' : 'bg-white/[0.035] ring-white/[0.07]')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[13px] leading-tight font-semibold text-ink-100">{s.label}</div>
          <div className="tabular text-[11px] text-ink-500">
            {fmtDate(s.at)} · {dayLabel(s.flightDay)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge tone="sim" icon={<FlaskConical size={10} aria-hidden />} title={`Data origin. Devices: ${devices}`}>
            {ORIGIN_LABEL[s.data_origin]}
          </Badge>
          {s.isBaseline ? <Badge tone="muted">Baseline</Badge> : <StatusPill status={s.status} size="sm" />}
        </div>
      </div>
      <table className="mt-2 w-full text-left text-[11px]">
        <caption className="sr-only">
          {s.label}: values per {sideWord}
          {s.isBaseline ? '' : ' and change from the pre-flight baseline'}
        </caption>
        <thead>
          <tr className="text-[10px] tracking-wide text-ink-500 uppercase">
            <th scope="col" className="px-1.5 py-0.5 font-semibold">
              Measure
            </th>
            <th scope="col" className="px-1.5 py-0.5 font-semibold">
              Right {sideWord}
            </th>
            <th scope="col" className="px-1.5 py-0.5 font-semibold">
              Left {sideWord}
            </th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m} className="border-t border-white/[0.05]">
              <th scope="row" className="px-1.5 py-1 align-top font-medium text-ink-300">
                {METRIC_CATALOG[m].label}
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
  if (!days.length) return <p className="rounded-xl border border-dashed border-nodata/40 px-3 py-2 text-xs text-nodata">No noise reading yet. Missing data is never treated as normal.</p>
  const max = Math.max(EXAMS.noise.workLeqDba + 6, ...days.map((d) => d.leqDba))
  const min = 50
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`
  return (
    <div>
      <div className="relative">
        <ol className="flex flex-col gap-0.5" aria-label="Daily noise exposure, most recent last">
          {days.map((d) => (
            <li key={d.flightDay} className="grid grid-cols-[52px_1fr_92px] items-center gap-2 text-[11px]">
              <span className="tabular text-ink-500">FD {d.flightDay}</span>
              <span className="relative h-2 rounded bg-white/[0.04]">
                <span className="absolute inset-y-0 left-0 rounded" style={{ width: pct(d.leqDba), background: d.status === 'LOW' ? 'rgba(94,234,212,0.55)' : STATUS_META[d.status].color }} />
                <span className="absolute -inset-y-0.5 w-px bg-amber-300/70" style={{ left: pct(EXAMS.noise.workLeqDba) }} aria-hidden />
              </span>
              <span className="tabular text-right text-ink-300">
                {d.leqDba.toFixed(1)} dBA · {d.dosePct.toFixed(0)}%
              </span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-ink-500">
        Bar: average sound level over the 16 hour work period. Yellow line: {EXAMS.noise.workLeqDba} dBA ISS flight rule level for crew worn dosimetry (NASA HSRB hearing loss risk record). Percent: share of
        the 24 hour noise dose limit (NASA-STD-3001 V2 6115). One simulated reading per day; on the ISS crew worn dosimetry runs about every 60 days.
      </p>
    </div>
  )
}

/** Full exam history for the attention panel. */
export function ExamHistory({ astronautId, region }: { astronautId: string; region: ExamRegionId }) {
  const ex = useExamState(astronautId, region)
  if (!ex) return <div className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-xs text-ink-500">Exam follow up not computed yet.</div>
  const title = region === 'eyes' ? 'Eye exams' : 'Hearing tests'
  const sessions = [...ex.sessions].reverse()
  return (
    <section aria-label={`${title} history`} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">{title}</h3>
        <NextDue ex={ex} />
      </div>
      {sessions.length === 0 && (
        <p className="rounded-xl border border-dashed border-nodata/40 px-3 py-2.5 text-xs leading-snug text-ink-300" role="status">
          <span className="font-semibold text-nodata">No exam yet.</span> No in-flight {region === 'eyes' ? 'eye exam' : 'hearing test'} has been done so far. An exam not yet done is never read as normal.
        </p>
      )}
      <ul className="flex flex-col gap-2" aria-label={`${title}, newest first`}>
        {sessions.map((s) => (
          <SessionCard key={s.id} s={s} region={region} />
        ))}
        {[...ex.baselineSessions].reverse().map((s) => (
          <SessionCard key={s.id} s={s} region={region} />
        ))}
      </ul>
      {region === 'ears' && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-semibold tracking-[0.14em] text-ink-500 uppercase">Noise exposure, last {EXAMS.noise.keepDays} days</h3>
          <NoiseList days={ex.noise ?? []} />
        </div>
      )}
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-500">
        <Info size={12} className="mt-px shrink-0" aria-hidden />
        <span>
          {ex.method} Decision support only, not a diagnosis.{region === 'ears' ? ` ${EAR_NOT_MODELED_NOTE}` : ''}
        </span>
      </p>
    </section>
  )
}
