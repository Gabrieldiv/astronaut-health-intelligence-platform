/**
 * Ear markers: two small rings on the sides of the head that locate the 'ears' region (hearing
 * tests and noise exposure). The atlas has no ear geometry (the inner ear model is excluded for
 * license reasons), so nothing anatomical is drawn: only a status colored marker.
 * Visual only (no picking): the region is selected from its chip, label or the keyboard navigator.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, type Mesh, type MeshBasicMaterial } from 'three'
import type { Status } from '../../../types/domain'
import type { AtlasManifest } from '../atlas/types'
import { statusVisual } from '../regions'
import { earAnchors } from './layers'

export function EarMarkers({ manifest, status, selected }: { manifest: AtlasManifest; status: Status; selected: boolean }) {
  const anchors = useMemo(() => earAnchors(manifest), [manifest])
  const rings = useRef<(Mesh | null)[]>([])
  const vis = statusVisual('ears', status)
  const flagged = status !== 'LOW' && status !== 'NO_DATA'
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const base = selected ? 0.95 : flagged ? 0.8 : 0.4
    const pulse = flagged ? vis.pulse * (0.5 + 0.5 * Math.sin(t * 3)) : 0
    for (const m of rings.current) {
      if (!m) continue
      const mat = m.material as MeshBasicMaterial
      mat.opacity = Math.min(1, base + pulse)
      const s = 1 + (selected ? 0.12 : 0) + pulse * 0.4
      m.scale.setScalar(s)
    }
  })
  if (!anchors) return null
  return (
    <group name="ear-markers">
      {[anchors.left, anchors.right].map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            rings.current[i] = m
          }}
          position={p}
          rotation={[0, Math.PI / 2, 0]}
          renderOrder={20}
          raycast={() => null}
        >
          <torusGeometry args={[0.016, 0.0022, 10, 40]} />
          <meshBasicMaterial color={vis.color} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
