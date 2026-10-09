import type { GameConfig } from '../config.ts'
import { overlaps, type Collider } from './collider.ts'
import { createChaser, createShooter, type Enemy } from './enemy.ts'
import { distance } from './math.ts'
import type { Rng } from './rng.ts'
import { hullBody, type Ship } from './ship.ts'

export type SpawnPoint = {
  x: number
  y: number
}

type SpawnWorld = {
  config: GameConfig
  spawnTimer: number
  rng: Rng
  player: Ship
  enemies: Enemy[]
  colliders: readonly Collider[]
}

export function stepSpawns(world: SpawnWorld, dt: number): void {
  world.spawnTimer -= dt
  while (world.spawnTimer <= 0) {
    summon(world)
    world.spawnTimer += world.config.spawnInterval
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
  const { arena, spawnArea } = world.config
  for (let tries = 0; tries < spawnArea.attempts; tries += 1) {
    const spot = {
      x: world.rng.range(0, arena.width),
      y: world.rng.range(0, arena.height),
    }
    if (isOpen(world, spot, radius, hullOffset)) return spot
  }
  return null
}

function isOpen(
  world: SpawnWorld,
  spot: SpawnPoint,
  radius: number,
  hullOffset: number,
): boolean {
  const { arena, spawnArea } = world.config
  if (distance(spot, world.player) < spawnArea.playerDistance) return false
  const heading = Math.atan2(world.player.y - spot.y, world.player.x - spot.x)
  const body = hullBody({ x: spot.x, y: spot.y, heading, radius, hullOffset })
  const reach = body.radius + spawnArea.edgeMargin
  if (
    body.x < reach ||
    body.y < reach ||
    body.x > arena.width - reach ||
    body.y > arena.height - reach
  ) {
    return false
  }
  const padded = { ...body, radius: body.radius + spawnArea.islandMargin }
  if (overlaps(padded, world.colliders)) return false
  for (const enemy of world.enemies) {
    const other = hullBody(enemy)
    const gap = other.radius + body.radius
    if ((other.x - body.x) ** 2 + (other.y - body.y) ** 2 <= gap * gap) {
      return false
    }
  }
  return true
}
