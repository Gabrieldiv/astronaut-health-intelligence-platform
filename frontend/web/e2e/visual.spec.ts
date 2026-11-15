import { test, expect, freezeSimulation } from './fixtures'

/**
 * Visual regression of the stable panels.
 *
 * Determinism: the simulation is seeded and starts at a fixed simulated time. Each test pauses
 * the clock and restarts the scenario, so every panel shows the exact same simulated instant.
 * The 3D canvas is masked (its frames depend on GPU timing) and CSS animations are disabled
 * (playwright.config.ts). Small antialiasing differences are tolerated (maxDiffPixelRatio).
 *
 * Baselines are platform specific (e2e/__screenshots__/<platform>/). They are committed for
 * Windows only, so this file is skipped elsewhere unless E2E_VISUAL=1 (for example to generate
 * Linux baselines inside the Playwright Docker image).
 */
test.skip(process.platform !== 'win32' && !process.env.E2E_VISUAL, 'Visual baselines exist for Windows only (set E2E_VISUAL=1 to run).')

test.beforeEach(async ({ app }) => {
  // Things that settle on their own after load must settle before any shot: the connection chip
  // (Checking, then Offline demo), the bundled space weather snapshot behind the mission control
  // dot, and the lazy chunks. Then the clock is paused and the scenario restarted.
  await expect(app.getByRole('button', { name: /^Connection: Offline demo/ })).toBeVisible()
  await app.waitForLoadState('networkidle').catch(() => undefined)
  await freezeSimulation(app)
})

test('top bar', async ({ app: page }) => {
  await expect(page.getByRole('banner')).toHaveScreenshot('top-bar.png')
})

test('crew list', async ({ app: page }) => {
  await expect(page.getByRole('navigation', { name: 'Crew' })).toHaveScreenshot('crew-list.png')
})

test('attention panel', async ({ app: page }) => {
  await expect(page.getByRole('complementary', { name: 'What needs attention' })).toHaveScreenshot('attention-panel.png')
})

test('devices panel', async ({ app: page }) => {
  await page.getByRole('button', { name: /^Devices:/ }).click()
  const list = page.getByRole('dialog', { name: /devices/i })
  await expect(list).toBeVisible()
  await expect(list).toHaveScreenshot('devices-panel.png')
})

test('crew view side column', async ({ app: page }) => {
  await page.getByRole('radio', { name: 'Crew view' }).click()
  const systems = page.getByRole('region', { name: 'Your body systems' })
  await expect(systems).toBeVisible()
  await expect(systems).toHaveScreenshot('crew-view-body-systems.png')
  await expect(page.getByRole('region', { name: 'What to do now' })).toHaveScreenshot('crew-view-actions.png')
})

test('mission and Earth link panel', async ({ app: page }) => {
  await page.getByRole('button', { name: /^Mission and Earth link:/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Mission and Earth link' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveScreenshot('mission-link-panel.png', { mask: [page.locator('canvas')] })
  await dialog.getByRole('tab', { name: /^Earth link/ }).click()
  await expect(dialog).toHaveScreenshot('mission-link-panel-earth-link.png', { mask: [page.locator('canvas')] })
})

test('indicator breakdown popover', async ({ app: page }) => {
  await page.getByTitle('What do these indicators cover? Open the breakdown').click()
  const popover = page.getByRole('dialog', { name: 'Health indicators: ORION' })
  await expect(popover.getByRole('button', { name: /^Heart/ })).toBeVisible()
  await expect(popover).toHaveScreenshot('indicator-breakdown.png')
})

test('mission panel, what the mission profile changes', async ({ app: page }) => {
  await page.getByRole('button', { name: /^Mission and Earth link:/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Mission and Earth link' })
  const first = dialog.locator('section').first()
  await expect(first.getByRole('heading', { name: 'What the mission profile changes' })).toBeVisible()
  await expect(first).toHaveScreenshot('mission-what-changes.png')
})
