/**
 * Idle auto rotate of the atlas camera. The body turns slowly while nobody touches it; any
 * pointer down, drag, wheel or touch stops it, and it resumes IDLE_MS after the last interaction.
 * It stays stopped while a structure or region is selected (the selected organ must not turn
 * away) and resumes IDLE_MS after the selection is cleared.
 */

/** Wait after the last interaction (or the end of a selection) before turning again. */
export const IDLE_MS = 3000
/** OrbitControls autoRotateSpeed (2 means one turn per 30 s at 60 fps). */
export const AUTO_ROTATE_SPEED = 0.9

export interface AutoRotateInput {
  /** Viewer option (off in some embeds). */
  enabled: boolean
  /** A camera fly-to is running. */
  flying: boolean
  /** A structure or region is selected. */
  selected: boolean
  /** A structure is under the pointer. */
  hovering: boolean
  now: number
  /** Time of the last interaction or selection clear; Infinity while a drag is in progress. */
  lastInteraction: number
}

export function shouldAutoRotate(s: AutoRotateInput): boolean {
  return s.enabled && !s.flying && !s.selected && !s.hovering && s.now - s.lastInteraction > IDLE_MS
}
