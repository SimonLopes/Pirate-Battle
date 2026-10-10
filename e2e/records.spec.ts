import { expect, test, type Page } from '@playwright/test'
import type { Snapshot } from '../src/game/testing.ts'

const assetTimeout = 20_000
const pendingKey = 'pirate-battle.pending'
const matchesKey = 'pirate-battle.matches'

test.describe('ranking and history queries', () => {
  test('pages through ranking and history', async ({ page }) => {
    await page.goto('/?scenario=many-pages')
    await page.getByRole('tab', { name: 'Ranking' }).click()
    const ranking = page.getByRole('tabpanel', { name: 'Ranking' })

    await expect(ranking.locator('tbody tr')).toHaveCount(5)
    await expect(ranking.getByText('Page 1 of 10')).toBeVisible()
    await expect(
      ranking.getByRole('button', { name: 'Previous page' }),
    ).toBeDisabled()
    await expect(ranking.locator('.ranking-rank').first()).toHaveText('01')

    await ranking.getByRole('button', { name: 'Next page' }).click()
    await expect(ranking.getByText('Page 2 of 10')).toBeVisible()
    await expect(ranking.locator('.ranking-rank').first()).toHaveText('06')

    await page.getByRole('tab', { name: 'Match History' }).click()
    const history = page.getByRole('tabpanel', { name: 'Match History' })

    await expect(history.locator('tbody tr')).toHaveCount(5)
    await expect(history.getByText('Page 1 of 8')).toBeVisible()
    await expect(history).toContainText('Demo Captain')

    await history.getByRole('button', { name: 'Next page' }).click()
    await expect(history.getByText('Page 2 of 8')).toBeVisible()
    await expect(history.locator('tbody tr')).toHaveCount(5)
  })

  test('shows a loading state while the ranking is on its way', async ({
    page,
  }) => {
    await page.goto('/?scenario=slow')
    await page.getByRole('tab', { name: 'Ranking' }).click()
    const panel = page.getByRole('tabpanel', { name: 'Ranking' })

    await expect(panel.getByRole('status')).toHaveText('Loading ranking…')
    await expect(panel.locator('tbody tr')).toHaveCount(5)
    await expect(panel.getByRole('status')).toHaveText('')
  })

  test('shows empty ranking and history', async ({ page }) => {
    await page.goto('/?scenario=empty')
    await page.getByRole('tab', { name: 'Ranking' }).click()
    await expect(page.getByRole('tabpanel', { name: 'Ranking' })).toContainText(
      'No battles recorded with these settings yet.',
    )

    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(
      page.getByRole('tabpanel', { name: 'Match History' }),
    ).toContainText('No battles recorded yet.')
  })

  for (const { scenario, tab, name } of [
    { scenario: 'ranking-fail', tab: 'Ranking', name: 'ranking' },
    { scenario: 'history-fail', tab: 'Match History', name: 'match history' },
  ]) {
    test(`shows an error, retries and recovers the ${name}`, async ({
      page,
    }) => {
      await page.goto(`/?scenario=${scenario}`)
      await page.getByRole('tab', { name: tab }).click()
      const panel = page.getByRole('tabpanel', { name: tab })
      const table = panel.locator('.ranking')
      const alert = panel.getByRole('alert')

      await expect(alert).toContainText(`Could not load the ${name}.`, {
        timeout: 10_000,
      })

      await alert.getByRole('button', { name: 'Retry' }).click()
      await expect(table).toHaveAttribute('aria-busy', 'true')
      await expect(table).toHaveAttribute('aria-busy', 'false', {
        timeout: 10_000,
      })
      await expect(alert).toBeVisible()

      await page.getByRole('button', { name: 'Main menu' }).click()
      await selectScenario(page, 'success')
      await page.getByRole('tab', { name: tab }).click()
      await expect(alert).toBeHidden()
      await expect(table).toHaveAttribute('aria-busy', 'false')
    })
  }

  test('a late response never replaces the page on screen', async ({
    page,
  }) => {
    await page.goto('/?scenario=out-of-order')
    await page.getByRole('tab', { name: 'Ranking' }).click()
    const panel = page.getByRole('tabpanel', { name: 'Ranking' })
    const top = panel.locator('tbody tr').first()

    await expect(top).toContainText('Blackbeard')
    await panel.getByRole('button', { name: 'Next page' }).click()
    await expect(panel.getByText('Page 2 of 3')).toBeVisible()
    await expect(top).toContainText("Grace O'Malley")

    await panel.getByRole('button', { name: 'Next page' }).click()
    await panel.getByRole('button', { name: 'Previous page' }).click()
    await expect(panel.getByText('Page 2 of 3')).toBeVisible()
    await page.waitForTimeout(2000)

    await expect(panel.getByText('Page 2 of 3')).toBeVisible()
    await expect(top).toContainText("Grace O'Malley")
  })
})

test.describe('match records', () => {
  test('a finished match shows up in ranking and history', async ({ page }) => {
    await page.goto('/?test=1&scenario=success')
    await saveOptions(page)
    await play(page)
    const ended = await sink(page)
    await expect(page.getByText('Record saved')).toBeVisible()
    await page.getByRole('button', { name: 'Main menu' }).click()

    await page.getByRole('tab', { name: 'Match History' }).click()
    const history = page.getByRole('tabpanel', { name: 'Match History' })
    await expect(history.locator('tbody tr')).toHaveCount(1)
    await expect(history.locator('.ranking-score')).toHaveText(
      String(ended.score),
    )
    await expect(history.locator('tbody tr')).toContainText('Defeated')

    await page.getByRole('tab', { name: 'Ranking' }).click()
    const ranking = page.getByRole('tabpanel', { name: 'Ranking' })
    await expect(ranking.locator('tbody tr')).toHaveCount(1)
    await expect(ranking.locator('.ranking-score')).toHaveText(
      String(ended.score),
    )
    await expect(ranking.locator('tbody tr')).toContainText('Red Anne')
    await expect(ranking.locator('tbody tr')).toContainText('You')
  })

  test('a pending record is sent after refresh', async ({ page }) => {
    await page.goto('/?test=1&scenario=offline-on-finish')
    await saveOptions(page)
    await play(page)
    await sink(page)
    await expect(page.getByText('Save failed')).toBeVisible()
    expect(await storedCount(page, pendingKey)).toBe(1)

    await page.getByRole('button', { name: 'Main menu' }).click()
    await selectScenario(page, 'success')
    await page.reload()

    await expect.poll(() => storedCount(page, pendingKey)).toBe(0)
    expect(await storedCount(page, matchesKey)).toBe(1)
    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(
      page.getByRole('tabpanel', { name: 'Match History' }).locator('tbody tr'),
    ).toHaveCount(1)
  })

  test('retrying after a save timeout keeps a single record', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.goto('/?test=1&scenario=timeout-after-save')
    await saveOptions(page)
    await play(page)
    await sink(page)

    await expect(page.getByText('Save failed')).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.getByText('Record saved')).toBeVisible()
    expect(await storedCount(page, matchesKey)).toBe(1)
    expect(await storedCount(page, pendingKey)).toBe(0)

    await page.getByRole('button', { name: 'Main menu' }).click()
    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(
      page.getByRole('tabpanel', { name: 'Match History' }).locator('tbody tr'),
    ).toHaveCount(1)
    await page.getByRole('tab', { name: 'Ranking' }).click()
    await expect(
      page.getByRole('tabpanel', { name: 'Ranking' }).locator('tbody tr'),
    ).toHaveCount(1)
  })
})

async function saveOptions(page: Page) {
  await page.getByRole('button', { name: 'Options' }).click()
  await page.getByRole('textbox', { name: 'Captain name' }).fill('Red Anne')
  await page.getByRole('textbox', { name: 'Game session time' }).fill('90')
  await page.getByRole('textbox', { name: 'Enemy spawn time' }).fill('2')
  await page.getByRole('button', { name: 'Save' }).click()
}

async function selectScenario(page: Page, scenario: string) {
  await page.locator('.network-debug summary').click()
  await page.getByRole('combobox', { name: 'Scenario' }).selectOption(scenario)
}

async function play(page: Page) {
  await page.evaluate((seed) => {
    window.__PIRATE__?.setSeed(seed)
  }, 1)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible({ timeout: assetTimeout })
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Match started')
}

async function sink(page: Page): Promise<Snapshot> {
  const ended = await page.evaluate(() => {
    const hooks = window.__PIRATE__
    let state = hooks?.getState() ?? null
    for (let i = 0; i < 300 && state?.status === 'running'; i += 1) {
      hooks?.step(1000)
      state = hooks?.getState() ?? null
    }
    return state
  })
  if (!ended) throw new Error('match state is missing')
  await expect(
    page.getByRole('heading', { name: 'Battle complete' }),
  ).toBeVisible()
  return ended
}

async function storedCount(page: Page, key: string): Promise<number> {
  return page.evaluate((storageKey) => {
    const list: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(list) ? list.length : 0
  }, key)
}
