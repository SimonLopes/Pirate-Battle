import type { GameConfig } from '../config.ts'
import { launch, type Ball } from './ball.ts'
import type { Collider } from './collider.ts'
import { clamp, distance, fromAngle, wrapAngle } from './math.ts'
import { hullBody, moveHull, type Ship } from './ship.ts'

export type EnemyType = 'chaser' | 'shooter'

export type Enemy =
  (Ship & { type: 'chaser' }) | (Ship & { type: 'shooter'; cooldown: number })

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
    hullOffset: stats.hullOffset,
    hp: stats.hp,
  }
}

export function createShooter(
  config: GameConfig,
  x: number,
  y: number,
  player: Ship,
): Enemy {
  const stats = config.ships.shooter
  return {
    type: 'shooter',
    x,
    y,
    heading: Math.atan2(player.y - y, player.x - x),
    radius: stats.radius,
    hullOffset: stats.hullOffset,
    hp: stats.hp,
    cooldown: 0,
  }
}

export function stepEnemies(
  enemies: Enemy[],
  player: Ship,
  balls: Ball[],
  dt: number,
  config: GameConfig,
  colliders: readonly Collider[],
): void {
  let write = 0
  for (let read = 0; read < enemies.length; read += 1) {
    const enemy = enemies[read]
    if (!enemy || enemy.hp <= 0) continue
    if (player.hp <= 0) {
      enemies[write] = enemy
      write += 1
      continue
    }
    if (enemy.type === 'chaser') {
      const stats = config.ships.chaser
      steer(enemy, player, dt, stats.turnSpeed)
      advance(enemy, dt, stats.moveSpeed)
      moveHull(enemy, colliders, config.arena)
      if (touch(enemy, player)) {
        player.hp = Math.max(0, player.hp - stats.collisionDamage)
        continue
      }
    } else {
      const stats = config.ships.shooter
      steer(enemy, player, dt, stats.turnSpeed)
      if (distance(enemy, player) > stats.attackRange) {
        advance(enemy, dt, stats.moveSpeed)
      }
      moveHull(enemy, colliders, config.arena)
      enemy.cooldown = Math.max(0, enemy.cooldown - dt)
      if (
        enemy.cooldown === 0 &&
        distance(enemy, player) <= stats.attackRange
      ) {
        launch(balls, enemy, config.ball, 'enemy')
        enemy.cooldown = stats.attackCooldown
      }
    }
    enemies[write] = enemy
    write += 1
  }
  enemies.length = write
}

function steer(
  enemy: Enemy,
  player: Ship,
  dt: number,
  turnSpeed: number,
): void {
  const aim = Math.atan2(player.y - enemy.y, player.x - enemy.x)
  const delta = wrapAngle(aim - enemy.heading)
  const limit = turnSpeed * dt
  enemy.heading = wrapAngle(enemy.heading + clamp(delta, -limit, limit))
}

function advance(enemy: Enemy, dt: number, moveSpeed: number): void {
  const dir = fromAngle(enemy.heading)
  enemy.x += dir.x * moveSpeed * dt
  enemy.y += dir.y * moveSpeed * dt
}

function touch(a: Ship, b: Ship): boolean {
  const left = hullBody(a)
  const right = hullBody(b)
  const dx = left.x - right.x
  const dy = left.y - right.y
  const reach = left.radius + right.radius
  return dx * dx + dy * dy <= reach * reach
}
