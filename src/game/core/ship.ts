import { keepInArena, pushOut, type Body, type Collider } from './collider.ts'
import { fromAngle, wrapAngle } from './math.ts'

export const headingUp = -Math.PI / 2

export type Ship = {
  x: number
  y: number
  heading: number
  radius: number
  hullOffset: number
  hp: number
}

export function hullBody(
  ship: Pick<Ship, 'x' | 'y' | 'heading' | 'radius' | 'hullOffset'>,
): Body {
  const dir = fromAngle(ship.heading)
  return {
    x: ship.x + dir.x * ship.hullOffset,
    y: ship.y + dir.y * ship.hullOffset,
    radius: ship.radius,
  }
}

export function moveHull(
  ship: Ship,
  colliders: readonly Collider[],
  arena: { width: number; height: number },
): void {
  const body = hullBody(ship)
  const x = body.x
  const y = body.y
  pushOut(body, colliders)
  keepInArena(body, arena)
  ship.x += body.x - x
  ship.y += body.y - y
}

export function move(
  ship: Ship,
  dt: number,
  moveSpeed: number,
  turnSpeed: number,
  turn: -1 | 0 | 1,
  thrust: -1 | 0 | 1,
): void {
  ship.heading = wrapAngle(ship.heading + turn * turnSpeed * dt)
  if (thrust === 0) return
  const dir = fromAngle(ship.heading)
  const step = thrust * moveSpeed * dt
  ship.x += dir.x * step
  ship.y += dir.y * step
}
