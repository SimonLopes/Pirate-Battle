import { expect, test, type Page } from '@playwright/test'
import type { Snapshot } from '../src/game/testing.ts'
import { aim, play, readState, step, type Point } from './helpers.ts'

type Ship = Snapshot['player']

test.beforeEach(async ({ page }) => {
  await page.goto('/?test=1')
  await page.evaluate((seed) => {
    window.__PIRATE__?.setSeed(seed)
  }, 1)
})

test.describe('cannons', () => {
  test.beforeEach(async ({ page }) => {
    await play(page)
  })

  test('front cannon fires one ball along the heading', async ({ page }) => {
    await page.keyboard.down('Space')
    await step(page, 100)
    await page.keyboard.up('Space')
    const state = await readState(page)
    const balls = playerBalls(state)
    const speed = state.config.ball.speed

    expect(balls).toHaveLength(1)
    expect(balls[0]?.vx).toBeCloseTo(Math.cos(state.player.heading) * speed, 0)
    expect(balls[0]?.vy).toBeCloseTo(Math.sin(state.player.heading) * speed, 0)
    expect(balls[0]?.y).toBeLessThan(state.player.y)
  })

  test('side cannons fire three parallel balls to each side', async ({
    page,
  }) => {
    await page.keyboard.down('KeyQ')
    await step(page, 100)
    await page.keyboard.up('KeyQ')
    await page.keyboard.down('KeyE')
    await step(page, 100)
    await page.keyboard.up('KeyE')
    const state = await readState(page)
    const speed = state.config.ball.speed
    const spacing = state.config.cannon.sideSpacing

    for (const side of [-1, 1] as const) {
      const balls = sideBalls(state, side)
      const ys = balls.map((ball) => ball.y)
      expect(balls).toHaveLength(3)
      for (const ball of balls) {
        expect(ball.vx).toBeCloseTo(side * speed, 0)
        expect(ball.vy).toBeCloseTo(0, 0)
      }
      expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(spacing * 2, 1)
    }
  })

  test('cannons wait for their cooldown before firing again', async ({
    page,
  }) => {
    await page.keyboard.down('Space')
    await step(page, 400)
    const loading = await readState(page)
    await step(page, 100)
    const reloaded = await readState(page)
    await page.keyboard.up('Space')

    expect(playerBalls(loading)).toHaveLength(1)
    expect(loading.frontCooldown).toBeGreaterThan(0)
    expect(playerBalls(reloaded)).toHaveLength(2)

    await page.keyboard.down('KeyE')
    await step(page, 100)
    const fired = await readState(page)
    await step(page, 900)
    await page.keyboard.up('KeyE')
    const side = await readState(page)
    expect(sideBalls(fired, 1)).toHaveLength(3)
    expect(side.rightCooldown).toBeGreaterThan(0)

  })
})

test.describe('enemies', () => {
  test.beforeEach(async ({ page }) => {
    await play(page)
  })

  test('a cannonball damages an enemy once and is removed', async ({
    page,
  }) => {
    const before = await closeIn(page, 400)
    await page.keyboard.down('Space')
    await step(page, before.config.fixedDt * 1000)
    await page.keyboard.up('Space')
    expect(playerBalls(await readState(page))).toHaveLength(1)

    const { next } = await stepUntil(
      page,
      (_, next) => playerBalls(next).length === 0,
    )
    const { chaser } = before.config.ships

    expect(firstChaser(next).hp).toBe(chaser.hp - before.config.ball.damage)
    expect(next.score).toBe(0)
  })

  test('destroying an enemy scores a single point', async ({ page }) => {
    let state = await closeIn(page, 450)
    await page.keyboard.down('Space')
    for (let i = 0; i < 40 && state.score === 0; i += 1) {
      await aim(page, state, hull(firstChaser(state)))
      await step(page, 100)
      state = await readState(page)
    }
    await page.keyboard.up('Space')

    expect(state.score).toBe(1)
    await step(page, 1000)
    expect((await readState(page)).score).toBe(1)
  })

  test('chaser rams the player and explodes without scoring', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const start = await readState(page)
    await step(page, 1000)
    const closer = await readState(page)

    expect(distance(closer.player, hull(firstChaser(closer)))).toBeLessThan(
      distance(start.player, hull(firstChaser(start))),
    )

    const { prev, next } = await stepUntil(
      page,
      (prev, next) => chasers(next) < chasers(prev),
    )

    expect(prev.player.hp - next.player.hp).toBeGreaterThanOrEqual(
      start.config.ships.chaser.collisionDamage,
    )
    expect(next.score).toBe(0)
  })

  test('shooter fires when the player is in range', async ({ page }) => {
    expect(enemyBalls(await readState(page))).toHaveLength(0)

    const { next } = await stepUntil(
      page,
      (_, next) => enemyBalls(next).length > 0,
    )
    const gaps = next.enemies
      .filter((enemy) => enemy.type === 'shooter')
      .map((shooter) => distance(shooter, next.player))

    expect(Math.min(...gaps)).toBeLessThanOrEqual(
      next.config.ships.shooter.attackRange,
    )
  })
})

test.describe('spawns', () => {
  test('enemies spawn on the configured interval', async ({ page }) => {
    await page.getByRole('button', { name: 'Options' }).click()
    await page.getByRole('textbox', { name: 'Enemy spawn time' }).fill('2')
    await page.getByRole('button', { name: 'Save' }).click()
    await play(page)

    const start = await readState(page)
    await step(page, 1900)
    const waiting = await readState(page)
    await step(page, 200)
    const spawned = await readState(page)

    expect(start.config.spawnInterval).toBe(2)
    expect(waiting.enemies).toHaveLength(start.enemies.length)
    expect(spawned.enemies).toHaveLength(start.enemies.length + 1)
    expect(spawned.spawnTimer).toBeCloseTo(1.9, 1)
  })
})

async function closeIn(page: Page, range: number): Promise<Snapshot> {
  for (let i = 0; i < 60; i += 1) {
    const state = await readState(page)
    const target = hull(firstChaser(state))
    await aim(page, state, target)
    if (distance(state.player, target) < range) return readState(page)
    await step(page, 100)
  }
  throw new Error('chaser never came in range')
}

async function stepUntil(
  page: Page,
  done: (prev: Snapshot, next: Snapshot) => boolean,
): Promise<{ prev: Snapshot; next: Snapshot }> {
  let prev = await readState(page)
  for (let i = 0; i < 150; i += 1) {
    await step(page, 100)
    const next = await readState(page)
    if (done(prev, next)) return { prev, next }
    if (next.status !== 'running') break
    prev = next
  }
  throw new Error('condition was never met')
}

function firstChaser(state: Snapshot): Ship {
  const chaser = state.enemies.find((enemy) => enemy.type === 'chaser')
  if (!chaser) throw new Error('no chaser in the arena')
  return chaser
}

function chasers(state: Snapshot): number {
  return state.enemies.filter((enemy) => enemy.type === 'chaser').length
}

function playerBalls(state: Snapshot) {
  return state.balls.filter((ball) => ball.owner === 'player')
}

function enemyBalls(state: Snapshot) {
  return state.balls.filter((ball) => ball.owner === 'enemy')
}

function sideBalls(state: Snapshot, side: -1 | 1) {
  return playerBalls(state).filter((ball) => ball.vx * side > Math.abs(ball.vy))
}

function hull(ship: Ship): Point {
  return {
    x: ship.x + Math.cos(ship.heading) * ship.hullOffset,
    y: ship.y + Math.sin(ship.heading) * ship.hullOffset,
  }
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
