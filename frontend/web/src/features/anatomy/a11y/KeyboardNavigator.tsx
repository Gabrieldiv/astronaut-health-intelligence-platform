/**
 * Keyboard and screen reader access to the 3D body: one focusable layer over the viewer. While it
 * has focus, arrow keys move through the monitored regions and their structures (highlighted in
 * 3D like a hover), Enter selects, Escape clears the selection. Every move is announced in an
 * aria-live region. It never takes pointer events, so mouse use is unchanged.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { BodyRegionId, Status } from '../../../types/domain'
import { useAppStore } from '../../../state/store'
import { STATUS_META } from '../../../lib/status'
import type { AtlasManifest } from '../atlas/types'
import { regionOfStructure } from '../atlas/health'
import type { AtlasStore } from '../viewer/atlasStore'
import { describeRegion, describeStructure, positionPhrase } from './describe'
import { NAV_START, buildNavModel, cursorOf, highlightOf, moveCursor, selectTarget, targetOf } from './keyboardNav'
import type { NavCursor, NavTarget } from './keyboardNav'
import { t as tr, useT } from '../../../i18n'
import { regionLabel } from '../../../i18n/catalog'

export interface KeyboardNavigatorProps {
  manifest: AtlasManifest
  store: AtlasStore
  statuses: Record<BodyRegionId, Status>
  ls: number
  /** Space kept free at the bottom for the controls (px). */
  bottom: number
  /** Told when the keyboard focus enters or leaves (the viewer keeps the body clear of the hint band). */
  onFocusChange?: (focused: boolean) => void
}

/** Region targets carry the English catalog label (keyboardNav.ts); show them in the current language. */
const targetLabel = (tg: NavTarget) => (tg.kind === 'region' ? regionLabel(tg.region) : tg.label)

export function KeyboardNavigator({ manifest, store, statuses, ls, bottom, onFocusChange }: KeyboardNavigatorProps) {
  const t = useT()
  const HINT = t('anatomy.nav.hint')
  const model = useMemo(() => buildNavModel(manifest), [manifest])
  const selectedRegion = useAppStore((s) => s.selectedRegion)
  const selectedStructureId = useAppStore((s) => s.selectedStructureId)
  const [cursor, setCursor] = useState<NavCursor | null>(null)
  const [focused, setFocused] = useState(false)
  const [message, setMessage] = useState('')
  const owned = useRef<string | null>(null)

  const describe = useCallback(
    (c: NavCursor, tg: NavTarget) => {
      const g = model.regions[c.region]!
      if (tg.kind === 'region') return tr('anatomy.nav.regionPos', { text: describeRegion(tg.region, statuses[tg.region], g.structures.length), pos: positionPhrase(c.region, model.regions.length) })
      return tr('anatomy.nav.structurePos', { text: describeStructure(tg.structure, statuses), pos: positionPhrase(c.structure, g.structures.length) })
    },
    [model, statuses],
  )

  // highlight the focused item in 3D through the viewer hover (released on blur)
  const highlight = useCallback(
    (t: NavTarget | null) => {
      const s = highlightOf(model, t)
      const st = store.getState()
      if (s) {
        owned.current = s.id
        st.setHover({ id: s.id, point: s.center })
      } else if (owned.current) {
        if (st.hover?.id === owned.current) st.setHover(null)
        owned.current = null
      }
    },
    [model, store],
  )

  const go = (c: NavCursor) => {
    const t = targetOf(model, c)
    setCursor(c)
    highlight(t)
    if (t) setMessage(describe(c, t))
  }

  const onFocus = () => {
    setFocused(true)
    onFocusChange?.(true)
    go(cursor ?? cursorOf(model, selectedRegion, selectedStructureId) ?? NAV_START)
  }
  const onBlur = () => {
    setFocused(false)
    onFocusChange?.(false)
    highlight(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const c = cursor ?? NAV_START
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const tg = targetOf(model, c)
      if (!tg) return
      selectTarget(tg, useAppStore.getState())
      setMessage(t('anatomy.nav.selected', { label: targetLabel(tg) }))
      return
    }
    if (e.key === 'Escape') {
      const app = useAppStore.getState()
      if (!app.selectedStructureId && !app.selectedRegion) return
      e.preventDefault()
      e.stopPropagation()
      app.selectStructure(null)
      app.selectRegion(null)
      setMessage(t('anatomy.nav.cleared'))
      return
    }
    const next = moveCursor(model, c, e.key)
    if (!next) return
    e.preventDefault()
    go(next)
  }

  const target = cursor ? targetOf(model, cursor) : null
  const region = target?.region ?? null
  const status = region ? statuses[region] : null
  const meta = status ? STATUS_META[status] : null
  const selected = target ? (target.kind === 'structure' ? selectedStructureId === target.structure.id : !selectedStructureId && selectedRegion === target.region) : false
  const regionOfTarget = target?.kind === 'structure' ? regionOfStructure(target.structure) : region

  return (
    <>
      <div
        tabIndex={0}
        role="application"
        aria-roledescription={t('anatomy.nav.roledescription')}
        aria-label={t('anatomy.nav.aria', { hint: HINT })}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className="pointer-events-none absolute inset-1 z-10 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-0"
        style={{ bottom }}
      />
      {focused && (
        <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex flex-col items-center px-3" style={{ gap: 4 * ls }} aria-hidden>
          {target && (
            <div className="flex items-center rounded-full border border-cyan-300/30 bg-slate-950/80 text-slate-50 backdrop-blur-md" style={{ gap: 7 * ls, fontSize: 11.5 * ls, padding: `${4 * ls}px ${11 * ls}px` }}>
              {meta && <span className="rounded-full" style={{ width: 7 * ls, height: 7 * ls, background: meta.color }} />}
              <span className="font-semibold">{targetLabel(target)}</span>
              {regionOfTarget && meta && (
                <span className="uppercase tracking-wider" style={{ color: meta.color, fontSize: 9.5 * ls }}>
                  {meta.label}
                </span>
              )}
              {selected && (
                <span className="uppercase tracking-wider text-cyan-200/90" style={{ fontSize: 9.5 * ls }}>
                  {t('anatomy.nav.selectedTag')}
                </span>
              )}
            </div>
          )}
          <div className="rounded-full bg-slate-950/70 text-slate-300 backdrop-blur-md" style={{ fontSize: 9.5 * ls, padding: `${2 * ls}px ${9 * ls}px` }}>
            {HINT}
          </div>
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </div>
    </>
  )
}
