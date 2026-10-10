import type { World } from './core/world.ts'

export type Snapshot = Omit<World, 'rng' | 'cueRng' | 'cues'>

type TestHooks = {
  getState(): Snapshot | null
  setSeed(seed: number): void
  step(ms: number): void
}

type Target = {
  world: World
  advance(ms: number): void
}

declare global {
  interface Window {
    __PIRATE__?: TestHooks
  }
}

export const isTestMode =
  new URLSearchParams(window.location.search).get('test') === '1'

let seed: number | null = null
let target: Target | null = null

export function matchSeed(): number {
  return seed ?? Date.now()
}

export function track(next: Target): void {
  if (isTestMode) target = next
}

export function untrack(done: Target): void {
  if (target === done) target = null
}

export function installTestHooks(): void {
  if (!isTestMode) return
  window.__PIRATE__ = {
    getState() {
      return target ? snapshot(target.world) : null
    },
    setSeed(next) {
      seed = next
    },
    step(ms) {
      target?.advance(ms)
    },
  }
}

function snapshot(world: World): Snapshot {
  return structuredClone({
    config: world.config,
    time: world.time,
    score: world.score,
    status: world.status,
    endReason: world.endReason,
    colliders: world.colliders,
    player: world.player,
    enemies: world.enemies,
    balls: world.balls,
    frontCooldown: world.frontCooldown,
    leftCooldown: world.leftCooldown,
    rightCooldown: world.rightCooldown,
    spawnTimer: world.spawnTimer,
  })
}
