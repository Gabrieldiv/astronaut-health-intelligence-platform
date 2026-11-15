import { test as base, expect, type Page } from '@playwright/test'
import { API_URL } from './env'

/**
 * Shared helpers for the AHI end to end tests.
 *
 * Tests drive the app through what a user sees (roles, labels, text). The only shortcut is
 * time: the simulation clock is advanced with the dev store helper `window.__ahi` (exposed in
 * dev builds only, see src/app/App.tsx) so a scenario that takes simulated hours runs in seconds.
 */

const MINUTE = 60_000
export const HOUR = 60 * MINUTE

type StoreHandle = {
  getState: () => {
    pause: () => void
    play: () => void
    fastForward: (ms: number) => void
    clock: { running: boolean; simNow: number; scenarioId: string }
  }
}

export const test = base.extend<{ app: Page; fullAnatomy: boolean }>({
  /** Load the real 3D atlas (slow without a GPU). Off by default; the keyboard navigator needs it. */
  fullAnatomy: [false, { option: true }],
  app: async ({ page, fullAnatomy }, provide) => {
    // No backend, ever: the suite always exercises the offline demo mode.
    await page.route(`${API_URL}/**`, (route) => route.abort('connectionrefused'))
    if (!process.env.E2E_FULL_3D && !fullAnatomy) await page.route('**/anatomy/*.glb', (route) => route.abort('blockedbyclient'))
    // The engine builds days of simulated history at startup: wait for the UI, not for "load".
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /^Simulated data/ })).toBeVisible({ timeout: 60_000 })
    await page.waitForFunction(() => 'getState' in ((window as unknown as { __ahi?: object }).__ahi ?? {}))
    await provide(page)
  },
})

export { expect }

/** Picks a demo scenario through the scenario picker in the top bar. */
export async function chooseScenario(page: Page, name: string) {
  await page.getByRole('button', { name: /^Scenario: .*Choose a demo scenario/ }).click()
  await page.getByRole('option', { name: new RegExp(`^${name}`) }).click()
  await expect(page.getByRole('button', { name: new RegExp(`^Scenario: ${name}\\.`) })).toBeVisible()
}

/** Picks a simulation speed ("1 min/s", "1 h/s"...) through the speed picker. */
export async function chooseSpeed(page: Page, label: string) {
  await page.getByRole('button', { name: /^Simulation speed:/ }).click()
  await page.getByRole('dialog', { name: 'Simulation speed' }).getByRole('button', { name: new RegExp(`^${label.replace('/', '\\/')}`) }).click()
  await expect(page.getByRole('button', { name: `Simulation speed: ${label}` })).toBeVisible()
}

/** Pauses the simulation with the play/pause button (no-op when already paused). */
export async function pauseSimulation(page: Page) {
  const pause = page.getByRole('button', { name: 'Pause simulation (Space)' })
  if (await pause.isVisible()) await pause.click()
  await expect(page.getByRole('button', { name: 'Play simulation (Space)' })).toBeVisible()
}

/**
 * Advances the simulated clock by `simMs` in `stepMs` chunks, evaluating the analytics after each
 * chunk (like the live ticker does), then lets React render.
 */
export async function advanceSim(page: Page, simMs: number, stepMs = 15 * MINUTE) {
  await page.evaluate(
    ({ simMs, stepMs }) => {
      const store = (window as unknown as { __ahi: StoreHandle }).__ahi
      store.getState().pause()
      for (let done = 0; done < simMs; done += stepMs) store.getState().fastForward(Math.min(stepMs, simMs - done))
    },
    { simMs, stepMs },
  )
}

/**
 * Opens the Tools menu. The button is found by the menu it controls because its accessible name
 * follows the UI language.
 */
export async function openTools(page: Page) {
  await page.locator('button[aria-controls="ahi-tools-menu"]').click()
  await expect(page.locator('#ahi-tools-menu')).toBeVisible()
}

/**
 * Puts the app in a deterministic state for screenshots: pauses the clock and restarts the
 * current scenario, so the seeded simulation sits exactly at its fixed start instant.
 */
export async function freezeSimulation(page: Page) {
  await page.evaluate(() => {
    const store = (window as unknown as { __ahi: { getState: () => { pause: () => void; reset: () => void } } }).__ahi
    store.getState().pause()
    store.getState().reset()
  })
  await expect(page.getByRole('button', { name: 'Play simulation (Space)' })).toBeVisible()
}

export { MINUTE }
