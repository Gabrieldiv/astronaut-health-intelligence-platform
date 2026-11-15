import { Shapes } from 'lucide-react'
import { useAppStore } from '../../state/store'
import { METRIC_CATALOG } from '../../engine/catalog'
import { Badge } from '../../components/ui'

/**
 * "Why" block for the experimental multivariate detector (engine v5). Shown only when the
 * detector flags an unusual combination. Neutral styling on purpose: it never changes the status.
 */
export function MultivariateNote({ astronautId }: { astronautId: string }) {
  const mv = useAppStore((s) => s.health[astronautId]?.multivariate)
  if (!mv?.flagged) return null
  const top = mv.contributions.filter((c) => c.share >= 0.05).slice(0, 3)
  return (
    <div role="note" aria-label="Unusual combination, experimental" className="mt-2 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-accent/25">
      <div className="flex flex-wrap items-center gap-1.5">
        <Shapes size={14} className="shrink-0 text-accent" aria-hidden />
        <span className="text-[13px] font-semibold text-ink-100">Unusual combination</span>
        <Badge tone="accent" title={`Model ${mv.model_version}`}>
          {mv.label}
        </Badge>
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-300">{mv.explanation}</p>
      {top.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1" aria-label="Signals that contributed most">
          {top.map((c) => (
            <li key={c.metric} className="flex items-center gap-2 text-[11px] text-ink-300">
              <span className="w-28 shrink-0 truncate">
                {METRIC_CATALOG[c.metric].label} {c.z > 0 ? 'up' : 'down'}
              </span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <span className="block h-full rounded-full bg-accent/70" style={{ width: `${Math.round(c.share * 100)}%` }} />
              </span>
              <span className="tabular w-9 text-right text-ink-500">{Math.round(c.share * 100)}%</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] leading-snug text-ink-500">
        Informational only: it does not change your status. It shows only when the pattern lasts and the slower trend rules agree. Model {mv.model_version}, trained on {mv.training_size} moments of your own recent data.
      </p>
    </div>
  )
}
