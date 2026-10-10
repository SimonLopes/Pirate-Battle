import { expect, test, type Page } from '@playwright/test'
import type { Snapshot } from '../src/game/testing.ts'
import { assetTimeout, play, readState, step } from './helpers.ts'
import { defaultConfig } from '../src/game/config.ts'

const spawn = { x: 1056, y: 608 }
const headingUp = -Math.PI / 2

test.describe('asset loading', () => {
  test('retries after an asset request fails', async ({ page }) => {
    let failArena = true
    let releaseFailure: (() => void) | undefined
    const holdFailure = new Promise<void>((resolve) => {
      releaseFailure = resolve
    })

    await page
      .context()
      .route(/\/assets\/maps\/arena\.json$/, async (route) => {
        if (!failArena) {
          await route.continue()
          return
        }
        await holdFailure
        await route.abort()
      })

    await page.goto('/?test=1')
    await page.getByRole('button', { name: 'Play', exact: true }).click()
    await expect(
      page.getByRole('progressbar', { name: 'Loading', exact: true }),
    ).toBeVisible()

    releaseFailure?.()
    await expect(page.getByRole('alert')).toHaveText(
      'Could not load the game assets.',
    )
    await expect(
      page.getByRole('heading', { name: 'Loading failed' }),
    ).toBeVisible()

    failArena = false
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.locator('canvas')).toBeVisible({ timeout: assetTimeout })
    await expect(page.locator('[aria-live="polite"]')).toHaveText(
      'Match started',
    )
  })
})

test.describe('sailing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?test=1')
    await page.evaluate((seed) => {
      window.__PIRATE__?.setSeed(seed)
    }, 1)
    await play(page)
  })

  test('starts a match at the spawn', async ({ page }) => {
    const state = await readState(page)
    expect(state.status).toBe('running')
    expect(state.score).toBe(0)
    expect(state.time).toBe(0)
    expect(state.player.hp).toBe(defaultConfig.ships.player.hp)
    expect(state.player.x).toBeCloseTo(spawn.x, 0)
    expect(state.player.y).toBeCloseTo(spawn.y, 0)
    expect(state.player.heading).toBeCloseTo(headingUp, 2)
    await expect(page.locator('time')).toHaveText('1:30')
  })

  test('sails forward while W is held', async ({ page }) => {
    const before = await readState(page)
    await page.keyboard.down('KeyW')
    await step(page, 500)
    await page.keyboard.up('KeyW')
    const after = await readState(page)

    expect(after.status).toBe('running')
    expect(after.time).toBeCloseTo(0.5, 2)
    expect(after.player.heading).toBeCloseTo(before.player.heading, 2)
    expect(after.player.x).toBeCloseTo(before.player.x, 0)
    expect(after.player.y).toBeCloseTo(before.player.y - 90, 0)
  })

  test('turns left and right from the keyboard', async ({ page }) => {
    const before = await readState(page)
    await page.keyboard.down('KeyA')
    await step(page, 500)
    await page.keyboard.up('KeyA')
    const left = await readState(page)

    expect(left.player.heading).toBeCloseTo(before.player.heading - 1, 2)
    expect(left.player.x).toBeCloseTo(before.player.x, 0)
    expect(left.player.y).toBeCloseTo(before.player.y, 0)

    await page.keyboard.down('KeyD')
    await step(page, 500)
    await page.keyboard.up('KeyD')
    const right = await readState(page)

    expect(right.player.heading).toBeCloseTo(before.player.heading, 2)
    expect(right.player.x).toBeCloseTo(before.player.x, 0)
    expect(right.player.y).toBeCloseTo(before.player.y, 0)
  })

  test('stops at the north edge of the arena', async ({ page }) => {
    await page.keyboard.down('KeyW')
    const atEdge = await sailUntil(page, (prev, next) => halted(prev, next))
    await step(page, 400)
    const still = await readState(page)
    await page.keyboard.up('KeyW')

    expect(still.status).toBe('running')
    expect(still.player.y).toBeCloseTo(atEdge.player.y, 0)
    expect(still.player.y).toBeCloseTo(55, 0)
    expect(still.player.x).toBeCloseTo(spawn.x, 0)
  })

  test('stops against an island while sailing west', async ({ page }) => {
    await page.keyboard.down('KeyA')
    await step(page, 784)
    await page.keyboard.up('KeyA')
    const turned = await readState(page)
    expect(turned.player.heading).toBeCloseTo(headingUp - 47 / 30, 3)

    await page.keyboard.down('KeyW')
    const against = await sailUntil(page, (prev, next) => halted(prev, next))
    await step(page, 400)
    const still = await readState(page)
    await page.keyboard.up('KeyW')

    expect(still.status).toBe('running')
    expect(still.player.x).toBeCloseTo(against.player.x, 0)
    expect(still.player.y).toBeCloseTo(against.player.y, 0)
    expect(still.player.x).toBeGreaterThan(320)
    expect(still.player.x).toBeLessThan(450)
    expect(still.player.y).toBeGreaterThan(560)
    expect(still.player.y).toBeLessThan(660)
  })
})

function halted(prev: Snapshot, next: Snapshot): boolean {
  return (
    Math.abs(next.player.x - prev.player.x) < 0.5 &&
    Math.abs(next.player.y - prev.player.y) < 0.5
  )
}

async function sailUntil(
  page: Page,
  done: (prev: Snapshot, next: Snapshot) => boolean,
): Promise<Snapshot> {
  let prev = await readState(page)
  for (let i = 0; i < 40; i += 1) {
    await step(page, 200)
    const next = await readState(page)
    if (next.status !== 'running') return next
    if (done(prev, next)) return next
    prev = next
  }
  return prev
}
