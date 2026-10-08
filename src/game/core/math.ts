export type Vec2 = {
  x: number
  y: number
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function scale(v: Vec2, factor: number): Vec2 {
  return { x: v.x * factor, y: v.y * factor }
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y)
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v)
  if (len === 0) return { x: 0, y: 0 }
  return scale(v, 1 / len)
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function angle(v: Vec2): number {
  return Math.atan2(v.y, v.x)
}

export function fromAngle(radians: number): Vec2 {
  return { x: Math.cos(radians), y: Math.sin(radians) }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function wrapAngle(radians: number): number {
  const tau = Math.PI * 2
  const wrapped = ((radians % tau) + tau) % tau
  return wrapped > Math.PI ? wrapped - tau : wrapped
}
