import { useEffect } from 'react'
import { useAppStore } from '../state/store'
import type { Alert } from '../types/domain'

/**
 * Browser tab favicon with a status dot: while a CRITICAL alert is open (not acknowledged, not
 * resolved) the AHI mark gets a red dot, so a hidden tab still shows that someone must look.
 * The original icons (public/favicon.svg, favicon.ico) are restored as soon as the alert is acknowledged.
 */

const MARK = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5eead4"/><stop offset="1" stop-color="#7dd3fc"/></linearGradient></defs><circle cx="16" cy="16" r="15.6" fill="#060a14"/><circle cx="16" cy="16" r="14.4" fill="#12232f" stroke="url(#g)" stroke-opacity="0.85" stroke-width="1.3"/><ellipse cx="16" cy="16" rx="14" ry="5.2" fill="none" stroke="url(#g)" stroke-opacity="0.6" stroke-width="1.1" transform="rotate(-24 16 16)"/><path d="M6.5 17h5l2-4.5 3.2 8.5 2.4-5.5h6.4" fill="none" stroke="url(#g)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`

/** AHI mark with a red status dot (top right), as an SVG data URL. */
export function alertFaviconUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${MARK}<circle cx="25" cy="7" r="6.5" fill="#ef4444" stroke="#060a14" stroke-width="2"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** True while at least one CRITICAL alert is neither acknowledged nor resolved. */
export function hasOpenCritical(alerts: readonly Alert[]): boolean {
  return alerts.some((a) => a.severity === 'CRITICAL' && a.acknowledgedAt == null && a.resolvedAt == null)
}

export function useStatusFavicon() {
  const critical = useAppStore((s) => hasOpenCritical(s.alerts))
  useEffect(() => {
    if (!critical) return
    // Every icon link (favicon.ico and favicon.svg, see index.html) gets the dotted mark, so the dot
    // shows whichever one the browser picked; each original href and type is restored afterwards.
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))
    if (links.length === 0) return
    const saved = links.map((l) => ({ l, href: l.getAttribute('href'), type: l.getAttribute('type') }))
    const url = alertFaviconUrl()
    for (const l of links) {
      l.setAttribute('type', 'image/svg+xml')
      l.setAttribute('href', url)
    }
    return () => {
      for (const { l, href, type } of saved) {
        if (type == null) l.removeAttribute('type')
        else l.setAttribute('type', type)
        if (href != null) l.setAttribute('href', href)
      }
    }
  }, [critical])
}
