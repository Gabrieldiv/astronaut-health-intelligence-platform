import { useSyncExternalStore } from 'react'

/** Every drawer and dialog of the app marks its panel with aria-modal="true" (components/ui.tsx, mission/Modal.tsx). */
const MODAL_SELECTOR = '[aria-modal="true"]'

export function anyModalOpen(root: ParentNode | null = typeof document === 'undefined' ? null : document): boolean {
  return !!root?.querySelector(MODAL_SELECTOR)
}

function subscribe(onChange: () => void): () => void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return () => {}
  const obs = new MutationObserver(onChange)
  obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] })
  return () => obs.disconnect()
}

/**
 * True while a drawer or dialog is open. Used by hover tooltips so they disappear as soon as a
 * dialog opens (the z-index scale already keeps them below it). Only subscribed while the caller
 * is mounted, so the observer runs just while a tooltip is visible.
 */
export function useOverlayOpen(): boolean {
  return useSyncExternalStore(subscribe, anyModalOpen, () => false)
}
