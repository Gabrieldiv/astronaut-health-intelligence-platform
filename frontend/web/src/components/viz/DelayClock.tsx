import { delayClockFraction } from './scale'

/**
 * Small clock for a one way message delay: the arc fills the dial over one hour (a light second
 * shows as a sliver, Mars as most of the dial). Decorative; the label says the delay in words.
 */
export function DelayClock({ seconds, label, size = 44 }: { seconds: number; label: string; size?: number }) {
  const f = delayClockFraction(seconds)
  const r = 15
  const c = 2 * Math.PI * r
  const angle = f * 2 * Math.PI
  const hx = 20 + Math.sin(angle) * 11
  const hy = 20 - Math.cos(angle) * 11
  return (
    <svg role="img" aria-label={label} viewBox="0 0 40 40" width={size} height={size} className="shrink-0">
      <circle cx="20" cy="20" r={r + 3} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="1.5" className="text-ink-300" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="5" className="text-ink-300" />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="5"
        strokeDasharray={`${Math.max(f * c, f > 0 ? 1 : 0)} ${c}`}
        transform="rotate(-90 20 20)"
        strokeLinecap="butt"
      />
      <line x1="20" y1="20" x2={hx} y2={hy} stroke="var(--color-ink-100)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="20" cy="20" r="1.8" fill="var(--color-ink-100)" />
    </svg>
  )
}
