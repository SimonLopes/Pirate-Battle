import type { Ball } from './ball.ts'
import type { Enemy } from './enemy.ts'
import type { Ship } from './ship.ts'

export function strike(balls: Ball[], player: Ship, enemies: Enemy[]): number {
  let scored = 0
  let write = 0
  for (let read = 0; read < balls.length; read += 1) {
    const ball = balls[read]
    if (!ball) continue
    if (player.hp <= 0) {
      balls[write] = ball
      write += 1
      continue
    }
    if (ball.owner === 'player') {
      const enemy = enemyAt(ball, enemies)
      if (!enemy) {
        balls[write] = ball
        write += 1
        continue
      }
      enemy.hp = Math.max(0, enemy.hp - ball.damage)
      if (enemy.hp <= 0) scored += 1
      continue
    }
    if (overlaps(ball, player)) {
      player.hp = Math.max(0, player.hp - ball.damage)
      continue
    }
    balls[write] = ball
    write += 1
  }
  balls.length = write
  removeDead(enemies)
  return scored
}

function enemyAt(ball: Ball, enemies: readonly Enemy[]): Enemy | undefined {
  let found: Enemy | undefined
  let best = Infinity
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || !overlaps(ball, enemy)) continue
    const dx = ball.x - enemy.x
    const dy = ball.y - enemy.y
    const distSq = dx * dx + dy * dy
    if (distSq >= best) continue
    best = distSq
    found = enemy
  }
  return found
}

function overlaps(ball: Ball, ship: Ship): boolean {
  const dx = ball.x - ship.x
  const dy = ball.y - ship.y
  return dx * dx + dy * dy <= ship.radius * ship.radius
}

function removeDead(enemies: Enemy[]): void {
  let write = 0
  for (let read = 0; read < enemies.length; read += 1) {
    const enemy = enemies[read]
    if (!enemy || enemy.hp <= 0) continue
    enemies[write] = enemy
    write += 1
  }
  enemies.length = write
}
