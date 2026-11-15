/**
 * Online and offline mode switch (logic in src/lib/api/connectivity.ts):
 * - ConnectivityPanel: segmented control and plain status, mounted in Data and model, NASA context tab.
 * - ConnectivityChip: small top bar status that opens that tab.
 */
import clsx from 'clsx'
import { Check, CloudOff, Copy, LoaderCircle, RefreshCw, Satellite, TriangleAlert, type LucideIcon } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { apiBaseUrl, getBackendStatus } from '../../lib/api/client'
import {
  CONNECTIVITY_MODES,
  START_BACKEND_COMMAND,
  chipState,
  modeForcedByBuild,
  setConnectivityMode,
  useConnectivity,
  useConnectivityMode,
  type ConnectivityChipState,
} from '../../lib/api/connectivity'
import { useT } from '../../i18n'

const DataModelDialog = lazy(() => import('../datasources/DataModelDialog'))

/** How often Online mode re-checks the API (the probe itself is cached for 30 s). */
const RECHECK_MS = 30_000

/** Keeps the shared backend status fresh while the mode allows the network. */
function useBackendProbe() {
  const mode = useConnectivityMode()
  const backend = useConnectivity((s) => s.backend)
  useEffect(() => {
    if (mode === 'offline') return
    if (backend === null) void getBackendStatus()
  }, [mode, backend])
  useEffect(() => {
    // Only Online re-checks on its own (to notice a backend started later); Automatic probes once.
    if (mode !== 'online') return
    const id = window.setInterval(() => void getBackendStatus(), RECHECK_MS)
    return () => window.clearInterval(id)
  }, [mode])
  return { mode, backend, state: chipState(mode, backend) }
}

const CHIP_META: Record<ConnectivityChipState, { icon: LucideIcon; tone: string; dot: string }> = {
  checking: { icon: LoaderCircle, tone: 'text-ink-300', dot: 'bg-nodata' },
  'offline-demo': { icon: CloudOff, tone: 'text-ink-300', dot: 'bg-nodata' },
  live: { icon: Satellite, tone: 'text-accent', dot: 'bg-accent' },
  unreachable: { icon: TriangleAlert, tone: 'text-watch', dot: 'bg-watch' },
}

/** Top bar status chip: "Offline demo", "Live NASA data" or "API unreachable". Opens Data and model, NASA context. */
export function ConnectivityChip() {
  const t = useT()
  const { state } = useBackendProbe()
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const meta = CHIP_META[state]
  const Icon = meta.icon
  const label = t(`connectivity.chip.${state}`)
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={t('connectivity.chip.aria', { state: label })}
        title={t('connectivity.chip.title', { state: label })}
        onPointerEnter={() => setLoaded(true)}
        onFocus={() => setLoaded(true)}
        onClick={() => {
          setLoaded(true)
          setOpen(true)
        }}
        className={clsx(
          'focus-ring flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-[11px] font-semibold whitespace-nowrap ring-1 transition-colors hover:bg-white/[0.06]',
          state === 'unreachable' ? 'bg-watch/[0.08] ring-watch/35' : 'ring-white/[0.08]',
          meta.tone,
        )}
      >
        <Icon size={13} aria-hidden className={clsx(state === 'checking' && 'animate-spin')} />
        <span>{label}</span>
      </button>
      {loaded && (
        <Suspense fallback={null}>
          <DataModelDialog open={open} onClose={() => setOpen(false)} initialTab="nasa" />
        </Suspense>
      )}
    </>
  )
}

/** Segmented control (Automatic, Online, Offline) and the plain status of the connection. */
export function ConnectivityPanel() {
  const t = useT()
  const chosen = useConnectivity((s) => s.chosen)
  const forced = modeForcedByBuild()
  const { state } = useBackendProbe()
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(START_BACKEND_COMMAND)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked: the command stays selectable on screen
    }
  }
  const retry = async () => {
    setChecking(true)
    try {
      await getBackendStatus({ force: true })
    } finally {
      setChecking(false)
    }
  }

  return (
    <section aria-labelledby="conn-title" className="rounded-xl bg-white/[0.025] px-4 py-3 ring-1 ring-white/[0.08]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="conn-title" className="text-xs font-semibold text-ink-100">
          {t('connectivity.panel.title')}
        </h3>
        <div role="radiogroup" aria-label={t('connectivity.mode.groupAria')} className="flex h-8 items-center gap-0.5 rounded-lg bg-white/[0.035] p-[3px] ring-1 ring-white/[0.08]">
          {CONNECTIVITY_MODES.map((m) => {
            const sel = (forced ? 'offline' : chosen) === m
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={sel}
                disabled={forced}
                title={t(`connectivity.mode.${m}.hint`)}
                onClick={() => setConnectivityMode(m)}
                className={clsx(
                  'focus-ring h-full rounded-md px-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed',
                  sel ? 'bg-accent/[0.14] text-accent shadow-[inset_0_0_0_1px_rgba(94,234,212,0.35)]' : 'text-ink-500 hover:text-ink-100 disabled:hover:text-ink-500',
                )}
              >
                {t(`connectivity.mode.${m}`)}
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-ink-500">{t(`connectivity.mode.${forced ? 'offline' : chosen}.hint`)}</p>

      <div className="mt-2 text-xs" role="status" aria-live="polite">
        {forced ? (
          <p className="text-ink-300">{t('connectivity.panel.forced')}</p>
        ) : state === 'checking' ? (
          <p className="flex items-center gap-2 text-ink-500">
            <LoaderCircle size={13} className="animate-spin" aria-hidden /> {t('connectivity.panel.checking')}
          </p>
        ) : state === 'live' ? (
          <p className="text-ink-300">{t('connectivity.panel.live')}</p>
        ) : state === 'unreachable' ? (
          <div className="rounded-lg bg-watch/[0.07] px-3 py-2.5 ring-1 ring-watch/30">
            <p className="flex items-center gap-1.5 font-semibold text-watch">
              <TriangleAlert size={13} aria-hidden /> {t('connectivity.panel.unreachableTitle')}
            </p>
            <p className="mt-1 text-ink-300">{t('connectivity.panel.unreachableBody', { url: apiBaseUrl() ?? '' })}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded-md bg-space-950/60 px-2 py-1 font-mono text-[11px] text-ink-100 ring-1 ring-white/10 select-all">{START_BACKEND_COMMAND}</code>
              <button
                type="button"
                onClick={() => void copy()}
                className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold text-ink-300 ring-1 ring-white/10 hover:bg-white/[0.06] hover:text-ink-100"
              >
                {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
                {copied ? t('connectivity.panel.copied') : t('connectivity.panel.copy')}
              </button>
              <button
                type="button"
                onClick={() => void retry()}
                disabled={checking}
                className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-semibold text-ink-300 ring-1 ring-white/10 hover:bg-white/[0.06] hover:text-ink-100 disabled:opacity-60"
              >
                <RefreshCw size={12} aria-hidden className={clsx(checking && 'animate-spin')} /> {t('connectivity.panel.retry')}
              </button>
            </div>
          </div>
        ) : state === 'offline-demo' && chosen === 'offline' ? (
          <p className="text-ink-300">{t('connectivity.panel.offline')}</p>
        ) : (
          <p className="text-ink-300">{t('connectivity.panel.autoOffline')}</p>
        )}
      </div>
    </section>
  )
}
