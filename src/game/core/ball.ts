import type { GameConfig } from '../config.ts'
import { hits, type Collider } from './collider.ts'
import { fromAngle, type Vec2 } from './math.ts'
import type { Ship } from './ship.ts'

export type BallOwner = 'player' | 'enemy'

export type Ball = {
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  owner: BallOwner
  lifetime: number
  traveled: number
}

export function launch(
  balls: Ball[],
  ship: Ship,
  stats: GameConfig['ball'],
  owner: BallOwner,
): void {
  const dir = fromAngle(ship.heading)
  balls.push(
    makeBall(
      ship.x + dir.x * ship.radius,
      ship.y + dir.y * ship.radius,
      dir,
      stats,
      owner,
    ),
  )
}

export function launchSide(
  balls: Ball[],
  ship: Ship,
  stats: GameConfig['ball'],
  spacing: number,
  side: -1 | 1,
  owner: BallOwner,
): void {
  const forward = fromAngle(ship.heading)
  const dir = fromAngle(ship.heading + (side * Math.PI) / 2)
  for (let slot = -1; slot <= 1; slot += 1) {
    const along = slot * spacing
    balls.push(
      makeBall(
        ship.x + forward.x * along + dir.x * ship.radius,
        ship.y + forward.y * along + dir.y * ship.radius,
        dir,
        stats,
        owner,
      ),
    )
  }
}

function makeBall(
  x: number,
  y: number,
  dir: Vec2,
  stats: GameConfig['ball'],
  owner: BallOwner,
): Ball {
  return {
    x,
    y,
    vx: dir.x * stats.speed,
    vy: dir.y * stats.speed,
    damage: stats.damage,
    owner,
    lifetime: stats.lifetime,
    traveled: 0,
  }
}

export function stepBalls(
  balls: Ball[],
  dt: number,
  stats: GameConfig['ball'],
  arena: GameConfig['arena'],
  colliders: readonly Collider[],
): void {
  let write = 0
  for (let read = 0; read < balls.length; read += 1) {
    const ball = balls[read]
    if (!ball) continue
    const dx = ball.vx * dt
    const dy = ball.vy * dt
    ball.x += dx
    ball.y += dy
    ball.traveled += Math.hypot(dx, dy)
    ball.lifetime -= dt
    if (ball.lifetime <= 0) continue
    if (ball.traveled > stats.range) continue
    if (
      ball.x < 0 ||
      ball.y < 0 ||
      ball.x > arena.width ||
      ball.y > arena.height
    ) {
      continue
    }
    if (hits(ball, colliders)) continue
    balls[write] = ball
    write += 1
  }
  balls.length = write
}
