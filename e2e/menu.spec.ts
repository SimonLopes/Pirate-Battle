import { expect, test, type Page } from '@playwright/test'

const optionsKey = 'pirate-battle.options'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible()
})

test.describe('menu navigation', () => {
  test('opens options and returns to the main menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Options' }).click()
    await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: 'Game session time' }),
    ).toBeVisible()
    await expect(
      page.getByRole('textbox', { name: 'Enemy spawn time' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Back' }).click()
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Options' })).toBeHidden()
  })

  test('opens ranking and returns to the main menu', async ({ page }) => {
    await page.getByRole('tab', { name: 'Ranking' }).click()
    await expect(
      page.getByRole('heading', { name: "Captain's log" }),
    ).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Ranking' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByRole('tabpanel', { name: 'Ranking' })).toBeVisible()

    await page.getByRole('button', { name: 'Main menu' }).click()
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible()
  })

  test('opens match history and returns to the main menu', async ({ page }) => {
    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(
      page.getByRole('heading', { name: "Captain's log" }),
    ).toBeVisible()
    await expect(
      page.getByRole('tab', { name: 'Match History' }),
    ).toHaveAttribute('aria-selected', 'true')
    await expect(
      page.getByRole('tabpanel', { name: 'Match History' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Main menu' }).click()
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible()
  })

  test('moves between ranking and match history with the arrow keys', async ({
    page,
  }) => {
    await page.getByRole('tab', { name: 'Ranking' }).click()
    await page.keyboard.press('ArrowRight')
    await expect(
      page.getByRole('tab', { name: 'Match History' }),
    ).toHaveAttribute('aria-selected', 'true')
    await expect(
      page.getByRole('tabpanel', { name: 'Match History' }),
    ).toBeVisible()

    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('tab', { name: 'Ranking' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page.getByRole('tabpanel', { name: 'Ranking' })).toBeVisible()
  })

  test('opens how to play and closes the dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'How to play' }).click()
    const dialog = page.getByRole('dialog', { name: 'How to play' })
    await expect(
      dialog.getByRole('heading', { name: 'Keyboard' }),
    ).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Touch' })).toBeVisible()

    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible()
  })
})

test.describe('options validation', () => {
  test('rejects a captain name outside 3 to 16 characters', async ({
    page,
  }) => {
    const before = await storedOptions(page)
    await openOptions(page)

    for (const name of ['Al', 'Captain With A Very Long Name']) {
      await page.getByRole('textbox', { name: 'Captain name' }).fill(name)
      await saveOptions(page)
      await expect(page.getByRole('alert')).toHaveText(
        'Enter a name from 3 to 16 characters.',
      )
    }

    await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()
    expect(await storedOptions(page)).toBe(before)
  })

  test('rejects a game session time outside 60 to 180 seconds', async ({
    page,
  }) => {
    const before = await storedOptions(page)
    await openOptions(page)

    for (const value of ['59', '181', '90.5']) {
      await page.getByRole('textbox', { name: 'Game session time' }).fill(value)
      await saveOptions(page)
      await expect(page.getByRole('alert')).toHaveText(
        'Enter a whole number of seconds from 60 to 180.',
      )
    }

    expect(await storedOptions(page)).toBe(before)
  })

  test('rejects an enemy spawn time outside 2 to 10 seconds', async ({
    page,
  }) => {
    const before = await storedOptions(page)
    await openOptions(page)

    for (const value of ['1', '11', '2.5']) {
      await page.getByRole('textbox', { name: 'Enemy spawn time' }).fill(value)
      await saveOptions(page)
      await expect(page.getByRole('alert')).toHaveText(
        'Enter a whole number of seconds from 2 to 10.',
      )
    }

    expect(await storedOptions(page)).toBe(before)
  })
})

test.describe('options persistence', () => {
  test('keeps saved options after refresh', async ({ page }) => {
    await openOptions(page)
    await page.getByRole('textbox', { name: 'Captain name' }).fill('Red Anne')
    await page.getByRole('textbox', { name: 'Game session time' }).fill('90')
    await page.getByRole('textbox', { name: 'Enemy spawn time' }).fill('5')
    await page.getByRole('checkbox', { name: 'Fullscreen on mobile' }).uncheck()
    await saveOptions(page)

    await expect(page.locator('.menu-captain')).toContainText('Red Anne')
    await page.reload()
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible()
    await expect(page.locator('.menu-captain')).toContainText('Red Anne')

    await openOptions(page)
    await expect(
      page.getByRole('textbox', { name: 'Captain name' }),
    ).toHaveValue('Red Anne')
    await expect(
      page.getByRole('textbox', { name: 'Game session time' }),
    ).toHaveValue('90')
    await expect(
      page.getByRole('textbox', { name: 'Enemy spawn time' }),
    ).toHaveValue('5')
    await expect(
      page.getByRole('checkbox', { name: 'Fullscreen on mobile' }),
    ).not.toBeChecked()
  })
})

async function openOptions(page: Page) {
  await page.getByRole('button', { name: 'Options' }).click()
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()
}

async function saveOptions(page: Page) {
  await page.getByRole('button', { name: 'Save' }).click()
}

async function storedOptions(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), optionsKey)
}
