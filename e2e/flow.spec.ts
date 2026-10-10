import { expect, test, type Page } from '@playwright/test'
import type { Snapshot } from '../src/game/testing.ts'

type Point = { x: number; y: number }

const assetTimeout = 20_000
const pendingKey = 'pirate-battle.pending'

test.beforeEach(async ({ page }) => {
  await page.goto('/?test=1')
  await page.evaluate((seed) => {
    window.__PIRATE__?.setSeed(seed)
  }, 1)
})

test.describe('match end', () => {
  test('ends by time when the clock runs out', async ({ page }) => {
    test.setTimeout(120_000)
    await saveOptions(page, '60', '10')
    await play(page)
    await defend(page)

    const result = page.getByRole('dialog', { name: 'Battle complete' })
    await expect(result).toContainText('Time up')
    await expect(result.locator('time')).toHaveText('01:00')
  })

  test('ends by death when the hull breaks', async ({ page }) => {
    await play(page)
    const ended = await sink(page)

    expect(ended.endReason).toBe('death')
    expect(ended.player.hp).toBe(0)
    await expect(
      page.getByRole('dialog', { name: 'Battle complete' }),
    ).toContainText('Defeated')
  })

  test('simulation stops once the match ends', async ({ page }) => {
    await play(page)
    const frames = await page.evaluate(() => {
      const hooks = window.__PIRATE__
      let ended = hooks?.getState() ?? null
      for (let i = 0; i < 300 && ended?.status === 'running'; i += 1) {
        hooks?.step(1000)
        ended = hooks?.getState() ?? null
      }
      hooks?.step(2000)
      return { ended, later: hooks?.getState() ?? null }
    })

    expect(frames.ended?.status).toBe('ended')
    expect(frames.later).toEqual(frames.ended)
  })

  test('play again starts a clean match', async ({ page }) => {
    await play(page)
    const first = await readState(page)
    await sink(page)

    await page.getByRole('button', { name: 'Play again' }).click()
    await waitForMatch(page)

    expect(await readState(page)).toEqual(first)
    await expect(page.locator('canvas')).toHaveCount(1)
    await expect(page.locator('time')).toHaveText('2:00')
  })
})

test.describe('pause', () => {
  test.beforeEach(async ({ page }) => {
    await play(page)
    await step(page, 1500)
  })

  test('manual pause freezes the match until resume', async ({ page }) => {
    await page.keyboard.down('KeyW')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible()
    const paused = await readState(page)
    await step(page, 5000)

    expect(paused.status).toBe('paused')
    expect(await readState(page)).toEqual(paused)
    await expect(page.locator('time')).toHaveText('1:59')

    await page.getByRole('button', { name: 'Resume' }).click()
    await step(page, 500)
    await page.keyboard.up('KeyW')
    const resumed = await readState(page)

    expect(resumed.status).toBe('running')
    expect(resumed.time).toBeCloseTo(paused.time + 0.5, 2)
    expect(resumed.player.y).toBeCloseTo(paused.player.y, 0)
  })

  test('losing focus pauses the match without advancing the clock', async ({
    page,
  }) => {
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible()
    const paused = await readState(page)
    await step(page, 5000)

    expect(paused.status).toBe('paused')
    expect(await readState(page)).toEqual(paused)
    await expect(page.locator('time')).toHaveText('1:59')

    await page.getByRole('button', { name: 'Resume' }).click()
    await step(page, 500)
    expect((await readState(page)).time).toBeCloseTo(paused.time + 0.5, 2)
  })

  test('hiding the tab pauses the match without advancing the clock', async ({
    page,
  }) => {
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible()
    const paused = await readState(page)
    await step(page, 5000)

    expect(paused.status).toBe('paused')
    expect(await readState(page)).toEqual(paused)

    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden')
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect((await readState(page)).status).toBe('paused')

    await page.getByRole('button', { name: 'Resume' }).click()
    await step(page, 500)
    expect((await readState(page)).time).toBeCloseTo(paused.time + 0.5, 2)
  })
})

test.describe('result', () => {
  test('keeps the last result after refresh', async ({ page }) => {
    await play(page)
    const ended = await sink(page)
    await page.getByRole('button', { name: 'Main menu' }).click()

    const last = page.getByRole('region', { name: 'Last battle' })
    await expect(last).toContainText(`${ended.score} points`)
    await expect(last).toContainText('Defeated')

    await page.reload()
    await expect(last).toContainText(`${ended.score} points`)
    await expect(last).toContainText('Defeated')
  })

  test('an abandoned match is not recorded', async ({ page }) => {
    await play(page)
    await step(page, 2000)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Main menu' }).click()
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible()

    await play(page)
    await step(page, 2000)
    await page.reload()
    await expect(
      page.getByRole('button', { name: 'Play', exact: true }),
    ).toBeVisible()

    await expect(page.getByRole('region', { name: 'Last battle' })).toBeHidden()
    expect(
      await page.evaluate((key) => localStorage.getItem(key), pendingKey),
    ).toBeNull()
    await page.getByRole('tab', { name: 'Match History' }).click()
    await expect(
      page.getByRole('tabpanel', { name: 'Match History' }),
    ).toContainText('No battles recorded yet.')
  })
})

test.describe('navigation', () => {
  test('moves between screens repeatedly without leftover matches', async ({
    page,
  }) => {
    for (let round = 0; round < 3; round += 1) {
      await play(page)
      await expect(page.locator('canvas')).toHaveCount(1)
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Main menu' }).click()
      await expect(page.locator('canvas')).toHaveCount(0)
      expect(
        await page.evaluate(() => window.__PIRATE__?.getState() ?? null),
      ).toBeNull()

      await page.getByRole('button', { name: 'Options' }).click()
      await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible()
      await page.getByRole('button', { name: 'Back' }).click()

      await page.getByRole('tab', { name: 'Ranking' }).click()
      await expect(
        page.getByRole('tabpanel', { name: 'Ranking' }),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Main menu' }).click()
      await expect(
        page.getByRole('button', { name: 'Play', exact: true }),
      ).toBeVisible()
    }
  })
})

test.describe('touch controls', () => {
  test('sails, fires and pauses with touch controls', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'touch controls only show on the mobile project')
    await play(page)
    await expect(
      page.getByRole('group', { name: 'Touch controls' }),
    ).toBeVisible()

    const stick = page.getByRole('group', { name: 'Joystick' })
    const box = await stick.boundingBox()
    if (!box) throw new Error('joystick is missing')
    const push = {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      clientX: box.x + box.width / 2,
      clientY: box.y,
    }
    const before = await readState(page)
    await stick.dispatchEvent('pointerdown', push)
    await step(page, 500)
    await stick.dispatchEvent('pointerup', push)
    const sailed = await readState(page)

    expect(sailed.player.x).toBeCloseTo(before.player.x, 0)
    expect(sailed.player.y).toBeCloseTo(before.player.y - 90, 0)

    const fire = page.getByRole('button', { name: 'Fire forward' })
    const press = { pointerId: 2, pointerType: 'touch', isPrimary: true }
    await fire.dispatchEvent('pointerdown', press)
    await step(page, 100)
    await fire.dispatchEvent('pointerup', press)
    const fired = await readState(page)

    expect(fired.balls.filter((ball) => ball.owner === 'player')).toHaveLength(
      1,
    )

    await page.getByRole('button', { name: 'Pause', exact: true }).tap()
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible()
    expect((await readState(page)).status).toBe('paused')
  })
})

async function saveOptions(page: Page, session: string, spawn: string) {
  await page.getByRole('button', { name: 'Options' }).click()
  await page.getByRole('textbox', { name: 'Game session time' }).fill(session)
  await page.getByRole('textbox', { name: 'Enemy spawn time' }).fill(spawn)
  await page.getByRole('button', { name: 'Save' }).click()
}

async function play(page: Page) {
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await waitForMatch(page)
}

async function waitForMatch(page: Page) {
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

async function defend(page: Page) {
  await page.keyboard.down('Space')
  for (let i = 0; i < 2000; i += 1) {
    const state = await peekState(page)
    if (state?.status !== 'running') break
    const target = nearest(state)
    if (target) await aim(page, state, target)
    await step(page, 500)
  }
  await page.keyboard.up('Space')
}

async function aim(page: Page, state: Snapshot, target: Point) {
  const { player, config } = state
  const angle = Math.atan2(target.y - player.y, target.x - player.x)
  const delta = wrap(angle - player.heading)
  const turns = Math.round(
    Math.abs(delta) / (config.ships.player.turnSpeed * config.fixedDt),
  )
  if (turns === 0) return
  const key = delta < 0 ? 'KeyA' : 'KeyD'
  await page.keyboard.down(key)
  await step(page, turns * config.fixedDt * 1000)
  await page.keyboard.up(key)
}

function nearest(state: Snapshot): Point | null {
  let best: Point | null = null
  let bestGap = Infinity
  for (const enemy of state.enemies) {
    const at = {
      x: enemy.x + Math.cos(enemy.heading) * enemy.hullOffset,
      y: enemy.y + Math.sin(enemy.heading) * enemy.hullOffset,
    }
    const gap = Math.hypot(at.x - state.player.x, at.y - state.player.y)
    if (gap >= bestGap) continue
    best = at
    bestGap = gap
  }
  return best
}

function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

async function peekState(page: Page): Promise<Snapshot | null> {
  return page.evaluate(() => window.__PIRATE__?.getState() ?? null)
}

async function readState(page: Page): Promise<Snapshot> {
  const state = await peekState(page)
  if (!state) throw new Error('match state is missing')
  return state
}

async function step(page: Page, ms: number) {
  await page.evaluate((amount) => {
    window.__PIRATE__?.step(amount)
  }, ms)
}
