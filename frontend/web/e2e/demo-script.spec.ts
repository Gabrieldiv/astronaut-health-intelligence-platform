import { test, expect, chooseScenario, chooseSpeed, advanceSim, openTools, HOUR, MINUTE } from './fixtures'

/**
 * End to end walk through docs/demo-script.md, one test per beat. All data is simulated; the
 * simulation is seeded, so the expected states are reproducible. Time is advanced with the dev
 * store helper (see fixtures.ts) instead of waiting in real time.
 */

test.describe('0 to 2. Setup and the screen in 10 seconds', () => {
  test('loads the ground view with the SIMULATED badge, the crew and the attention panel', async ({ app: page }) => {
    await expect(page.getByRole('button', { name: /^Simulated data\. All data on this screen is simulated/ })).toHaveText(/Simulated/i)
    await expect(page.getByRole('button', { name: 'Scenario: Nominal day. Choose a demo scenario' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Simulation speed: 1 min/s' })).toBeVisible()

    const crew = page.getByRole('navigation', { name: 'Crew' })
    for (const callsign of ['ORION', 'LYRA', 'VEGA', 'ATLAS']) {
      await expect(crew.getByRole('button', { name: new RegExp(`^${callsign}, .*Status: All good`) })).toBeVisible()
    }
    const attention = page.getByRole('complementary', { name: 'What needs attention' })
    await expect(attention.getByRole('heading', { name: 'What needs attention' })).toBeVisible()
    await expect(attention).toContainText('All good')
    await expect(attention).toContainText('Decision support only. Not a diagnosis. Simulated data.')
    await expect(page.getByRole('region', { name: 'Live vitals for ORION' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Devices' })).toBeVisible()
  })
})

test.describe('3. Progressive fatigue', () => {
  test('LYRA drifts from All good to Act soon over simulated days, explained against her own baseline', async ({ app: page }) => {
    test.setTimeout(180_000)
    await chooseScenario(page, 'Progressive fatigue')
    await chooseSpeed(page, '1 h/s')
    const lyra = page.getByRole('navigation', { name: 'Crew' }).getByRole('button', { name: /^LYRA,/ })
    await expect(lyra).toHaveAccessibleName(/Status: All good/)

    await advanceSim(page, 72 * HOUR)
    await expect(lyra).toHaveAccessibleName(/Status: Act soon/)
    await lyra.click()

    const attention = page.getByRole('complementary', { name: 'What needs attention' })
    await expect(attention).toContainText('LYRA')
    await expect(attention).toContainText('Act soon')
    // The cause is a pattern against her own normal range, not a fixed line.
    await expect(attention.getByRole('region', { name: 'Why' })).toContainText(/HRV/)

    // The Heart chip beside the body opens the heart detail (metrics, trend and forecast).
    await page.getByRole('group', { name: /^Body systems:/ }).getByRole('button', { name: /^Heart,/ }).click()
    await expect(attention.getByRole('list', { name: 'Heart metrics' })).toBeVisible()
  })
})

test.describe('4. Acute cardio event', () => {
  test('ORION reaches CRITICAL, the banner shows, and acknowledging writes the audit trail', async ({ app: page }) => {
    await chooseScenario(page, 'Acute cardio event')
    await chooseSpeed(page, '1 min/s')
    await advanceSim(page, 20 * MINUTE, MINUTE)

    const orion = page.getByRole('navigation', { name: 'Crew' }).getByRole('button', { name: /^ORION,/ })
    await expect(orion).toHaveAccessibleName(/Status: Act now/)

    const banner = page.getByRole('alert').filter({ hasText: /Critical · Act now · ORION/i })
    await expect(banner).toBeVisible()

    // Recommended actions: the flight surgeon review is flagged.
    const attention = page.getByRole('complementary', { name: 'What needs attention' })
    await expect(attention.getByRole('region', { name: 'Recommended actions' })).toContainText('Needs flight surgeon')

    await banner.getByRole('button', { name: 'Acknowledge' }).click()

    // The audit trail (Alerts, History tab) records the acknowledgement.
    await page.getByRole('button', { name: /^Alerts,/ }).click()
    await page.getByRole('tab', { name: 'History' }).click()
    const log = page.getByRole('list', { name: 'Activity log, newest first' })
    await expect(log).toContainText('Alert acknowledged')
  })
})

test.describe('5. Sensor failure', () => {
  test('VEGA shows signal lost and no data, never normal', async ({ app: page }) => {
    await chooseScenario(page, 'Sensor failure')
    await advanceSim(page, 60 * MINUTE, 5 * MINUTE)

    const vega = page.getByRole('navigation', { name: 'Crew' }).getByRole('button', { name: /^VEGA,/ })
    await expect(vega).toHaveAccessibleName(/signal lost/i)
    await vega.click()

    const hr = page.getByRole('region', { name: 'Live vitals for VEGA' }).getByRole('button', { name: /^Heart rate:/ })
    await expect(hr).toHaveAccessibleName(/signal lost/i)
    await expect(hr).not.toHaveAccessibleName(/Within your normal range|All good/)
    const heartChip = page.getByRole('group', { name: /^Body systems:/ }).getByRole('button', { name: /^Heart,/ })
    await expect(heartChip).not.toHaveAccessibleName(/All good/)
    // The recommendation is about the sensor, not the astronaut.
    await expect(page.getByRole('complementary', { name: 'What needs attention' })).toContainText(/sensor/i)
  })
})

test.describe('Devices', () => {
  test('pausing a device shows no data, never normal, and is audited; resuming restores it', async ({ app: page }) => {
    const devicesButton = page.getByRole('button', { name: /^Devices:/ })
    await devicesButton.click()
    const devices = page.getByRole('dialog', { name: 'Devices' })
    await devices.getByRole('button', { name: 'Pause monitoring: Bio-Monitor shirt' }).click()
    await devices.getByRole('group', { name: 'Confirm pause of Bio-Monitor shirt' }).getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(devices.getByRole('button', { name: 'Resume monitoring: Bio-Monitor shirt' })).toBeVisible()
    await expect(devicesButton).toHaveAccessibleName(/1 paused by operator/)

    const hr = page.getByRole('region', { name: 'Live vitals for ORION' }).getByRole('button', { name: /^Heart rate:/ })
    await expect(hr).toHaveAccessibleName(/no data, device paused by operator/)
    await expect(hr).not.toHaveAccessibleName(/Within your normal range/)

    await devices.getByRole('button', { name: 'Resume monitoring: Bio-Monitor shirt' }).click()
    await expect(devices.getByRole('button', { name: 'Pause monitoring: Bio-Monitor shirt' })).toBeVisible()
    await expect(devicesButton).not.toHaveAccessibleName(/paused by operator/)
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /^Alerts,/ }).click()
    await page.getByRole('tab', { name: 'History' }).click()
    const log = page.getByRole('list', { name: 'Activity log, newest first' })
    await expect(log).toContainText('Device paused')
    await expect(log).toContainText('Device resumed')
  })
})

test.describe('Forecast horizons', () => {
  test('a horizon longer than the available history says so instead of projecting', async ({ app: page }) => {
    const forecast = page.getByRole('complementary', { name: 'What needs attention' }).getByRole('region', { name: 'Forecast' })
    const horizons = forecast.getByRole('group', { name: 'Forecast horizon' })
    await expect(horizons.getByRole('button', { name: '24 h' })).toHaveAttribute('aria-pressed', 'true')
    await expect(forecast).not.toContainText('Not enough history for this horizon')

    // Heart rate has history for up to 7 days of projection, not 15 (demo rule: half the horizon).
    await horizons.getByRole('button', { name: '15 days' }).click()
    await expect(horizons.getByRole('button', { name: '15 days' })).toHaveAttribute('aria-pressed', 'true')
    await expect(forecast.getByRole('button', { name: /^Heart rate\. Not enough history for this horizon/ })).toBeVisible()

    await horizons.getByRole('button', { name: '7 days' }).click()
    await expect(forecast.getByRole('button', { name: /^Heart rate\. / })).not.toHaveAccessibleName(/Not enough history/)
  })
})

test.describe('Mission profiles', () => {
  test('switching to Mars transit shows the communication delay guidance', async ({ app: page }) => {
    await page.getByRole('button', { name: /^Mission profile: ISS/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Mission context' })
    await expect(dialog).toContainText('Ground support in near real time')
    await dialog.getByRole('radio', { name: /^Mars transit/ }).click()
    await expect(dialog.getByRole('radio', { name: /^Mars transit/ })).toHaveAttribute('aria-checked', 'true')
    await expect(dialog).toContainText('Crew acts first, Earth reviews later')
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByRole('button', { name: /^Mission profile: Mars transit/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Earth link: Mars/ })).toBeVisible()
  })
})

test.describe('Crew view', () => {
  test('shows the body system cards for one astronaut', async ({ app: page }) => {
    await page.getByRole('radio', { name: 'Crew view' }).click()
    const systems = page.getByRole('region', { name: 'Your body systems' })
    await expect(systems.getByRole('heading', { name: /Your body systems/ })).toBeVisible()
    for (const s of ['Brain', 'Eyes', 'Ears', 'Heart', 'Lungs', 'Kidneys', 'Muscles', 'Skeleton', 'Skin']) {
      await expect(systems.getByRole('button', { name: new RegExp(`^${s}: All good`) })).toBeVisible()
    }
    const heart = systems.getByRole('button', { name: /^Heart:/ })
    await heart.click()
    await expect(heart).toHaveAccessibleName(/Shown on the body/)
    await expect(page.getByRole('region', { name: 'What to do now' })).toBeVisible()
    await page.getByRole('radio', { name: 'Ground view' }).click()
  })
})

test.describe('Keyboard', () => {
  test('the skip link moves focus to the main content', async ({ app: page }) => {
    await page.locator('body').focus()
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Skip to main content' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('main', { name: 'Crew health overview' })).toBeFocused()
  })

  test('the body navigator selects the Heart with Enter', async ({ app: page }) => {
    const navigator = page.getByRole('application', { name: /^3D body\./ })
    await navigator.focus()
    const announcer = page.getByRole('status').filter({ hasText: / region\. / })
    await expect(announcer).toContainText(/^Brain region/)
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown')
    await expect(announcer).toContainText(/^Heart region\. Status: /)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status').filter({ hasText: 'Selected Heart.' })).toBeAttached()
    await expect(page.getByRole('complementary', { name: 'What needs attention' }).getByRole('list', { name: 'Heart metrics' })).toBeVisible()
  })
})

test.describe('Ask AHI', () => {
  test('opens and shows the offline state when there is no backend', async ({ app: page }) => {
    await page.getByRole('button', { name: 'Ask AHI' }).click()
    const offline = page.getByRole('status').filter({ hasText: 'Assistant offline' })
    await expect(offline).toBeVisible()
    await expect(offline).toContainText('The rest of AHI keeps working')
    await expect(offline.getByRole('button', { name: 'Retry' })).toBeVisible()
  })
})

test.describe('Data and model', () => {
  test('the NASA context tab works in offline demo mode with the bundled DONKI snapshot', async ({ app: page }) => {
    await openTools(page)
    await page.getByRole('menuitem', { name: /^Data and model/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Data and model' })
    await dialog.getByRole('tab', { name: 'NASA context' }).click()
    await expect(dialog.getByRole('tab', { name: 'NASA context' })).toHaveAttribute('aria-selected', 'true')
    await expect(dialog).toContainText('Offline demo mode')
    await expect(dialog).toContainText('bundled copy for offline demos')
    await expect(dialog.getByRole('list', { name: 'Events by type' })).toBeVisible()
  })
})

test.describe('Language', () => {
  test('switches to Japanese and back to English', async ({ app: page }) => {
    await openTools(page)
    await page.getByRole('menuitem', { name: /^Language/ }).click()
    await page.locator('[role="menuitemradio"][lang="ja"]').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveCount(0)

    await openTools(page)
    // Outside English the item keeps the English word in brackets so anyone can find the way back.
    await page.getByRole('menuitem', { name: /\(Language\)/ }).click()
    await page.locator('[role="menuitemradio"][lang="en"]').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached()
    await expect(page.getByRole('button', { name: 'Scenario: Nominal day. Choose a demo scenario' })).toBeVisible()
  })
})
