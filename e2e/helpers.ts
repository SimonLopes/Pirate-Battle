import { expect, type Page } from '@playwright/test'
import type { Snapshot } from '../src/game/testing.ts'

export type Point = { x: number; y: number }

export const assetTimeout = 20_000

export async function play(page: Page) {
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('canvas')).toBeVisible({ timeout: assetTimeout })
  await expect(page.locator('[aria-live="polite"]')).toHaveText('Match started')
}

export async function readState(page: Page): Promise<Snapshot> {
  const state = await page.evaluate(() => window.__PIRATE__?.getState() ?? null)
  if (!state) throw new Error('match state is missing')
  return state
}

export async function step(page: Page, ms: number) {
  await page.evaluate((amount) => {
    window.__PIRATE__?.step(amount)
  }, ms)
}

export async function aim(page: Page, state: Snapshot, target: Point) {
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

function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}
