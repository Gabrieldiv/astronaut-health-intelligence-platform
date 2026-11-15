import clsx from 'clsx'
import { Globe2, LoaderCircle, Magnet, Microscope, Orbit, RefreshCw, Server, ServerOff, Sun, Zap, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchOsdrStudies, getBackendStatus, type ApiOsdrStudyList, type BackendStatus } from '../../lib/api/client'
import { loadSpaceWeather } from '../../lib/nasa/spaceWeather'
import type { SpaceWeatherEvent, SpaceWeatherEventKind, SpaceWeatherSnapshot } from '../../types/nasa'
import { useT } from '../../i18n'
import { tx } from '../../i18n/rich'
import { ExtLink, OriginBadge, formatIsoUtc } from './shared'
import { ConnectivityPanel } from '../connectivity'
import { useConnectivityMode } from '../../lib/api/connectivity'

const KIND_ICON: Record<SpaceWeatherEventKind, LucideIcon> = {
  SOLAR_FLARE: Sun,
  SEP: Zap,
  CME: Orbit,
  GEOMAGNETIC_STORM: Magnet,
}
const KIND_ORDER: SpaceWeatherEventKind[] = ['SOLAR_FLARE', 'SEP', 'CME', 'GEOMAGNETIC_STORM']
const DONKI_DOCS = 'https://ccmc.gsfc.nasa.gov/tools/DONKI/'

type Load<T> = { kind: 'loading' } | { kind: 'ready'; data: T } | { kind: 'error'; message: string }

export function NasaContextTab() {
  const t = useT()
  const [status, setStatus] = useState<BackendStatus | null>(null)
  const [weather, setWeather] = useState<Load<SpaceWeatherSnapshot>>({ kind: 'loading' })
  const [nonce, setNonce] = useState(0)
  const mode = useConnectivityMode()

  useEffect(() => {
    let alive = true
    getBackendStatus({ force: nonce > 0 }).then((s) => alive && setStatus(s))
    loadSpaceWeather()
      .then((data) => alive && setWeather({ kind: 'ready', data }))
      .catch((e: unknown) => alive && setWeather({ kind: 'error', message: e instanceof Error ? e.message : String(e) }))
    return () => {
      alive = false
    }
  }, [nonce, mode])

  const retry = useCallback(() => {
    setStatus(null)
    setNonce((n) => n + 1)
  }, [])

  return (
    <div className="space-y-4">
      <div role="note" className="flex gap-3 rounded-xl bg-accent/[0.06] px-4 py-3 ring-1 ring-accent/20">
        <Globe2 size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <div className="text-xs leading-relaxed text-ink-300">
          <p className="font-semibold text-ink-100">{t('datasources.nasa.noteTitle')}</p>
          <p className="mt-1">{t('datasources.nasa.noteBody')}</p>
        </div>
      </div>

      <ConnectivityPanel />
      <BackendCard status={status} onRetry={retry} />
      <SpaceWeatherSection state={weather} />
      {mode !== 'offline' && <OsdrSection status={status} />}
    </div>
  )
}

function BackendCard({ status, onRetry }: { status: BackendStatus | null; onRetry: () => void }) {
  const t = useT()
  const connected = status?.kind === 'connected'
  return (
    <section aria-label={t('datasources.nasa.backendAria')} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/[0.08]" aria-live="polite">
      {status === null ? (
        <span className="flex items-center gap-2 text-xs text-ink-500" role="status">
          <LoaderCircle size={14} className="animate-spin" aria-hidden /> {t('datasources.nasa.checking')}
        </span>
      ) : connected ? (
        <>
          <Server size={16} className="shrink-0 text-accent" aria-hidden />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold text-ink-100">{t('datasources.nasa.connected')}</p>
            <p className="text-ink-500">
              {tx('datasources.nasa.connectedDetail', {
                url: <span className="font-mono text-[11px]">{status.baseUrl}</span>,
                version: status.health.version,
                db: status.health.database_backend,
              })}
              {status.health.status !== 'ok' && <span className="text-amber-200"> {t('datasources.nasa.degraded')}</span>}
            </p>
          </div>
        </>
      ) : (
        <>
          <ServerOff size={16} className="shrink-0 text-ink-500" aria-hidden />
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-semibold text-ink-100">{t('datasources.nasa.offlineTitle')}</p>
            <p className="text-ink-500">
              {t('datasources.nasa.offlineBody')}
              <span className="sr-only"> {t('datasources.nasa.reason', { reason: status.reason })}</span>
            </p>
          </div>
        </>
      )}
      {status !== null && (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold text-ink-300 ring-1 ring-white/10 hover:bg-white/[0.06] hover:text-ink-100"
        >
          <RefreshCw size={12} aria-hidden /> {t('datasources.nasa.checkAgain')}
        </button>
      )}
    </section>
  )
}

function SpaceWeatherSection({ state }: { state: Load<SpaceWeatherSnapshot> }) {
  const t = useT()
  const [showAll, setShowAll] = useState(false)
  const counts = useMemo(() => {
    const c: Record<SpaceWeatherEventKind, number> = { SOLAR_FLARE: 0, SEP: 0, CME: 0, GEOMAGNETIC_STORM: 0 }
    if (state.kind === 'ready') for (const e of state.data.events) c[e.kind]++
    return c
  }, [state])

  return (
    <article className="rounded-2xl bg-white/[0.025] ring-1 ring-white/[0.08]" aria-labelledby="sw-title">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <OriginBadge origin="REAL_PUBLIC" />
            {state.kind === 'ready' && <ModeChip mode={state.data.mode} />}
          </div>
          <h3 id="sw-title" className="mt-1.5 text-sm font-semibold text-ink-100">
            {t('datasources.nasa.swTitle')}
          </h3>
          <p className="text-[11px] text-ink-500">NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information), CCMC at NASA Goddard</p>
        </div>
        <ExtLink href={state.kind === 'ready' ? state.data.sourceUrl : 'https://ccmc.gsfc.nasa.gov/DONKI/'} className="shrink-0 text-xs font-semibold">
          DONKI
        </ExtLink>
      </header>

      <div className="px-4 py-3">
        {state.kind === 'loading' && (
          <div className="flex items-center gap-2 py-4 text-xs text-ink-500" role="status">
            <LoaderCircle size={14} className="animate-spin" aria-hidden /> {t('datasources.nasa.swLoading')}
          </div>
        )}
        {state.kind === 'error' && (
          <p role="alert" className="py-2 text-xs text-ink-300">
            {t('datasources.nasa.swError', { message: state.message })}
          </p>
        )}
        {state.kind === 'ready' && (
          <>
            <p className="text-[11px] leading-relaxed text-ink-500">
              {tx(state.data.mode === 'snapshot' ? 'datasources.nasa.retrievedSnapshot' : 'datasources.nasa.retrievedLive', {
                when: <span className="tabular text-ink-300">{formatIsoUtc(state.data.retrievedAt)}</span>,
                start: <span className="tabular">{formatIsoUtc(state.data.window.start)}</span>,
                end: <span className="tabular">{formatIsoUtc(state.data.window.end)}</span>,
              })}
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t('datasources.nasa.eventsByType')}>
              {KIND_ORDER.map((k) => {
                const Icon = KIND_ICON[k]
                return (
                  <li key={k} className="rounded-lg bg-white/[0.03] px-3 py-2 ring-1 ring-white/[0.06]" title={t(`datasources.nasa.kind.${k}.plain`)}>
                    <span className="flex items-center gap-1.5 text-[11px] text-ink-500">
                      <Icon size={12} aria-hidden /> {t(`datasources.nasa.kind.${k}.label`)}
                    </span>
                    <span className="tabular text-lg font-semibold text-ink-100">{counts[k]}</span>
                  </li>
                )
              })}
            </ul>
            {state.data.events.length === 0 ? (
              <p className="mt-3 text-xs text-ink-500">{t('datasources.nasa.noEvents')}</p>
            ) : (
              <>
                <h4 className="mt-4 text-[11px] font-semibold tracking-[0.12em] text-ink-500 uppercase">{t('datasources.nasa.latestEvents')}</h4>
                <ul className="mt-1 divide-y divide-white/[0.05]">
                  {(showAll ? state.data.events : state.data.events.slice(0, 8)).map((e) => (
                    <EventRow key={e.id} e={e} />
                  ))}
                </ul>
                {state.data.events.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    aria-expanded={showAll}
                    className="focus-ring mt-2 rounded text-[11px] font-semibold text-accent hover:underline"
                  >
                    {showAll ? t('datasources.nasa.showFewer') : t('datasources.nasa.showAll', { n: state.data.events.length })}
                  </button>
                )}
              </>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
              {tx('datasources.nasa.contextOnly', { link: <ExtLink href={DONKI_DOCS}>CCMC DONKI</ExtLink> })}
            </p>
          </>
        )}
      </div>
    </article>
  )
}

function EventRow({ e }: { e: SpaceWeatherEvent }) {
  const t = useT()
  const Icon = KIND_ICON[e.kind]
  const detail =
    e.kind === 'SOLAR_FLARE' && e.classType
      ? t('datasources.nasa.classType', { value: e.classType })
      : e.kind === 'GEOMAGNETIC_STORM' && e.kpIndex != null
        ? `Kp ${e.kpIndex}`
        : null
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs">
      <Icon size={14} className="shrink-0 text-ink-500" aria-hidden />
      <span className="min-w-[150px] font-medium text-ink-100" title={t(`datasources.nasa.kind.${e.kind}.plain`)}>
        {t(`datasources.nasa.kind.${e.kind}.label`)}
        {detail && <span className="ml-1.5 font-mono text-[11px] text-ink-300">{detail}</span>}
      </span>
      <span className="tabular text-ink-500">{formatIsoUtc(e.startTime)}</span>
      {e.peakTime && <span className="tabular text-ink-500">{t('datasources.nasa.peak', { time: formatIsoUtc(e.peakTime).slice(11) })}</span>}
      <ExtLink href={e.link} className="ml-auto text-[11px]">
        <span className="sr-only">{t('datasources.nasa.donkiRecord')} </span>
        {e.id}
      </ExtLink>
    </li>
  )
}

function ModeChip({ mode }: { mode: SpaceWeatherSnapshot['mode'] }) {
  const t = useT()
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
        mode === 'live' ? 'bg-accent/10 text-accent ring-1 ring-accent/30' : 'bg-white/[0.06] text-ink-300 ring-1 ring-white/15',
      )}
      title={mode === 'live' ? t('datasources.nasa.modeLiveTitle') : t('datasources.nasa.modeSnapshotTitle')}
    >
      {mode === 'live' ? 'LIVE' : 'SNAPSHOT'}
    </span>
  )
}

function OsdrSection({ status }: { status: BackendStatus | null }) {
  const t = useT()
  // 'loading' until the first answer after the API is found connected.
  const [state, setState] = useState<Load<ApiOsdrStudyList>>({ kind: 'loading' })
  const connected = status?.kind === 'connected'

  useEffect(() => {
    if (!connected) return
    const ctrl = new AbortController()
    fetchOsdrStudies('astronaut', 8, ctrl.signal)
      .then((data) => setState({ kind: 'ready', data }))
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      })
    return () => ctrl.abort()
  }, [connected])

  return (
    <article className="rounded-2xl bg-white/[0.025] ring-1 ring-white/[0.08]" aria-labelledby="osdr-title">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <OriginBadge origin="REAL_PUBLIC" />
            <Microscope size={13} className="text-ink-500" aria-hidden />
          </div>
          <h3 id="osdr-title" className="mt-1.5 text-sm font-semibold text-ink-100">
            {t('datasources.nasa.osdrTitle')}
          </h3>
          <p className="text-[11px] text-ink-500">{t('datasources.nasa.osdrSubtitle')}</p>
        </div>
        <ExtLink href="https://osdr.nasa.gov/bio/repo/" className="shrink-0 text-xs font-semibold">
          OSDR
        </ExtLink>
      </header>
      <div className="px-4 py-3 text-xs">
        {!connected && status !== null && <p className="text-ink-500">{t('datasources.nasa.osdrNeedsApi')}</p>}
        {(status === null || (connected && state.kind === 'loading')) && (
          <div className="flex items-center gap-2 py-2 text-ink-500" role="status">
            <LoaderCircle size={14} className="animate-spin" aria-hidden /> {t('datasources.nasa.osdrLoading')}
          </div>
        )}
        {connected && state.kind === 'error' && (
          <p role="alert" className="text-ink-300">
            {t('datasources.nasa.osdrError', { message: state.message })}
          </p>
        )}
        {connected && state.kind === 'ready' && (
          <>
            <p className="text-[11px] text-ink-500">
              {tx('datasources.nasa.osdrSummary', {
                total: state.data.total,
                shown: state.data.studies.length,
                when: <span className="tabular">{formatIsoUtc(state.data.retrievedAt)}</span>,
              })}
            </p>
            <ul className="mt-2 divide-y divide-white/[0.05]">
              {state.data.studies.map((s) => (
                <li key={s.id} className="py-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <ExtLink href={s.link} className="font-mono text-[11px] font-semibold">
                      {s.id}
                    </ExtLink>
                    <span className="font-medium text-ink-100">{s.title}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    {[s.projectType, s.mission, s.releaseDate ? t('datasources.nasa.released', { date: s.releaseDate }) : null].filter(Boolean).join(' · ') ||
                      t('datasources.nasa.detailsNotStated')}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </article>
  )
}
