import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useT } from '../../i18n'

/**
 * "Details" disclosure: sentences stay behind it so the visual reads first. When closed the
 * content is only visually hidden (sr-only), so screen readers and audio description still get it.
 */
export function Details({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={clsx('text-[11px] text-ink-500', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="focus-ring inline-flex items-center gap-0.5 rounded font-semibold hover:text-ink-300"
      >
        <ChevronRight size={11} className={clsx('transition-transform', open && 'rotate-90')} aria-hidden />
        {label ?? t('visual.details')}
      </button>
      <div id={id} className={open ? 'mt-1 leading-relaxed text-ink-300' : 'sr-only'}>
        {children}
      </div>
    </div>
  )
}
