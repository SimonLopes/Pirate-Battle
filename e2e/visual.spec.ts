import { expect, test, type Locator, type Page } from '@playwright/test'
import type { Snapshot } from '../src/game/testing.ts'

const assetTimeout = 20_000
const optionsKey = 'pirate-battle.options'

const options = {
  captainName: 'Red Anne',
  sessionDuration: 120,
  spawnInterval: 3,
  fullscreenOnMobile: false,
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, stored }) => {
      localStorage.setItem(key, JSON.stringify(stored))
    },
    { key: optionsKey, stored: options },
  )
})

test.describe('visual regression', () => {
  test('main menu', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('img', { name: 'Pirate Battle' })).toBeVisible()
    await expect(page.locator('.menu-captain')).toContainText('Red Anne')
    await shot(page, 'menu.png')
  })

  test('paused arena', async ({ page }) => {
    await openMatch(page)
    await step(page, 1500)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible()
    await expect(page.locator('.control-hint')).toHaveCount(0)
    const clock = page.locator('time')
    await expect(clock).toHaveText('1:59')
    await shot(page, 'arena.png', clock)
  })

  test('result screen', async ({ page }) => {
    await openMatch(page)
    await sink(page)
    const result = page.getByRole('dialog', { name: 'Battle complete' })
    await expect(result).toContainText('Record saved')
    await shot(page, 'result.png', result.locator('time'))
  })
})

async function shot(page: Page, name: string, clock?: Locator) {
  await expect(page).toHaveScreenshot(
    name,
    clock
      ? { animations: 'disabled', mask: [clock] }
      : { animations: 'disabled' },
  )
}

async function openMatch(page: Page) {
  await page.goto('/?test=1')
  await page.evaluate((seed) => {
    window.__PIRATE__?.setSeed(seed)
  }, 1)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible({ timeout: assetTimeout })
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Match started')
}

async function sink(page: Page) {
  const ended = await page.evaluate((): Snapshot | null => {
    const hooks = window.__PIRATE__
    let state = hooks?.getState() ?? null
    for (let i = 0; i < 300 && state?.status === 'running'; i += 1) {
      hooks?.step(1000)
      state = hooks?.getState() ?? null
    }
    return state
  })
  if (!ended || ended.status !== 'ended') throw new Error('match did not end')
  await expect(
    page.getByRole('heading', { name: 'Battle complete' }),
  ).toBeVisible()
}

async function step(page: Page, ms: number) {
  await page.evaluate((amount) => {
    window.__PIRATE__?.step(amount)
  }, ms)
}
