import clsx from 'clsx'
import { Bell, BellRing, CirclePlay, LayoutDashboard, UserRound } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '../../state/store'
import { STATUS_META } from '../../lib/status'
import type { MissionPhase, Status } from '../../types/domain'
import { StatusDot } from '../../components/Status'
import { IconButton } from '../../components/ui'
import { formatMET, formatUtcDate, formatUtcTime } from '../../components/format'
import { useUiStore } from '../../app/uiStore'
import { ProvenanceBadge } from './ProvenancePopover'
import { ScenarioControl } from './ScenarioControl'
import { ToolsMenu } from './ToolsMenu'
import { usePriorityCollapse } from './usePriorityCollapse'
import { CommsIndicator } from '../comms'
import { ConnectivityChip } from '../connectivity'
import { MissionProfileControl } from '../mission/MissionContext'
import { MISSION_ACCENT } from '../mission/backdrops/facts'
import { t, translatedRecord, useT } from '../../i18n'

const PHASE_LABEL: Record<MissionPhase, string> = translatedRecord(['PRE_FLIGHT', 'IN_FLIGHT', 'POST_FLIGHT'] as const, (p) => t(`topbar.phase.${p}`))

/**
 * Collapse order, lowest priority first. The bar applies as many steps as it needs to fit its
 * real width (measured, no fixed breakpoints): labels go first, then items move into the Tools
 * menu, and the Start demo label is the very last thing to go. The right zone (Start demo and
 * the alerts bell) is never clipped.
 */
const STEPS = [
  'crewDots', // crew status dots (the crew rail already shows status)
  'speedIcon', // gauge icon in the speed picker
  'scenarioWord', // "Scenario" word before the scenario name
  'toolsLabel', // "Tools" text on the menu button
  'viewLabels', // Ground / Crew text on the view toggle
  'missionName', // mission name block (MET stays)
  'restartToMenu', // restart button moves into the Tools menu
  'commsLabel', // Earth link delay text (icon and in-transit count stay)
  'profileLabel', // mission profile name (icon, advisory dot and tooltip stay)
  'wordmark', // "AHI" text next to the logo
  'scenarioName', // scenario name (tooltip and accessible name keep it)
  'demoShort', // "Start demo" becomes "Demo"
  'viewToMenu', // Ground / Crew toggle moves into the Tools menu (V still works)
  'demoIcon', // last resort: Start demo as icon with tooltip
] as const
type Step = (typeof STEPS)[number]

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="ahi-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.5" fill="rgba(94,234,212,0.06)" stroke="url(#ahi-g)" strokeOpacity="0.55" />
      <ellipse cx="16" cy="16" rx="14" ry="5.2" fill="none" stroke="url(#ahi-g)" strokeOpacity="0.45" transform="rotate(-24 16 16)" />
      <path d="M6.5 17h5l2-4.5 3.2 8.5 2.4-5.5h6.4" fill="none" stroke="url(#ahi-g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="27.4" cy="10.4" r="1.6" fill="#5eead4" />
    </svg>
  )
}

function Brand({ wordmark }: { wordmark: boolean }) {
  const t = useT()
  return (
    <div className="flex shrink-0 items-center gap-2" title={t('topbar.brandTitle')}>
      <LogoMark size={28} />
      {wordmark ? (
        <span className="text-[15px] font-bold tracking-[0.08em] text-ink-100">
          AHI<span className="sr-only">{t('topbar.brandSr')}</span>
        </span>
      ) : (
        <span className="sr-only">{t('topbar.brandTitle')}</span>
      )}
    </div>
  )
}

/** Mission name without the product prefix ("AHI Demo Expedition" reads "Demo Expedition" next to the logo). */
function shortMissionName(name: string) {
  return name.replace(/^AHI\s+/i, '')
}

function MissionName() {
  const mission = useAppStore((s) => s.mission)
  return (
    <div className="shrink-0 leading-tight whitespace-nowrap" title={`${mission.name}. ${mission.vehicle}. ${PHASE_LABEL[mission.phase]}.`}>
      <div className="text-[13px] font-semibold text-ink-100">{shortMissionName(mission.name)}</div>
      <div className="text-[11px] text-ink-500">{PHASE_LABEL[mission.phase]}</div>
    </div>
  )
}

/** Mission elapsed time. UTC lives in the tooltip (and in the accessible text). */
function MissionClock() {
  const { simNow, startedAt } = useAppStore(useShallow((s) => ({ simNow: Math.floor(s.clock.simNow / 1000) * 1000, startedAt: s.mission.startedAt })))
  const utc = `${formatUtcTime(simNow)} UTC, ${formatUtcDate(simNow)}`
  return (
    <div className="flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap" title={t('topbar.metTitle', { utc })}>
      <span className="text-[10px] font-semibold tracking-[0.14em] text-ink-500 uppercase" aria-hidden>
        MET
      </span>
      <span className="sr-only">{t('topbar.metSr')}</span>
      <span className="tabular font-mono text-[15px] font-medium text-ink-100">{formatMET(startedAt, simNow)}</span>
      <span className="sr-only">. {utc}</span>
    </div>
  )
}

/** Tiny crew status dot cluster. Shown only when the bar has spare room. */
function CrewDots() {
  const crew = useAppStore((s) => s.crew)
  const levels = useAppStore(
    useShallow((s) =>
      s.crew.map((c): Status => {
        const h = s.health[c.id]
        if (!h) return 'NO_DATA'
        const lost = h.metrics.HEART_RATE?.current == null && h.metrics.SPO2?.current == null
        return lost && h.risk.risk_level === 'LOW' ? 'NO_DATA' : h.risk.risk_level
      }),
    ),
  )
  const selectAstronaut = useAppStore((s) => s.selectAstronaut)
  const rank = (l: Status) => (l === 'NO_DATA' ? 1.5 : STATUS_META[l].rank)
  let worstIdx = 0
  levels.forEach((l, i) => {
    if (rank(l) > rank(levels[worstIdx]!)) worstIdx = i
  })
  const label = crew.map((c, i) => `${c.callsign}: ${levels[i] === 'NO_DATA' ? t('topbar.crewNoData') : STATUS_META[levels[i] ?? 'LOW'].crewLabel}`).join(', ')
  return (
    <button
      type="button"
      onClick={() => crew[worstIdx] && selectAstronaut(crew[worstIdx]!.id)}
      aria-label={t('topbar.crewDotsAria', { label })}
      title={t('topbar.crewDotsTitle', { label })}
      className="focus-ring flex h-9 shrink-0 items-center gap-1 rounded-xl px-2.5 ring-1 ring-white/[0.08] hover:bg-white/[0.06]"
    >
      {levels.map((s, i) => (
        <StatusDot key={crew[i]?.id ?? i} status={s} size={7} />
      ))}
    </button>
  )
}

/** Ground / Crew segmented toggle. */
function ViewToggle({ showLabels }: { showLabels: boolean }) {
  const viewMode = useUiStore((s) => s.viewMode)
  const setViewMode = useUiStore((s) => s.setViewMode)
  const t = useT()
  const options = [
    { id: 'ground' as const, label: t('topbar.view.ground'), aria: t('topbar.view.groundAria'), icon: LayoutDashboard, hint: t('topbar.view.groundHint') },
    { id: 'crew' as const, label: t('topbar.view.crew'), aria: t('topbar.view.crewAria'), icon: UserRound, hint: t('topbar.view.crewHint') },
  ]
  return (
    <div data-tour="viewtoggle" role="radiogroup" aria-label={t('topbar.view.groupAria')} className="flex h-9 shrink-0 items-center gap-0.5 rounded-xl bg-white/[0.035] p-[3px] ring-1 ring-white/[0.08]">
      {options.map((o) => {
        const sel = viewMode === o.id
        const Icon = o.icon
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={sel}
            aria-label={o.aria}
            title={o.hint}
            onClick={() => setViewMode(o.id)}
            className={clsx(
              'focus-ring flex h-full items-center gap-1.5 rounded-[9px] text-xs font-semibold whitespace-nowrap transition-all',
              showLabels ? 'px-2.5' : 'w-[30px] justify-center',
              sel ? 'bg-accent/[0.14] text-accent shadow-[inset_0_0_0_1px_rgba(94,234,212,0.35)]' : 'text-ink-500 hover:text-ink-100',
            )}
          >
            <Icon size={14} aria-hidden />
            {showLabels && o.label}
          </button>
        )
      })}
    </div>
  )
}

function DemoButton({ mode }: { mode: 'full' | 'short' | 'icon' }) {
  const startTour = useUiStore((s) => s.startTour)
  const active = useUiStore((s) => s.tour.active)
  const t = useT()
  return (
    <button
      type="button"
      data-tour="demo"
      onClick={startTour}
      title={t('topbar.demo.title')}
      aria-label={t('topbar.demo.aria')}
      className={clsx(
        'focus-ring flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
        mode === 'icon' ? 'w-9' : 'px-3',
        active ? 'bg-accent text-space-950' : 'bg-gradient-to-r from-accent/[0.18] to-sky-300/[0.12] text-ink-100 ring-1 ring-accent/45 hover:from-accent/[0.26] hover:to-sky-300/[0.18]',
      )}
    >
      <CirclePlay size={15} className={clsx(active ? 'text-space-950' : 'text-accent')} aria-hidden />
      {mode === 'full' && t('topbar.demo.full')}
      {mode === 'short' && t('topbar.demo.short')}
    </button>
  )
}

function AlertsBell() {
  const { open, critical } = useAppStore(
    useShallow((s) => {
      let open = 0
      let critical = 0
      for (const a of s.alerts) {
        if (a.acknowledgedAt == null && a.resolvedAt == null) {
          open++
          if (a.severity === 'CRITICAL') critical++
        }
      }
      return { open, critical }
    }),
  )
  const setAlertsOpen = useUiStore((s) => s.setAlertsOpen)
  const Icon = open ? BellRing : Bell
  return (
    <IconButton data-tour="alerts" className="ring-white/[0.08]" label={open ? t('topbar.alerts.open', { n: open }) : t('topbar.alerts.none')} onClick={() => setAlertsOpen(true)}>
      <Icon size={17} className={clsx(critical > 0 && 'animate-breathe text-critical')} />
      {open > 0 && (
        <span
          className={clsx(
            'tabular absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-space-950',
            critical ? 'animate-pulse-ring-fast bg-critical text-white' : 'bg-watch',
          )}
          aria-hidden
        >
          {open}
        </span>
      )}
    </IconButton>
  )
}

const Divider = () => <div className="h-6 w-px shrink-0 bg-white/[0.08]" aria-hidden />

/**
 * Three zones on a `1fr auto 1fr` grid, so the scenario player sits at the true center whenever
 * the sides allow it:
 *  - left: logo, SIMULATED chip, mission name, mission profile selector, MET clock (UTC in its tooltip)
 *  - center: scenario player capsule
 *  - right: Earth link, Ground / Crew toggle, Tools menu, Start demo, alerts bell
 * Every control is 36 px tall (h-9) with a 12 px radius.
 */
/** Thin underline in the mission accent color (same color as the stage platform ring). */
function MissionAccent({ children }: { children: React.ReactNode }) {
  const accent = MISSION_ACCENT[useAppStore((s) => s.missionProfileId)]
  return (
    <span className="relative flex shrink-0 rounded-xl transition-shadow duration-500" style={{ boxShadow: `inset 0 -2px 0 color-mix(in srgb, ${accent} 70%, transparent)` }}>
      {children}
    </span>
  )
}

export function TopBar() {
  const { barRef, zoneSetters, level } = usePriorityCollapse(STEPS.length, 3)
  const on = (s: Step) => STEPS.indexOf(s) < level
  return (
    <header
      ref={barRef}
      data-collapse-level={level}
      className="glass relative z-40 grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-x-3 rounded-2xl px-3 [overflow-x:clip]"
    >
      <div ref={zoneSetters[0]} className="flex w-max items-center gap-2.5 justify-self-start">
        <Brand wordmark={!on('wordmark')} />
        <ProvenanceBadge />
        <Divider />
        {!on('missionName') && <MissionName />}
        <MissionAccent>
          <MissionProfileControl showLabel={!on('profileLabel')} />
        </MissionAccent>
        <MissionClock />
      </div>

      <div ref={zoneSetters[1]} className="flex w-max items-center justify-self-center">
        <ScenarioControl showWord={!on('scenarioWord')} showName={!on('scenarioName')} showSpeedIcon={!on('speedIcon')} showRestart={!on('restartToMenu')} />
      </div>

      <div ref={zoneSetters[2]} className="flex w-max items-center gap-2 justify-self-end">
        {!on('crewDots') && <CrewDots />}
        <ConnectivityChip />
        <div className={clsx('flex shrink-0 [&>button]:h-9 [&>button]:rounded-xl [&>button]:ring-white/[0.08]', on('commsLabel') && '[&>button]:px-2.5 [&>button>span:first-of-type]:hidden')}>
          <CommsIndicator />
        </div>
        {!on('viewToMenu') && <ViewToggle showLabels={!on('viewLabels')} />}
        <ToolsMenu showLabel={!on('toolsLabel')} withRestart={on('restartToMenu')} withView={on('viewToMenu')} />
        <Divider />
        <DemoButton mode={on('demoIcon') ? 'icon' : on('demoShort') ? 'short' : 'full'} />
        <AlertsBell />
      </div>
    </header>
  )
}
