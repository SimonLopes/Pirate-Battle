import { fromAngle, wrapAngle } from './math.ts'

export const headingUp = -Math.PI / 2

export type Ship = {
  x: number
  y: number
  heading: number
  radius: number
  hp: number
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
