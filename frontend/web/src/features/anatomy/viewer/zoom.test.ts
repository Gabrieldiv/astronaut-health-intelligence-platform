import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { keepOutside, wheelScale, zoomToward } from './zoom'

function setup() {
  const camera = new PerspectiveCamera(30, 1.5, 0.03, 40)
  camera.position.set(0, 1, 4)
  const target = new Vector3(0, 1, 0)
  camera.lookAt(target)
  camera.updateMatrixWorld()
  return { camera, target }
}

/** Screen position (NDC) of a world point. */
function ndcOf(camera: PerspectiveCamera, p: Vector3) {
  camera.updateMatrixWorld()
  const v = p.clone().project(camera)
  return [v.x, v.y] as const
}

describe('zoomToward', () => {
  it('keeps the point under the pointer fixed on screen while zooming in', () => {
    const { camera, target } = setup()
    // a "hand" off to the side of the body
    const hand = new Vector3(0.7, 0.8, 0.1)
    const [x, y] = ndcOf(camera, hand)
    expect(zoomToward(camera, target, x, y, 0.5, 0.18, 6)).toBe(true)
    const [x2, y2] = ndcOf(camera, hand)
    expect(x2).toBeCloseTo(x, 6)
    expect(y2).toBeCloseTo(y, 6)
    // the camera came closer to the hand and the distance to the target halved
    expect(camera.position.distanceTo(hand)).toBeLessThan(new Vector3(0, 1, 4).distanceTo(hand))
    expect(camera.position.distanceTo(target)).toBeCloseTo(2, 6)
  })

  it('zooms straight in at the center of the view like a plain dolly', () => {
    const { camera, target } = setup()
    zoomToward(camera, target, 0, 0, 0.5, 0.1, 10)
    expect(camera.position.x).toBeCloseTo(0, 6)
    expect(camera.position.y).toBeCloseTo(1, 6)
    expect(camera.position.z).toBeCloseTo(2, 6)
    expect(target.toArray().map((v) => +v.toFixed(6))).toEqual([0, 1, 0])
  })

  it('keeps the view direction (no jump when the orbit controls look at the new target)', () => {
    const { camera, target } = setup()
    const before = target.clone().sub(camera.position).normalize()
    zoomToward(camera, target, 0.6, -0.4, 0.7, 0.18, 6)
    const after = target.clone().sub(camera.position).normalize()
    expect(after.distanceTo(before)).toBeLessThan(1e-9)
  })

  it('respects the distance limits and reports when nothing moved', () => {
    const { camera, target } = setup()
    zoomToward(camera, target, 0.3, 0.3, 0.001, 0.18, 6)
    expect(camera.position.distanceTo(target)).toBeCloseTo(0.18, 6)
    expect(zoomToward(camera, target, 0.3, 0.3, 0.5, 0.18, 6)).toBe(false)
    zoomToward(camera, target, -0.2, 0.1, 1000, 0.18, 6)
    expect(camera.position.distanceTo(target)).toBeCloseTo(6, 6)
  })
})

describe('zoomToward on the body surface', () => {
  /** Distance from the camera to the plane z = zPlane along the ray under (x, y). */
  function surfaceAt(camera: PerspectiveCamera, x: number, y: number, zPlane: number) {
    camera.updateMatrixWorld()
    const d = new Vector3(x, y, 0.5).unproject(camera).sub(camera.position).normalize()
    return (zPlane - camera.position.z) / d.z
  }

  it('stops a small gap before the surface, never passing through it', () => {
    const { camera, target } = setup()
    // the "chest" is a wall at z = 0.12, in front of the target
    for (let i = 0; i < 40; i++) zoomToward(camera, target, 0, 0, 0.5, 0.08, 6, { surface: surfaceAt(camera, 0, 0, 0.12), gap: 0.07 })
    expect(camera.position.z).toBeCloseTo(0.19, 6)
    // at the gap there is nothing left to zoom
    expect(zoomToward(camera, target, 0, 0, 0.5, 0.08, 6, { surface: surfaceAt(camera, 0, 0, 0.12), gap: 0.07 })).toBe(false)
  })

  it('keeps the pointed spot under the pointer and pivots at its depth', () => {
    const { camera, target } = setup()
    const spot = new Vector3(0.5, 0.7, 0.1)
    const [x, y] = ndcOf(camera, spot)
    zoomToward(camera, target, x, y, 0.4, 0.08, 6, { surface: camera.position.distanceTo(spot), gap: 0.07 })
    const [x2, y2] = ndcOf(camera, spot)
    expect(x2).toBeCloseTo(x, 6)
    expect(y2).toBeCloseTo(y, 6)
    // the orbit target sits on the view axis at the depth of the spot, not behind the body
    const fwd = target.clone().sub(camera.position).normalize()
    expect(spot.clone().sub(camera.position).dot(fwd)).toBeCloseTo(camera.position.distanceTo(target), 6)
  })

  it('zooming out brings the body back to the home framing', () => {
    const { camera, target } = setup()
    const home = target.clone()
    zoomToward(camera, target, 0.8, 0.6, 0.2, 0.08, 6)
    expect(target.distanceTo(home)).toBeGreaterThan(0.05)
    for (let i = 0; i < 20; i++) zoomToward(camera, target, 0.8, 0.6, 1.5, 0.08, 6, { home, homeDistance: 4 })
    expect(target.distanceTo(home)).toBeLessThan(1e-6)
    // the view direction never changed, so the body did not jump while recentering
    expect(target.clone().sub(camera.position).normalize().z).toBeCloseTo(-1, 6)
  })
})

describe('keepOutside', () => {
  it('pushes the camera out of the body along the same line', () => {
    const target = new Vector3(0, 1, 0)
    const position = new Vector3(0.05, 1, 0.05)
    expect(keepOutside(position, target, 0.2, 0.07)).toBeCloseTo(0.27, 9)
    expect(position.distanceTo(target)).toBeCloseTo(0.27, 9)
    expect(position.x).toBeCloseTo(position.z, 9)
  })

  it('leaves a camera that is already clear alone', () => {
    const target = new Vector3(0, 1, 0)
    const position = new Vector3(0, 1, 2)
    expect(keepOutside(position, target, 0.2, 0.07)).toBeNull()
    expect(keepOutside(position, target, null, 0.07)).toBeNull()
    expect(position.z).toBe(2)
  })
})

describe('wheelScale', () => {
  it('zooms in on wheel up, out on wheel down, and caps one event', () => {
    expect(wheelScale({ deltaY: -100, deltaMode: 0, ctrlKey: false })).toBeLessThan(1)
    expect(wheelScale({ deltaY: 100, deltaMode: 0, ctrlKey: false })).toBeGreaterThan(1)
    expect(wheelScale({ deltaY: 1e6, deltaMode: 0, ctrlKey: false })).toBe(2)
    expect(wheelScale({ deltaY: 3, deltaMode: 1, ctrlKey: false })).toBeCloseTo(wheelScale({ deltaY: 48, deltaMode: 0, ctrlKey: false }), 9)
  })
})
