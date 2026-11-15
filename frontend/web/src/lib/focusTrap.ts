const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps Tab and Shift+Tab inside `panel` (modal dialogs and drawers). Elements with tabindex -1
 * (the inactive tabs of a roving tablist, for example) are not Tab stops, so they never count as
 * the first or last stop. Call it from a keydown handler; it prevents the default only when it
 * moves the focus itself.
 */
export function trapTab(e: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>, panel: HTMLElement | null): void {
  if (e.key !== 'Tab' || !panel) return
  const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.tabIndex >= 0)
  const active = document.activeElement
  if (items.length === 0) {
    e.preventDefault()
    panel.focus()
    return
  }
  const first = items[0]!
  const last = items[items.length - 1]!
  if (e.shiftKey && (active === first || active === panel)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
    e.preventDefault()
    first.focus()
  }
}
