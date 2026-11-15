/**
 * Zoom toward the pointer: the camera moves along the ray under the pointer, so whatever is under
 * the mouse (or between the two fingers of a pinch) stays under it while it grows. The orbit
 * target follows along the view axis, so rotating afterwards pivots around the zoomed area.
 * The distance to the target always stays within [minDistance, maxDistance].
 */
import { Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'

const dir = new Vector3()
const fwd = new Vector3()

/**
 * Scales the camera to target distance by `scale` (below 1 zooms in) toward the point at `ndcX`,
 * `ndcY` (normalized device coordinates, -1..1). Mutates `camera.position` and `target`.
 * Returns false when nothing moved (already at a distance limit).
 */
export function zoomToward(camera: PerspectiveCamera, target: Vector3, ndcX: number, ndcY: number, scale: number, minDistance: number, maxDistance: number): boolean {
  const r = camera.position.distanceTo(target)
  if (!(r > 1e-6) || !(scale > 0)) return false
  const next = Math.min(maxDistance, Math.max(minDistance, r * scale))
  const delta = r - next
  if (Math.abs(delta) < 1e-7) return false
  camera.updateMatrixWorld()
  fwd.copy(target).sub(camera.position).normalize()
  dir.set(Math.max(-1, Math.min(1, ndcX)), Math.max(-1, Math.min(1, ndcY)), 0.5).unproject(camera).sub(camera.position).normalize()
  camera.position.addScaledVector(dir, delta)
  target.copy(camera.position).addScaledVector(fwd, next)
  camera.updateMatrixWorld()
  return true
}

/** Zoom factor of one wheel event (exponential, so trackpads and wheels feel the same). */
export function wheelScale(e: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'ctrlKey'>, speed = 1): number {
  // lines and pages to pixels; a trackpad pinch arrives as a small wheel delta with ctrlKey
  const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1)
  const k = (e.ctrlKey ? 0.01 : 0.0006) * speed
  return Math.min(2, Math.max(0.5, Math.exp(px * k)))
}
