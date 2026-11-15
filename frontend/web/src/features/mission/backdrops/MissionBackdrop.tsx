/**
 * Mission backdrop of the 3D stage: per mission profile scenery (SVG, behind the transparent WebGL
 * canvas, so zero extra draw calls), dimmed and vignetted so the anatomy and its status colors
 * stay readable, a 0.6 s crossfade on profile change, a slight parallax with the camera azimuth
 * and a compact HUD chip with cited profile facts. Static under prefers-reduced-motion.
 */
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useAppStore } from '../../../state/store'
import type { MissionProfileId } from '../../../types/domain'
import { useT } from '../../../i18n'
import { useAstronaut } from '../../shared/hooks'
import { MISSION_ACCENT, issOrbitMinutes, launchPeakG, marsTransitDays, missionFacts } from './facts'
import { registerParallax } from './parallax'
import { Scene } from './scenes'

const ANIM_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .bd-anim-plume { animation: bd-plume 3.2s ease-in-out infinite alternate; }
  .bd-anim-twinkle { animation: bd-twinkle 5s ease-in-out infinite alternate; }
  .bd-anim-ping { transform-box: fill-box; transform-origin: center; animation: bd-ping 2.6s ease-out infinite; }
  .bd-fade { transition: opacity 600ms ease; }
}
@keyframes bd-plume { from { transform: scale(1, 0.96); opacity: 0.85; } to { transform: scale(1.04, 1.03); opacity: 1; } }
@keyframes bd-twinkle { from { opacity: 0.7; } to { opacity: 1; } }
@keyframes bd-ping { 0% { transform: scale(0.7); opacity: 0.8; } 100% { transform: scale(1.6); opacity: 0; } }
`

/** Fraction of the Mars transit done, from the simulated mission day of the selected astronaut. */
function useMarsProgress(): { day: number; total: number } {
  const id = useAppStore((s) => s.selectedAstronautId)
  const day = useAstronaut(id)?.missionDay ?? 1
  const total = marsTransitDays()
  return { day: Math.min(total, Math.max(1, Math.round(day))), total }
}

/** Scenery layer: fills its positioned parent, sits behind the canvas. */
export function MissionBackdrop({ className }: { className?: string }) {
  const active = useAppStore((s) => s.missionProfileId)
  const mars = useMarsProgress()
  // scenes stay mounted once seen, so a profile change crossfades instead of popping
  const [seen, setSeen] = useState<MissionProfileId[]>([active])
  if (!seen.includes(active)) setSeen([...seen, active])
  const parallax = useRef<HTMLDivElement>(null)
  useEffect(() => (parallax.current ? registerParallax(parallax.current) : undefined), [])
  return (
    <div aria-hidden className={clsx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <style>{ANIM_CSS}</style>
      <div ref={parallax} className="absolute -inset-x-6 inset-y-0" style={{ transform: 'translate3d(calc(var(--stage-az, 0) * -18px), 0, 0)' }}>
        {seen.map((id) => (
          <div key={id} className="bd-fade absolute inset-0" style={{ opacity: id === active ? 0.8 : 0 }}>
            <Scene id={id} progress={(mars.day - 1) / Math.max(1, mars.total - 1)} />
          </div>
        ))}
      </div>
      {/* dim the middle (behind the body) and vignette the edges: the anatomy stays the subject */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(42% 52% at 50% 52%, rgba(4,7,13,0.55) 0%, rgba(4,7,13,0.32) 55%, transparent 100%), radial-gradient(125% 115% at 50% 50%, transparent 52%, rgba(2,5,11,0.78) 100%)',
        }}
      />
    </div>
  )
}

/** Orbit progress of the ISS, from the simulation clock and the derived orbit period. */
function OrbitProgress({ accent }: { accent: string }) {
  const simNow = useAppStore((s) => s.clock.simNow)
  const t = useT()
  const period = issOrbitMinutes()
  const frac = ((simNow / 60000) % period) / period
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="text-[10px] text-ink-400">{t('backdrop.orbit', { min: Math.round(period) })}</span>
      <span className="relative h-1 w-20 overflow-hidden rounded-full bg-white/10">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.round(frac * 100)}%`, background: accent }} />
      </span>
    </div>
  )
}

/** Ship position on the Earth to Mars transfer: simulated mission day over the cited transit length. */
function TransitProgress({ accent }: { accent: string }) {
  const { day, total } = useMarsProgress()
  const t = useT()
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="text-[10px] text-ink-400">{t('backdrop.label.ship', { day, total })}</span>
      <span className="relative h-1 w-20 overflow-hidden rounded-full bg-white/10">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.round((day / total) * 100)}%`, background: accent }} />
      </span>
    </div>
  )
}

/** Peak ascent load (cited) drawn as a gauge: a reference, not a live reading. */
function GGauge({ accent }: { accent: string }) {
  const t = useT()
  const g = launchPeakG()
  return (
    <div className="mt-1.5 flex items-center gap-2" title={t('backdrop.gaugeTitle')}>
      <svg width="34" height="20" viewBox="-17 -16 34 20" aria-hidden>
        <path d="M-13 2 A13 13 0 0 1 13 2" stroke="rgba(255,255,255,0.14)" strokeWidth="3.5" fill="none" />
        <path d="M-13 2 A13 13 0 0 1 13 2" stroke={accent} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </svg>
      <span className="text-[10px] text-ink-400">{t('backdrop.gauge', { g })}</span>
    </div>
  )
}

/**
 * Compact HUD chip: profile name, two or three cited facts and one profile widget. The caller
 * places it (absolute, via className) in a spot that never covers the body, and may cap its width.
 */
export function MissionHud({ className, style }: { className?: string; style?: CSSProperties }) {
  const id = useAppStore((s) => s.missionProfileId)
  const t = useT()
  const accent = MISSION_ACCENT[id]
  const facts = missionFacts(id)
  return (
    <div
      className={clsx('pointer-events-none absolute z-10 max-w-[min(260px,calc(100%-16px))] rounded-xl px-3 py-2 backdrop-blur-sm', className)}
      style={{ background: 'rgba(6,10,20,0.62)', boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 45%, transparent)`, ...style }}
    >
      <div className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: accent }}>
        {t(`backdrop.name.${id}`)}
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-ink-300">
        {facts.map((f) => (
          <span key={f} className="whitespace-nowrap">
            {f}
          </span>
        ))}
      </div>
      {id === 'LAUNCH' && <GGauge accent={accent} />}
      {id === 'ISS' && <OrbitProgress accent={accent} />}
      {id === 'MARS_TRANSIT' && <TransitProgress accent={accent} />}
    </div>
  )
}
