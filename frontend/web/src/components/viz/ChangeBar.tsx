import { changeBarWidth } from './scale'

/**
 * Diverging bar for a change from baseline: a center tick, the bar grows right (higher) or left
 * (lower) in the status color. Decorative: the caller keeps the change in words next to it.
 */
export function ChangeBar({ change, baseline, color, className }: { change: number | null; baseline: number | null; color: string; className?: string }) {
  const w = changeBarWidth(change, baseline)
  return (
    <span className={className} aria-hidden>
      <span className="relative block h-1.5 w-full rounded-full bg-white/[0.05]">
        <span className="absolute -top-0.5 -bottom-0.5 left-1/2 w-px bg-white/25" />
        {w != null && w > 0 && (
          <span className="absolute inset-y-0 rounded-full" style={{ background: color, width: `${w * 50}%`, left: change! >= 0 ? '50%' : `${50 - w * 50}%` }} />
        )}
      </span>
    </span>
  )
}
