import { useEffect } from 'react'
import { startTicker, useAppStore } from '../state/store'
import { TopBar } from '../features/topbar/TopBar'
import { CrewRail } from '../features/crew/CrewRail'
import { CenterStage } from '../features/stage/CenterStage'
import { AttentionPanel } from '../features/attention/AttentionPanel'
import { VitalsStrip } from '../features/vitals/VitalsStrip'
import { AlertsDrawer } from '../features/alerts/Alerts'
import { A11yLayer, SkipLinks } from '../features/a11y'
import { TimelineStrip } from '../features/timeline'
import { CrewView } from '../features/crewview/CrewView'
import { Tour } from '../features/tour/Tour'
import { Assistant } from '../features/assistant/AssistantPanel'
import { ShortcutsOverlay, useGlobalShortcuts } from './shortcuts'
import { useStatusFavicon } from './useStatusFavicon'
import { useUiStore } from './uiStore'
import { useLang, useT } from '../i18n'

/**
 * Two views over the same live state.
 * Ground view (flight surgeon / mission control), reading order: crew (who) > body + headline (what)
 * > attention panel (why, what to do) > timeline > live vitals.
 * Crew view: one astronaut, plain language, big type, top two actions.
 */
// Dev only: expose the store for manual scenario poking from the console.
if (import.meta.env.DEV) {
  const w = window as unknown as { __ahi: typeof useAppStore; __ahiUi: typeof useUiStore }
  w.__ahi = useAppStore
  w.__ahiUi = useUiStore
}

/**
 * Ground view layout. One spacing scale: 12 px between panels (gap-3, p-3), 16 px inside panels.
 * Height modes (see index.css): `short` (desktop, viewport height up to 820 px) collapses the timeline
 * to a ribbon and slims the vitals strip; `roomy` (1680x1000 and up) widens the right panel and
 * gives the timeline room for readable lane labels.
 */
function GroundView() {
  const t = useT()
  return (
    <>
      <main id="main-content" aria-label={t('app.mainLabel')} className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[232px_minmax(0,1fr)_360px] xl:grid-cols-[256px_minmax(0,1fr)_392px] 2xl:grid-cols-[280px_minmax(0,1fr)_420px] roomy:grid-cols-[300px_minmax(0,1fr)_464px]">
        <CrewRail className="lg:min-h-0" />
        <div className="flex min-h-[520px] min-w-0 flex-col gap-3 lg:min-h-0">
          <CenterStage className="min-h-0 flex-1" />
        </div>
        <div id="attention" className="flex min-h-0 flex-col">
          <AttentionPanel className="min-h-[480px] flex-1 lg:min-h-0" />
        </div>
      </main>
      <TimelineStrip className="h-[60px] shrink-0 short:h-[26px] [@media(min-height:1000px)]:h-[72px]" />
      <VitalsStrip className="h-auto shrink-0 lg:h-[148px] short:h-[106px] [@media(min-height:880px)]:lg:h-[156px]" />
    </>
  )
}

export default function App() {
  useEffect(() => startTicker(), [])
  useGlobalShortcuts()
  useStatusFavicon()
  const viewMode = useUiStore((s) => s.viewMode)
  const presentation = useUiStore((s) => s.presentation)
  // Subscribing here re-renders the whole tree on a language change, so components that read
  // translated module tables (STATUS_META, catalog helpers) without useT() update too.
  useLang()
  useEffect(() => {
    document.documentElement.dataset.present = presentation ? 'true' : 'false'
    document.documentElement.dataset.view = viewMode
  }, [presentation, viewMode])
  return (
    <div className="flex min-h-full flex-col gap-3 p-3 lg:h-full lg:min-h-0">
      <SkipLinks />
      <TopBar />
      {viewMode === 'crew' ? <CrewView /> : <GroundView />}
      <AlertsDrawer />
      <ShortcutsOverlay />
      <Tour />
      <A11yLayer />
      <Assistant />
    </div>
  )
}
