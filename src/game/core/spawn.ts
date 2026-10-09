import { spawnIntervalLimits, type GameConfig } from '../config.ts'
import { pushOut, type Collider } from './collider.ts'
import { createChaser, createShooter, type Enemy } from './enemy.ts'
import { clamp, distance } from './math.ts'
import type { Rng } from './rng.ts'
import type { Ship } from './ship.ts'

const spotAttempts = 16

export function spawnIntervalAt(config: GameConfig, time: number): number {
  const start = config.spawnInterval
  if (!config.spawnRamp.enabled) return start
  const floor = Math.max(config.spawnRamp.minInterval, spawnIntervalLimits.min)
  const target = Math.min(start, floor)
  const duration = config.sessionDuration
  const progress = duration > 0 ? clamp(time / duration, 0, 1) : 1
  const interval = start + (target - start) * progress
  return Math.max(spawnIntervalLimits.min, interval)
}

type SpawnWorld = {
  config: GameConfig
  time: number
  spawnTimer: number
  rng: Rng
  player: Ship
  enemies: Enemy[]
  colliders: readonly Collider[]
}

export function stepSpawns(world: SpawnWorld, dt: number): void {
  world.spawnTimer -= dt
  const at = world.time + dt
  while (world.spawnTimer <= 0) {
    summon(world)
    const interval = spawnIntervalAt(world.config, at)
    if (interval <= 0) {
      world.spawnTimer = 0
      return
    }
    world.spawnTimer += interval
  }
}

function summon(world: SpawnWorld): void {
  const type = pickType(world)
  const radius =
    type === 'chaser'
      ? world.config.ships.chaser.radius
      : world.config.ships.shooter.radius
  const spot = findSpot(world, radius)
  if (!spot) return
  const enemy =
    type === 'chaser'
      ? createChaser(world.config, spot.x, spot.y, world.player)
      : createShooter(world.config, spot.x, spot.y, world.player)
  world.enemies.push(enemy)
}

function pickType(world: SpawnWorld): Enemy['type'] {
  const { chaser, shooter } = world.config.spawnDistribution
  const total = chaser + shooter
  if (total <= 0) return 'chaser'
  return world.rng.next() * total < chaser ? 'chaser' : 'shooter'
}

function findSpot(
  world: SpawnWorld,
  radius: number,
): { x: number; y: number } | null {
  const { arena, minSpawnDistance } = world.config
  for (let attempt = 0; attempt < spotAttempts; attempt += 1) {
    const x = world.rng.range(radius, arena.width - radius)
    const y = world.rng.range(radius, arena.height - radius)
    if (distance({ x, y }, world.player) < minSpawnDistance) continue
    const body = { x, y, radius }
    pushOut(body, world.colliders)
    if (body.x !== x || body.y !== y) continue
    return { x, y }
  }
  return null
}
