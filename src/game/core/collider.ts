import { clamp, length, scale, type Vec2 } from './math.ts'

export type Collider =
  | { shape: 'circle'; x: number; y: number; radius: number }
  | { shape: 'rect'; x: number; y: number; width: number; height: number }

export type Body = {
  x: number
  y: number
  radius: number
}

export function pushOut(body: Body, colliders: readonly Collider[]): void {
  for (const collider of colliders) {
    if (collider.shape === 'circle') pushCircle(body, collider)
    else pushRect(body, collider)
  }
}

export function keepInArena(
  body: Body,
  arena: { width: number; height: number },
): void {
  body.x = clamp(body.x, body.radius, arena.width - body.radius)
  body.y = clamp(body.y, body.radius, arena.height - body.radius)
}

export function hits(point: Vec2, colliders: readonly Collider[]): boolean {
  for (const collider of colliders) {
    if (collider.shape === 'circle') {
      const dx = point.x - collider.x
      const dy = point.y - collider.y
      if (dx * dx + dy * dy <= collider.radius * collider.radius) return true
      continue
    }
    if (
      point.x >= collider.x &&
      point.y >= collider.y &&
      point.x <= collider.x + collider.width &&
      point.y <= collider.y + collider.height
    ) {
      return true
    }
  }
  return false
}

function pushCircle(
  body: Body,
  circle: { x: number; y: number; radius: number },
): void {
  const delta = { x: body.x - circle.x, y: body.y - circle.y }
  const dist = length(delta)
  const minDist = body.radius + circle.radius
  if (dist >= minDist) return
  if (dist === 0) {
    body.x += minDist
    return
  }
  const push = scale(delta, (minDist - dist) / dist)
  body.x += push.x
  body.y += push.y
}

function pushRect(
  body: Body,
  rect: { x: number; y: number; width: number; height: number },
): void {
  const left = rect.x
  const top = rect.y
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height
  const nearestX = clamp(body.x, left, right)
  const nearestY = clamp(body.y, top, bottom)
  const dx = body.x - nearestX
  const dy = body.y - nearestY
  const distSq = dx * dx + dy * dy
  if (distSq > body.radius * body.radius) return

  if (distSq > 0) {
    const dist = Math.sqrt(distSq)
    const overlap = (body.radius - dist) / dist
    body.x += dx * overlap
    body.y += dy * overlap
    return
  }

  const toLeft = body.x - left
  const toRight = right - body.x
  const toTop = body.y - top
  const toBottom = bottom - body.y
  const nearest = Math.min(toLeft, toRight, toTop, toBottom)
  if (nearest === toLeft) body.x = left - body.radius
  else if (nearest === toRight) body.x = right + body.radius
  else if (nearest === toTop) body.y = top - body.radius
  else body.y = bottom + body.radius
}
