import { test, expect, chooseScenario, advanceSim, openTools, MINUTE } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * End to end checks of the final polish: the indicator breakdown, the mission chip on the 3D
 * stage, the mission profile chip name, the language switch on engine text, the offline mode
 * switch and the paused crew card. Each test is independent and starts from the offline demo
 * (see fixtures.ts). All data is simulated.
 */

const INDICATOR_TRIGGER = 'What do these indicators cover? Open the breakdown'
const MISSION_CHIP = /Mission context: open what this profile changes/

/**
 * Picks a language in the Tools menu. `from` is the current language: in English the item reads
 * "Language", elsewhere it keeps the English word in brackets "(Language)" (see LanguageMenu.tsx).
 */
async function chooseLanguage(page: Page, to: 'en' | 'pt-BR', from: 'en' | 'pt-BR') {
  await openTools(page)
  await page.getByRole('menuitem', { name: from === 'en' ? /^Language/ : /\(Language\)/ }).click()
  await page.locator(`[role="menuitemradio"][lang="${to}"]`).click()
  await expect(page.locator('html')).toHaveAttribute('lang', to)
}

test.describe('Indicator breakdown', () => {
  test('the indicator count opens a breakdown by body system and Esc closes it', async ({ app: page }) => {
    const trigger = page.getByTitle(INDICATOR_TRIGGER)
    await expect(trigger).toContainText(/\d+\/\d+ indicators normal/)
    await trigger.click()

    const popover = page.getByRole('dialog', { name: 'Health indicators: ORION' })
    await expect(popover).toBeVisible()
    await expect(popover).toContainText('compared with the personal normal range of ORION')
    await expect(popover).toContainText(/\d+ of \d+ indicators are in the normal range/)
    // One row per body system, each with its own count.
    for (const system of ['Heart', 'Lungs', 'Brain', 'Skeleton']) {
      await expect(popover.getByRole('button', { name: new RegExp(`^${system}\\b`) })).toBeVisible()
    }
    await expect(popover).toContainText('Indicators without data are never counted as normal.')

    await page.keyboard.press('Escape')
    await expect(popover).toHaveCount(0)
  })

  test('a row of the breakdown shows that body system on the body', async ({ app: page }) => {
    await page.getByTitle(INDICATOR_TRIGGER).click()
    const popover = page.getByRole('dialog', { name: 'Health indicators: ORION' })
    await popover.getByRole('button', { name: /^Heart\b/ }).click()
    await expect(popover).toHaveCount(0)
    await expect(page.getByRole('complementary', { name: 'What needs attention' }).getByRole('list', { name: 'Heart metrics' })).toBeVisible()
  })
})

test.describe('Mission chip on the stage', () => {
  test('opens the Mission and Earth link panel on what the mission profile changes', async ({ app: page }) => {
    await page.getByRole('button', { name: MISSION_CHIP }).click()
    const dialog = page.getByRole('dialog', { name: 'Mission and Earth link' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('tab', { name: /^Mission/ })).toHaveAttribute('aria-selected', 'true')
    // The first section of the Mission tab says what the profile changes, and what it does not.
    const first = dialog.locator('section').first()
    await expect(first.getByRole('heading', { name: 'What the mission profile changes' })).toBeVisible()
    await expect(first).toContainText('Radiation: the dose rate read by the dosimeters')
    await expect(first).toContainText('Not changed: the simulated vital signs')
  })

  test('switching the profile to Moon changes the name on the chip', async ({ app: page }) => {
    await expect(page.getByRole('button', { name: /^ISS, low Earth orbit\. Mission context/ })).toBeVisible()
    await page.getByRole('button', { name: /^Mission and Earth link: ISS/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Mission and Earth link' })
    await dialog.getByRole('radio', { name: /^Moon/ }).click()
    await expect(dialog.getByRole('radio', { name: /^Moon/ })).toHaveAttribute('aria-checked', 'true')
    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toHaveCount(0)

    await expect(page.getByRole('button', { name: /^Moon, Artemis class\. Mission context/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^ISS, low Earth orbit\. Mission context/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Mission and Earth link: Moon/ })).toBeVisible()
  })
})

test.describe('Language on engine text', () => {
  test('the stage headline is translated to Portuguese and restored in English', async ({ app: page }) => {
    const headline = page.locator('[data-tour="headline"]')
    await expect(headline.getByText('All indicators are within your normal range.')).toBeAttached()

    await chooseLanguage(page, 'pt-BR', 'en')
    await expect(headline.getByText('Todos os indicadores estão dentro do seu normal.')).toBeAttached()
    await expect(headline.getByText('All indicators are within your normal range.')).toHaveCount(0)

    await chooseLanguage(page, 'en', 'pt-BR')
    await expect(headline.getByText('All indicators are within your normal range.')).toBeAttached()
    await expect(headline.getByText('Todos os indicadores estão dentro do seu normal.')).toHaveCount(0)
  })

  test('an alert title is translated to Portuguese and restored in English', async ({ app: page }) => {
    test.setTimeout(120_000)
    await chooseScenario(page, 'Acute cardio event')
    await advanceSim(page, 20 * MINUTE, MINUTE)
    // The critical banner (found by its tour anchor: its words follow the language).
    const banner = page.locator('[data-tour="banner"]')
    await expect(banner).toContainText('ORION: Heart rate')

    await chooseLanguage(page, 'pt-BR', 'en')
    await expect(banner).toContainText('ORION: Frequência cardíaca')
    await expect(banner).not.toContainText('ORION: Heart rate')

    await chooseLanguage(page, 'en', 'pt-BR')
    await expect(banner).toContainText('ORION: Heart rate')
    await expect(banner).not.toContainText('ORION: Frequência cardíaca')
  })
})

test.describe('Connection mode', () => {
  test('Offline mode hides the OSDR list and the top bar chip says Offline demo', async ({ app: page }) => {
    await openTools(page)
    await page.getByRole('menuitem', { name: /^Data and model/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Data and model' })
    await dialog.getByRole('tab', { name: 'NASA context' }).click()
    const osdr = dialog.getByRole('heading', { name: 'Human spaceflight research in NASA OSDR' })
    await expect(osdr).toBeVisible()

    const offline = dialog.getByRole('radiogroup', { name: 'Connection mode' }).getByRole('radio', { name: 'Offline', exact: true })
    await offline.click()
    await expect(offline).toHaveAttribute('aria-checked', 'true')
    await expect(osdr).toHaveCount(0)
    await expect(dialog).toContainText('Offline: no network request.')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Connection: Offline demo/ })).toContainText('Offline demo')
  })
})

test.describe('Paused device on the crew card', () => {
  test('pausing the Bio-Monitor shows Paused on the ORION card and leaves the others alone', async ({ app: page }) => {
    await page.getByRole('button', { name: /^Devices:/ }).click()
    const devices = page.getByRole('dialog', { name: 'Devices' })
    await devices.getByRole('button', { name: 'Pause monitoring: Bio-Monitor shirt' }).click()
    await devices.getByRole('group', { name: 'Confirm pause of Bio-Monitor shirt' }).getByRole('button', { name: 'Pause', exact: true }).click()
    await expect(devices.getByRole('button', { name: 'Resume monitoring: Bio-Monitor shirt' })).toBeVisible()

    const crew = page.getByRole('navigation', { name: 'Crew' })
    const orion = crew.getByRole('button', { name: /^ORION, .*Monitoring paused by operator/ })
    await expect(orion).toBeVisible()
    // The status pill says Paused (not Signal lost, not All good).
    await expect(orion).toContainText('Paused')
    await expect(orion).not.toContainText('All good')
    await expect(crew.getByRole('button', { name: /^LYRA, .*Status: All good/ })).toBeVisible()
  })
})
