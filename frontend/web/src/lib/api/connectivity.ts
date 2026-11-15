/**
 * Online and offline mode switch for the optional AHI API (backend/).
 *
 * - auto (default): probe the API and fall back to offline demo mode when it does not answer.
 * - online: always use the API. When it is unreachable the UI says so clearly, and every caller
 *   still has its offline path, so the app stays usable.
 * - offline: never touch the network. Bundled DONKI snapshot, assistant offline, OSDR hidden.
 *
 * VITE_API_URL=off (static hosting) forces offline whatever the stored choice is.
 * The choice persists in localStorage (wrapped in try/catch: private windows must not break the app).
 */
import { create } from 'zustand'
import type { BackendStatus } from './client'

export type ConnectivityMode = 'auto' | 'online' | 'offline'
export const CONNECTIVITY_MODES: readonly ConnectivityMode[] = ['auto', 'online', 'offline']

export const CONNECTIVITY_STORAGE_KEY = 'ahi.connectivity.v1'

/** Command that starts the AHI API, run from backend/. Shown when Online is chosen and the API does not answer. */
export const START_BACKEND_COMMAND = 'uvicorn app.main:create_app --factory --port 8000'

/** Values of VITE_API_URL that disable the API for a build. */
const OFF_VALUES = ['off', 'none', 'false', '0']

/** True when this build has the API disabled (VITE_API_URL=off). */
export function apiDisabledByBuild(): boolean {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  return !!raw && OFF_VALUES.includes(raw.toLowerCase())
}

export function parseMode(raw: unknown): ConnectivityMode {
  return typeof raw === 'string' && (CONNECTIVITY_MODES as readonly string[]).includes(raw) ? (raw as ConnectivityMode) : 'auto'
}

/** The mode actually applied: the build switch wins over the stored choice. */
export function resolveMode(chosen: ConnectivityMode, buildDisabled: boolean): { mode: ConnectivityMode; forced: boolean } {
  return buildDisabled ? { mode: 'offline', forced: true } : { mode: chosen, forced: false }
}

/** What the top bar chip shows. */
export type ConnectivityChipState = 'checking' | 'offline-demo' | 'live' | 'unreachable'

/**
 * Chip state from the applied mode and the last backend probe:
 * offline is always "Offline demo"; a connected API is "Live NASA data"; an unreachable API is
 * "API unreachable" when the user asked for online, and plain "Offline demo" in automatic mode.
 */
export function chipState(mode: ConnectivityMode, backend: BackendStatus | null): ConnectivityChipState {
  if (mode === 'offline') return 'offline-demo'
  if (backend === null) return 'checking'
  if (backend.kind === 'connected') return 'live'
  return mode === 'online' ? 'unreachable' : 'offline-demo'
}

function readStored(): ConnectivityMode {
  try {
    return parseMode(window.localStorage.getItem(CONNECTIVITY_STORAGE_KEY))
  } catch {
    return 'auto'
  }
}

function writeStored(mode: ConnectivityMode) {
  try {
    window.localStorage.setItem(CONNECTIVITY_STORAGE_KEY, mode)
  } catch {
    // storage unavailable: the choice lasts for this session only
  }
}

interface ConnectivityState {
  /** The user's choice (persisted). The applied mode is getConnectivityMode(). */
  chosen: ConnectivityMode
  /** Last backend probe, null while unknown or after a mode change. */
  backend: BackendStatus | null
}

export const useConnectivity = create<ConnectivityState>()(() => ({ chosen: readStored(), backend: null }))

/** Applied mode (VITE_API_URL=off forces offline). */
export function getConnectivityMode(): ConnectivityMode {
  return resolveMode(useConnectivity.getState().chosen, apiDisabledByBuild()).mode
}

/** False in offline mode: callers must not open any network connection. */
export function networkAllowed(): boolean {
  return getConnectivityMode() !== 'offline'
}

export function setConnectivityMode(mode: ConnectivityMode): void {
  writeStored(mode)
  if (useConnectivity.getState().chosen === mode) return
  useConnectivity.setState({ chosen: mode, backend: null })
}

/** Records the outcome of a backend probe (called by getBackendStatus). */
export function recordBackendStatus(status: BackendStatus): void {
  useConnectivity.setState({ backend: status })
}

/** True when VITE_API_URL=off decides the mode and the switch cannot change it. */
export const modeForcedByBuild = (): boolean => apiDisabledByBuild()

/** Hook: applied mode, re-rendering on change. */
export function useConnectivityMode(): ConnectivityMode {
  const chosen = useConnectivity((s) => s.chosen)
  return resolveMode(chosen, apiDisabledByBuild()).mode
}
