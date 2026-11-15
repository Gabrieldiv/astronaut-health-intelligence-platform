import type { MouseEvent } from 'react'
import { useT } from '../../i18n'

const LINK =
  'sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-skip) focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-space-950 focus:outline-2 focus:outline-offset-2 focus:outline-white'

/** Moves keyboard focus to the target (made focusable just for this) instead of only scrolling to it. */
function jump(e: MouseEvent<HTMLAnchorElement>, selector: string) {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return
  e.preventDefault()
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus()
  el.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

/**
 * Skip links, the first stops of the Tab order. Both views render a <main>; "what needs attention"
 * is #attention in both (the attention panel in Ground view, the actions card in Crew view).
 */
export function SkipLinks() {
  const t = useT()
  return (
    <nav aria-label={t('skip.label')} className="contents">
      <a href="#main-content" className={LINK} onClick={(e) => jump(e, 'main')}>
        {t('skip.main')}
      </a>
      <a href="#attention" className={LINK} onClick={(e) => jump(e, '#attention')}>
        {t('skip.attention')}
      </a>
    </nav>
  )
}
