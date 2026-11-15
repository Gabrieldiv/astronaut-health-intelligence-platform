import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { wheelScale, zoomToward } from './zoom'

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

describe('wheelScale', () => {
  it('zooms in on wheel up, out on wheel down, and caps one event', () => {
    expect(wheelScale({ deltaY: -100, deltaMode: 0, ctrlKey: false })).toBeLessThan(1)
    expect(wheelScale({ deltaY: 100, deltaMode: 0, ctrlKey: false })).toBeGreaterThan(1)
    expect(wheelScale({ deltaY: 1e6, deltaMode: 0, ctrlKey: false })).toBe(2)
    expect(wheelScale({ deltaY: 3, deltaMode: 1, ctrlKey: false })).toBeCloseTo(wheelScale({ deltaY: 48, deltaMode: 0, ctrlKey: false }), 9)
  })
})
