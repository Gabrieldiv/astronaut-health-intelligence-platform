/**
 * Camera framing of the atlas viewer (pure, unit tested): the whole body shot fitted to the free
 * area of the view, and the close ups of a selected structure or region.
 *
 * The whole body fills FILL of the free height (between the top reserve and the bottom
 * controls) or FILL_W of the width, whichever is tighter, so head to feet use most of the stage
 * whatever its aspect ratio. It is fitted again whenever the container resizes.
 */
import { Spherical, Vector3 } from 'three'
import type { FrameInsets } from '../procedural/CameraRig'
import type { Box, Focus } from './layers'

/** Fraction of the free height the full body occupies (the rest is a small breathing margin). */
export const FILL = 0.96
/** Fraction of the view width the full body may occupy (arms included). */
export const FILL_W = 0.94
export const DEFAULT_DIR = new Vector3(0, 0.06, 1)

export interface View {
  w: number
  h: number
  fov: number
  insets: FrameInsets
}

export interface Goal {
  target: Vector3
  sph: Spherical
}

/** Camera distance and target height that fit the whole body inside the free area of the view. */
export function fitBody(body: Box, v: View) {
  const t = Math.tan((v.fov * Math.PI) / 360)
  const bottom = body.min[1] - 0.015
  const top = body.max[1]
  const width = Math.max(0.5, body.max[0] - body.min[0])
  const availH = Math.max(60, v.h - v.insets.top - v.insets.bottom)
  const dH = ((top - bottom) * v.h) / (2 * t * FILL * availH)
  const dW = (width * v.h) / (2 * t * FILL_W * Math.max(1, v.w))
  const dist = Math.max(dH, dW)
  // shift the target so the body centers in the free area rather than in the canvas
  const worldPerPx = (2 * dist * t) / Math.max(1, v.h)
  const cy = (top + bottom) / 2 + ((v.insets.top - v.insets.bottom) / 2) * worldPerPx
  return { dist, cy }
}

/** Where the camera should go for a selection (null: the whole body). */
export function goalFor(body: Box, focus: Focus | null, v: View): Goal {
  const dir = focus ? new Vector3(...focus.dir).normalize() : DEFAULT_DIR.clone().normalize()
  const full = fitBody(body, v)
  if (!focus || focus.full) {
    const cx = focus ? (focus.box.min[0] + focus.box.max[0]) / 2 : 0
    const cz = focus ? (focus.box.min[2] + focus.box.max[2]) / 2 : 0
    const target = new Vector3(focus ? cx * 0.5 : 0, full.cy, focus ? cz * 0.5 : 0)
    return { target, sph: new Spherical().setFromVector3(dir.multiplyScalar(full.dist)) }
  }
  const { min, max } = focus.box
  const target = new Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2)
  const radius = 0.5 * Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2])
  const aspect = v.w / Math.max(1, v.h)
  const half = (v.fov * Math.PI) / 360
  // the tighter of the vertical and horizontal half angles decides the distance
  const halfMin = Math.min(half, Math.atan(Math.tan(half) * aspect))
  const dist = Math.min(full.dist, Math.max(0.32, (radius * (focus.pad ?? 1.5)) / Math.sin(halfMin)))
  // center the box in the free area (above the controls) rather than in the canvas
  target.y += ((v.insets.top - v.insets.bottom) / 2) * ((2 * dist * Math.tan(half)) / Math.max(1, v.h))
  return { target, sph: new Spherical().setFromVector3(dir.multiplyScalar(dist)) }
}

/**
 * Screen rectangle (px, canvas coordinates, y down) of a box seen from a camera looking at
 * `target` from `position`. Used by the tests to check the framing.
 */
export function projectBox(box: Box, position: Vector3, target: Vector3, v: Pick<View, 'w' | 'h' | 'fov'>) {
  const f = target.clone().sub(position).normalize()
  const right = f.clone().cross(new Vector3(0, 1, 0)).normalize()
  const up = right.clone().cross(f)
  const t = Math.tan((v.fov * Math.PI) / 360)
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const x of [box.min[0], box.max[0]])
    for (const y of [box.min[1], box.max[1]])
      for (const z of [box.min[2], box.max[2]]) {
        const p = new Vector3(x, y, z).sub(position)
        const d = p.dot(f)
        const sx = v.w / 2 + (p.dot(right) / (d * t)) * (v.h / 2)
        const sy = v.h / 2 - (p.dot(up) / (d * t)) * (v.h / 2)
        x0 = Math.min(x0, sx)
        x1 = Math.max(x1, sx)
        y0 = Math.min(y0, sy)
        y1 = Math.max(y1, sy)
      }
  return { left: x0, right: x1, top: y0, bottom: y1 }
}
