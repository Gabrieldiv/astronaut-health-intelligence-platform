import { gaugeScale } from './scale'

/**
 * Horizontal bullet gauge: the personal normal band as a soft stripe, the current value as a
 * marker in the status color. No value draws the band only (a dashed track), never a marker.
 * Purely visual: the caller gives the accessible label (value, band and status in words).
 */
export function BandGauge({
  value,
  low,
  high,
  color,
  label,
  height = 10,
  className,
}: {
  value: number | null | undefined
  low: number | null | undefined
  high: number | null | undefined
  color: string
  label: string
  height?: number
  className?: string
}) {
  const hasBand = low != null && high != null
  const g = hasBand ? gaugeScale(value, low, high) : null
  const markerAt = g?.marker ?? (value != null && !hasBand ? 0.5 : null)
  return (
    <div {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })} className={className}>
      <div
        className={value == null ? 'relative w-full rounded-full border border-dashed border-white/15' : 'relative w-full rounded-full bg-white/[0.06]'}
        style={{ height }}
      >
        {g && (
          <span
            className="absolute inset-y-0 rounded-full bg-accent/20 ring-1 ring-accent/40"
            style={{ left: `${g.bandStart * 100}%`, width: `${Math.max(1, (g.bandEnd - g.bandStart) * 100)}%` }}
            aria-hidden
          />
        )}
        {markerAt != null && (
          <span
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-ink-900"
            style={{ left: `${markerAt * 100}%`, width: height + 4, height: height + 4, background: color }}
            aria-hidden
          />
        )}
      </div>
    </div>
  )
}
