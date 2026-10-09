import { spawnIntervalLimits, type GameConfig } from '../config.ts'
import { pushOut, type Collider } from './collider.ts'
import { createChaser, createShooter, type Enemy } from './enemy.ts'
import { clamp } from './math.ts'
import type { Rng } from './rng.ts'
import { hullBody, type Ship } from './ship.ts'

export type SpawnPoint = {
  x: number
  y: number
}

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
  spawns: readonly SpawnPoint[]
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
  const stats =
    type === 'chaser' ? world.config.ships.chaser : world.config.ships.shooter
  const spot = pickSpawn(world, stats.radius, stats.hullOffset)
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

export function pickSpawn(
  world: SpawnWorld,
  radius: number,
  hullOffset: number,
): SpawnPoint | null {
  const points = world.spawns
  if (points.length === 0) return null
  const start = Math.floor(world.rng.next() * points.length)
  for (let step = 0; step < points.length; step += 1) {
    const spot = points[(start + step) % points.length]
    if (!spot || blocked(world, spot, radius, hullOffset)) continue
    return spot
  }
  return null
}

function blocked(
  world: SpawnWorld,
  spot: SpawnPoint,
  radius: number,
  hullOffset: number,
): boolean {
  const heading = Math.atan2(world.player.y - spot.y, world.player.x - spot.x)
  const body = hullBody({ x: spot.x, y: spot.y, heading, radius, hullOffset })
  const ox = body.x
  const oy = body.y
  pushOut(body, world.colliders)
  if (body.x !== ox || body.y !== oy) return true
  const { arena } = world.config
  if (
    body.x < body.radius ||
    body.y < body.radius ||
    body.x > arena.width - body.radius ||
    body.y > arena.height - body.radius
  ) {
    return true
  }
  const ships = [world.player, ...world.enemies]
  for (const ship of ships) {
    const other = hullBody(ship)
    const dx = other.x - body.x
    const dy = other.y - body.y
    const reach = other.radius + body.radius
    if (dx * dx + dy * dy <= reach * reach) return true
  }
  return false
}
