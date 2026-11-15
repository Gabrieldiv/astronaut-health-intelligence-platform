import { defineConfig, devices } from '@playwright/test'
import { API_URL, PORT } from './e2e/env'

/**
 * End to end and visual tests (Playwright, Chromium only).
 *
 * - The dev server runs on port 5190 (5173 is kept free for `npm run dev`).
 * - The API base URL points at a port nothing listens on, and every test also aborts requests to
 *   it (see e2e/fixtures.ts): the suite always exercises the offline demo mode, even when a local
 *   backend happens to be running on port 8000.
 * - Visual snapshots (e2e/visual.spec.ts) are platform specific. Baselines are committed for
 *   Windows (where they were generated). On other platforms (CI runs Ubuntu) visual tests are
 *   skipped unless E2E_VISUAL=1 is set, so CI runs the functional suite only.
 */

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      // Small antialiasing and font hinting differences are tolerated.
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Every page loads the WebGL atlas; more than two pages at once starves the GPU and the GLB
  // fetches time out, so local runs use the same cap as CI.
  workers: 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
    // Fail fast on a missing element instead of waiting for the whole test timeout.
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Reduced motion: the app slows and dims its own animations (body scan, pulses).
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        channel: process.env.E2E_CHANNEL,
        launchOptions: { args: (process.env.E2E_GPU_ARGS ?? '').split(' ').filter(Boolean) },
      },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_API_URL: API_URL },
  },
})
