import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { FILL, fitBody, goalFor, projectBox } from './framing'
import type { Box } from './layers'

/** About the atlas body: 1.75 m tall, arms down, feet at y = 0. */
const BODY: Box = { min: [-0.36, 0, -0.16], max: [0.36, 1.75, 0.2] }

function shot(v: { w: number; h: number; top: number; bottom: number }) {
  const view = { w: v.w, h: v.h, fov: 30, insets: { top: v.top, bottom: v.bottom } }
  const g = goalFor(BODY, null, view)
  const pos = g.target.clone().add(new Vector3().setFromSpherical(g.sph))
  return { view, g, rect: projectBox({ min: [0, BODY.min[1] - 0.015, 0], max: [0, BODY.max[1], 0] }, pos, g.target, view), wide: projectBox({ min: [BODY.min[0], 0.9, 0], max: [BODY.max[0], 0.9, 0] }, pos, g.target, view) }
}

describe('whole body framing', () => {
  it('fills most of the free height between the top margin and the bottom controls', () => {
    const { rect } = shot({ w: 486, h: 516, top: 6, bottom: 59 })
    const free = 516 - 6 - 59
    const height = rect.bottom - rect.top
    expect(height / free).toBeGreaterThan(FILL - 0.03)
    expect(height / free).toBeLessThanOrEqual(1)
    // head to feet stay inside the free band
    expect(rect.top).toBeGreaterThanOrEqual(6 - 0.5)
    expect(rect.bottom).toBeLessThanOrEqual(516 - 59 + 0.5)
  })

  it('is limited by the width on a narrow viewport, never cutting the arms', () => {
    const { wide, rect } = shot({ w: 220, h: 700, top: 6, bottom: 59 })
    expect(wide.left).toBeGreaterThanOrEqual(0)
    expect(wide.right).toBeLessThanOrEqual(220)
    expect(rect.bottom - rect.top).toBeLessThan(700 - 65)
  })

  it('gets larger when the reserved bands shrink', () => {
    const a = fitBody(BODY, { w: 500, h: 520, fov: 30, insets: { top: 50, bottom: 80 } })
    const b = fitBody(BODY, { w: 500, h: 520, fov: 30, insets: { top: 6, bottom: 59 } })
    expect(b.dist).toBeLessThan(a.dist)
  })

  it('a close up never stands farther than the whole body shot', () => {
    const view = { w: 486, h: 516, fov: 30, insets: { top: 6, bottom: 59 } }
    const full = fitBody(BODY, view)
    const g = goalFor(BODY, { key: 'x', box: { min: [-0.05, 1.3, 0], max: [0.05, 1.4, 0.1] }, dir: [0, 0, 1], full: false }, view)
    expect(g.sph.radius).toBeLessThanOrEqual(full.dist)
    expect(g.sph.radius).toBeGreaterThanOrEqual(0.32)
  })
})
