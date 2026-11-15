/**
 * Zoom math of the atlas viewer, kept pure (no React, no scene) so it is unit tested.
 *
 * Zoom toward the pointer: the camera moves along the ray under the pointer, so whatever is under
 * the mouse (or between the two fingers of a pinch) stays under it while it grows. The orbit
 * target follows along the view axis, so rotating afterwards pivots around the zoomed area.
 *
 * Surface aware: when the pointer ray hits the body, the zoom closes in on that surface point and
 * stops a small gap before it, so the camera never passes through the skin and no geometry is cut
 * by the near plane. Zooming out recenters the body: by the time the camera is back at the fitted
 * distance the orbit target is back on the home target, so the whole body is framed again.
 */
import { Vector3 } from 'three'
import type { PerspectiveCamera, Raycaster } from 'three'

/** Shared between the scene (which owns the meshes) and the camera: distance to the body along a ray. */
export interface SurfaceProbe {
  cast: ((ray: Raycaster) => number | null) | null
}

const dir = new Vector3()
const fwd = new Vector3()
const shift = new Vector3()

export interface ZoomOptions {
  /** Distance from the camera to the first body surface along the pointer ray (null: nothing hit). */
  surface?: number | null
  /** Closest the camera may come to that surface (default: minDistance). */
  gap?: number
  /** Whole body framing: zooming out drifts the target back to `home` as the distance nears `homeDistance`. */
  home?: Vector3 | null
  homeDistance?: number
}

/**
 * Scales the camera to target distance by `scale` (below 1 zooms in) toward the point at `ndcX`,
 * `ndcY` (normalized device coordinates, -1..1). Mutates `camera.position` and `target`.
 * Returns false when nothing moved (already at a distance limit, or already touching the surface).
 */
export function zoomToward(
  camera: PerspectiveCamera,
  target: Vector3,
  ndcX: number,
  ndcY: number,
  scale: number,
  minDistance: number,
  maxDistance: number,
  opts: ZoomOptions = {},
): boolean {
  const r = camera.position.distanceTo(target)
  if (!(r > 1e-6) || !(scale > 0)) return false
  camera.updateMatrixWorld()
  fwd.copy(target).sub(camera.position).normalize()
  dir.set(Math.max(-1, Math.min(1, ndcX)), Math.max(-1, Math.min(1, ndcY)), 0.5).unproject(camera).sub(camera.position).normalize()
  const surface = opts.surface != null && opts.surface > 0 ? opts.surface : null

  if (scale < 1 && surface != null) {
    // close in on the surface point under the pointer, never closer than the gap
    const nextS = Math.max(opts.gap ?? minDistance, surface * scale)
    const delta = surface - nextS
    if (delta < 1e-7) return false
    camera.position.addScaledVector(dir, delta)
    // pivot on the view axis at the depth of the zoomed point, so orbiting turns around it
    const depth = nextS * Math.max(0.05, dir.dot(fwd))
    target.copy(camera.position).addScaledVector(fwd, Math.min(maxDistance, Math.max(minDistance, depth)))
    camera.updateMatrixWorld()
    return true
  }

  const next = Math.min(maxDistance, Math.max(minDistance, r * scale))
  const delta = r - next
  if (Math.abs(delta) < 1e-7) return false
  camera.position.addScaledVector(dir, delta)
  target.copy(camera.position).addScaledVector(fwd, next)
  // zooming out: the remaining way back to the fitted distance also brings the target home
  if (delta < 0 && opts.home && opts.homeDistance != null) {
    const k = opts.homeDistance > r ? Math.min(1, (next - r) / (opts.homeDistance - r)) : 1
    shift.copy(opts.home).sub(target).multiplyScalar(k)
    target.add(shift)
    camera.position.add(shift)
  }
  camera.updateMatrixWorld()
  return true
}

/**
 * Keeps the camera outside the body. `outer` is the distance from the target to the outermost body
 * surface on the line toward the camera (null: no surface there). When the camera is closer to the
 * target than that surface plus `gap`, it is pushed back out along the same line, so the view
 * direction is kept. Returns the distance it needed, or null when the camera was already clear.
 */
export function keepOutside(position: Vector3, target: Vector3, outer: number | null, gap: number): number | null {
  if (outer == null) return null
  const need = outer + gap
  const off = shift.copy(position).sub(target)
  const r = off.length()
  if (r >= need || r < 1e-9) return null
  position.copy(target).addScaledVector(off.divideScalar(r), need)
  return need
}

/** Zoom factor of one wheel event (exponential, so trackpads and wheels feel the same). */
export function wheelScale(e: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'ctrlKey'>, speed = 1): number {
  // lines and pages to pixels; a trackpad pinch arrives as a small wheel delta with ctrlKey
  const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1)
  const k = (e.ctrlKey ? 0.01 : 0.0006) * speed
  return Math.min(2, Math.max(0.5, Math.exp(px * k)))
}
