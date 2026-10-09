import type { Ball } from './ball.ts'
import type { Enemy } from './enemy.ts'
import { hullBody, type Ship } from './ship.ts'

export function strike(
  balls: Ball[],
  player: Ship,
  enemies: Enemy[],
  ballRadius: number,
): number {
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
      const enemy = enemyAt(ball, enemies, ballRadius)
      if (!enemy) {
        balls[write] = ball
        write += 1
        continue
      }
      enemy.hp = Math.max(0, enemy.hp - ball.damage)
      if (enemy.hp <= 0) scored += 1
      continue
    }
    if (overlaps(ball, player, ballRadius)) {
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

function enemyAt(
  ball: Ball,
  enemies: readonly Enemy[],
  ballRadius: number,
): Enemy | undefined {
  let found: Enemy | undefined
  let best = Infinity
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || !overlaps(ball, enemy, ballRadius)) continue
    const hull = hullBody(enemy)
    const dx = ball.x - hull.x
    const dy = ball.y - hull.y
    const distSq = dx * dx + dy * dy
    if (distSq >= best) continue
    best = distSq
    found = enemy
  }
  return found
}

function overlaps(ball: Ball, ship: Ship, ballRadius: number): boolean {
  const bow = hullBody(ship)
  const axisX = bow.x - ship.x
  const axisY = bow.y - ship.y
  const lenSq = axisX * axisX + axisY * axisY
  let along = 0
  if (lenSq > 0) {
    along = ((ball.x - ship.x) * axisX + (ball.y - ship.y) * axisY) / lenSq
    along = Math.min(1, Math.max(-1, along))
  }
  const nearX = ship.x + axisX * along
  const nearY = ship.y + axisY * along
  const dx = ball.x - nearX
  const dy = ball.y - nearY
  const reach = bow.radius + ballRadius
  return dx * dx + dy * dy <= reach * reach
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
