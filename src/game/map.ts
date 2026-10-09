import type { Collider } from './core/collider.ts'
import type { Rng } from './core/rng.ts'

export const tileSize = 64
export const sheetColumns = 16
export const waterTile = 73

export type Island = {
  x: number
  y: number
  tiles: number[][]
  colliders: Collider[]
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

const sandRadius = 94
const sandCorner = { offset: 57, radius: 30 }
const grassRadius = 126
const grassCorner = { offset: 78, radius: 36 }

function sandIsland(x: number, y: number): Island {
  return {
    x,
    y,
    tiles: sandTiles,
    colliders: islandCircles(x, y, sandTiles, sandRadius, sandCorner),
  }
}

function grassIsland(x: number, y: number): Island {
  return {
    x,
    y,
    tiles: grassTiles,
    colliders: islandCircles(x, y, grassTiles, grassRadius, grassCorner),
  }
}

function islandCircles(
  x: number,
  y: number,
  tiles: number[][],
  radius: number,
  corner: { offset: number; radius: number },
): Collider[] {
  const center = (tileSize * tiles.length) / 2
  const spots = [
    { x: center, y: center, radius },
    {
      x: center - corner.offset,
      y: center - corner.offset,
      radius: corner.radius,
    },
    {
      x: center + corner.offset,
      y: center - corner.offset,
      radius: corner.radius,
    },
    {
      x: center - corner.offset,
      y: center + corner.offset,
      radius: corner.radius,
    },
    {
      x: center + corner.offset,
      y: center + corner.offset,
      radius: corner.radius,
    },
  ]
  return spots.map((spot) => ({
    shape: 'circle',
    x: x + spot.x,
    y: y + spot.y,
    radius: spot.radius,
  }))
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
