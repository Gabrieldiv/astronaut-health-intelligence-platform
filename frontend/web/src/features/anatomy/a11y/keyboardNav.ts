/**
 * Keyboard navigation over the monitored anatomy, for people who do not use a mouse (including
 * screen reader users). Pure TypeScript: the model and the key handling are unit tested in node.
 *
 * Model: the monitored body regions in dashboard order, each with the atlas structures that report
 * under it. The cursor is on a region (structure = -1) or on one structure of that region.
 *
 * Keys: Up and Down move between regions, Left and Right move between the structures of the
 * current region (wrapping back to the region itself), Home and End jump to the first and last
 * region. Enter (or Space) selects, Escape clears the selection (handled by the caller).
 */
import type { BodyRegionId } from '../../../types/domain'
import { REGION_LABELS } from '../../../engine/catalog'
import type { AtlasManifest, AtlasStructure } from '../atlas/types'
import { primaryStructureOfRegion, regionOfStructure } from '../atlas/health'
import { REGIONS } from '../regions'

export interface NavRegion {
  region: BodyRegionId
  label: string
  /** Monitored structures of the region: the representative organ first, then by name. */
  structures: AtlasStructure[]
  /** Organ that stands for the region (heart, brain...), null for whole body systems. */
  primary: AtlasStructure | null
}

export interface NavModel {
  regions: NavRegion[]
}

export interface NavCursor {
  /** Index in model.regions. */
  region: number
  /** Index in the region's structures, -1 = the region itself. */
  structure: number
}

/** What the cursor points at. */
export type NavTarget = { kind: 'region'; region: BodyRegionId; label: string } | { kind: 'structure'; region: BodyRegionId; structure: AtlasStructure; label: string }

export function buildNavModel(manifest: AtlasManifest): NavModel {
  const regions: NavRegion[] = []
  for (const region of REGIONS) {
    const primary = primaryStructureOfRegion(manifest, region)
    const list = manifest.structures.filter((s) => regionOfStructure(s) === region)
    if (!list.length) continue
    list.sort((a, b) => (a === primary ? -1 : b === primary ? 1 : a.name.localeCompare(b.name)))
    regions.push({ region, label: REGION_LABELS[region].label, structures: list, primary })
  }
  return { regions }
}

export const NAV_START: NavCursor = { region: 0, structure: -1 }

const wrap = (i: number, n: number) => ((i % n) + n) % n

/**
 * Next cursor for a key, or null when the key is not a navigation key (the caller lets it through).
 * Enter, Space and Escape are actions, not moves: they also return null.
 */
export function moveCursor(model: NavModel, cursor: NavCursor, key: string): NavCursor | null {
  const n = model.regions.length
  if (!n) return null
  const r = Math.min(Math.max(0, cursor.region), n - 1)
  const count = model.regions[r]!.structures.length
  switch (key) {
    case 'ArrowDown':
      return { region: wrap(r + 1, n), structure: -1 }
    case 'ArrowUp':
      return { region: wrap(r - 1, n), structure: -1 }
    case 'Home':
      return { region: 0, structure: -1 }
    case 'End':
      return { region: n - 1, structure: -1 }
    // the region itself is one more stop in the structure ring (-1, 0 .. count - 1)
    case 'ArrowRight':
      return { region: r, structure: wrap(cursor.structure + 2, count + 1) - 1 }
    case 'ArrowLeft':
      return { region: r, structure: wrap(cursor.structure, count + 1) - 1 }
    default:
      return null
  }
}

export function targetOf(model: NavModel, cursor: NavCursor): NavTarget | null {
  const g = model.regions[cursor.region]
  if (!g) return null
  const s = cursor.structure >= 0 ? g.structures[cursor.structure] : undefined
  return s ? { kind: 'structure', region: g.region, structure: s, label: s.name } : { kind: 'region', region: g.region, label: g.label }
}

/** Cursor that points at the current selection (so the navigator starts where the user is). */
export function cursorOf(model: NavModel, selectedRegion: BodyRegionId | null, selectedStructureId: string | null): NavCursor | null {
  for (let r = 0; r < model.regions.length; r++) {
    const g = model.regions[r]!
    if (selectedStructureId) {
      const i = g.structures.findIndex((s) => s.id === selectedStructureId)
      if (i >= 0) return { region: r, structure: i }
    } else if (selectedRegion === g.region) return { region: r, structure: -1 }
  }
  return null
}

/** Structure to highlight in 3D for a target: the structure itself, or the organ of the region. */
export function highlightOf(model: NavModel, target: NavTarget | null): AtlasStructure | null {
  if (!target) return null
  if (target.kind === 'structure') return target.structure
  return model.regions.find((g) => g.region === target.region)?.primary ?? null
}

/**
 * Store call for Enter: a structure goes through selectStructure(id, regionOfStructure(s)), exactly
 * like a click; a region goes through selectRegion, like its label chip.
 */
export function selectTarget(target: NavTarget, app: { selectStructure: (id: string | null, region?: BodyRegionId | null) => void; selectRegion: (r: BodyRegionId | null) => void }) {
  if (target.kind === 'structure') app.selectStructure(target.structure.id, regionOfStructure(target.structure))
  else app.selectRegion(target.region)
}
