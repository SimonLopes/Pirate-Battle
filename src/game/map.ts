import type { Collider } from './core/collider.ts'
import type { Rng } from './core/rng.ts'

export const tileSize = 64
export const sheetColumns = 16
export const waterTile = 73

export type Island = {
  x: number
  y: number
  tiles: number[][]
  collider: Collider
}

const sandTiles = [
  [1, 2, 3],
  [17, 18, 19],
  [33, 34, 35],
]

const grassTiles = [
  [6, 7, 8, 9],
  [22, 23, 24, 25],
  [38, 39, 40, 41],
  [54, 55, 56, 57],
]

const grassInset = 12

function sandIsland(x: number, y: number): Island {
  const span = tileSize * sandTiles.length
  const radius = span / 2
  return {
    x,
    y,
    tiles: sandTiles,
    collider: { shape: 'circle', x: x + radius, y: y + radius, radius },
  }
}

function grassIsland(x: number, y: number): Island {
  const span = tileSize * grassTiles.length
  const size = span - grassInset * 2
  return {
    x,
    y,
    tiles: grassTiles,
    collider: {
      shape: 'rect',
      x: x + grassInset,
      y: y + grassInset,
      width: size,
      height: size,
    },
  }
}

export const layouts: Island[][] = [
  [sandIsland(256, 192), grassIsland(1504, 640)],
  [
    grassIsland(160, 32),
    sandIsland(1700, 48),
    grassIsland(64, 800),
    sandIsland(928, 864),
  ],
  [
    sandIsland(48, 48),
    grassIsland(1728, 40),
    grassIsland(48, 832),
    sandIsland(1792, 880),
  ],
]

export function pickLayout(rng: Rng): Island[] {
  return rng.pick(layouts)
}
