/**
 * Interaction modes of the atlas viewer.
 *
 * - Monitor (default): only structures that report under a monitored body region react to hover
 *   and click. Context only structures are drawn quieter and the pointer passes through them.
 * - Explore: every structure can be hovered and selected (context only structures show the
 *   "Context only" card).
 *
 * The choice is remembered in localStorage (best effort: private windows or blocked storage
 * simply fall back to Monitor).
 */
import type { AtlasStructure } from '../atlas/types'
import { regionOfStructure } from '../atlas/health'

export type InteractionMode = 'monitor' | 'explore'

export const DEFAULT_INTERACTION_MODE: InteractionMode = 'monitor'
export const INTERACTION_MODE_KEY = 'ahi.anatomy.interactionMode'

export const INTERACTION_MODE_INFO: Record<InteractionMode, { label: string; title: string }> = {
  monitor: {
    label: 'Monitor',
    title: 'Monitor mode: only monitored body regions respond to hover and click. Click to explore all anatomy.',
  },
  explore: {
    label: 'Explore',
    title: 'Explore mode: every structure can be selected, for anatomical reference. Click to go back to Monitor mode.',
  },
}

/** true when the structure reacts to hover and click in this mode. */
export function isInteractive(s: AtlasStructure, mode: InteractionMode): boolean {
  return mode === 'explore' || regionOfStructure(s) !== null
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readInteractionMode(storage: StorageLike | null = defaultStorage()): InteractionMode {
  try {
    const v = storage?.getItem(INTERACTION_MODE_KEY)
    return v === 'explore' || v === 'monitor' ? v : DEFAULT_INTERACTION_MODE
  } catch {
    return DEFAULT_INTERACTION_MODE
  }
}

export function writeInteractionMode(mode: InteractionMode, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(INTERACTION_MODE_KEY, mode)
  } catch {
    // storage full or blocked: the mode still applies for this session
  }
}
