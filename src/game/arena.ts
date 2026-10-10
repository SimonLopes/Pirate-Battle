import type { Collider } from './core/collider.ts'

type ArenaPoint = {
  x: number
  y: number
}

export type ArenaMap = {
  width: number
  height: number
  tileSize: number
  shallow: number[]
  ground: number[]
  decor: {
    x: number
    y: number
    id: number
    offsetX: number
    offsetY: number
  }[]
  colliders: {
    x: number
    y: number
    width: number
    height: number
  }[]
  spawns: {
    player: ArenaPoint
  }
}

const colliderInset = 8

export function arenaColliders(map: ArenaMap): Collider[] {
  const size = map.tileSize
  return map.colliders.map((rect) => ({
    shape: 'rect' as const,
    x: rect.x * size + colliderInset,
    y: rect.y * size + colliderInset,
    width: rect.width * size - colliderInset * 2,
    height: rect.height * size - colliderInset * 2,
  }))
}
