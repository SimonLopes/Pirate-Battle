import type { GameConfig } from '../config.ts'
import { keepInArena, pushOut, type Collider } from './collider.ts'
import { clamp, fromAngle, wrapAngle } from './math.ts'
import type { Ship } from './ship.ts'

export type EnemyType = 'chaser' | 'shooter'

export type Enemy = Ship & {
  type: EnemyType
}

export function createChaser(
  config: GameConfig,
  x: number,
  y: number,
  player: Ship,
): Enemy {
  const stats = config.ships.chaser
  return {
    type: 'chaser',
    x,
    y,
    heading: Math.atan2(player.y - y, player.x - x),
    radius: stats.radius,
    hp: stats.hp,
  }
}

export function stepEnemies(
  enemies: Enemy[],
  player: Ship,
  dt: number,
  config: GameConfig,
  colliders: readonly Collider[],
): void {
  const stats = config.ships.chaser
  let write = 0
  for (let read = 0; read < enemies.length; read += 1) {
    const enemy = enemies[read]
    if (!enemy) continue
    if (enemy.type === 'chaser') {
      chase(enemy, player, dt, stats.moveSpeed, stats.turnSpeed)
      pushOut(enemy, colliders)
      keepInArena(enemy, config.arena)
      if (touch(enemy, player)) {
        player.hp = Math.max(0, player.hp - stats.collisionDamage)
        continue
      }
    }
    enemies[write] = enemy
    write += 1
  }
  enemies.length = write
}

function chase(
  enemy: Enemy,
  player: Ship,
  dt: number,
  moveSpeed: number,
  turnSpeed: number,
): void {
  const aim = Math.atan2(player.y - enemy.y, player.x - enemy.x)
  const delta = wrapAngle(aim - enemy.heading)
  const limit = turnSpeed * dt
  enemy.heading = wrapAngle(enemy.heading + clamp(delta, -limit, limit))
  const dir = fromAngle(enemy.heading)
  enemy.x += dir.x * moveSpeed * dt
  enemy.y += dir.y * moveSpeed * dt
}

function touch(a: Ship, b: Ship): boolean {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const reach = a.radius + b.radius
  return dx * dx + dy * dy <= reach * reach
}
