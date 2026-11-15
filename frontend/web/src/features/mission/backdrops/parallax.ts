/**
 * Camera azimuth to backdrop parallax bridge. The atlas camera reports its orbit angle every
 * frame; registered backdrop elements get a CSS variable (`--stage-az`, sin of the angle, -1..1)
 * written directly, so the parallax costs no React render and no WebGL draw call.
 * Under `prefers-reduced-motion` the variable stays at 0 (static backdrop).
 */

const targets = new Set<HTMLElement>()
let last = 0

let query: MediaQueryList | null | undefined

function reducedMotion(): boolean {
  if (query === undefined) query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  return query?.matches ?? false
}

/** Called by the camera with the orbit azimuth (radians). Cheap when nothing is registered. */
export function setStageAzimuth(theta: number) {
  if (targets.size === 0) return
  const v = reducedMotion() ? 0 : Math.sin(theta)
  if (Math.abs(v - last) < 0.002) return
  last = v
  const s = v.toFixed(3)
  for (const el of targets) el.style.setProperty('--stage-az', s)
}

/** Registers an element to receive `--stage-az`; returns the unregister function. */
export function registerParallax(el: HTMLElement): () => void {
  targets.add(el)
  el.style.setProperty('--stage-az', last.toFixed(3))
  return () => {
    targets.delete(el)
  }
}
