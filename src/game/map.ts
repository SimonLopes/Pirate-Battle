import type { Collider } from './core/collider.ts'

export const tileSize = 64
export const sheetColumns = 16
export const waterTile = 73

export type Island = {
  x: number
  y: number
  tiles: number[][]
  collider: Collider
}

export const islands: Island[] = [
  {
    x: 256,
    y: 192,
    tiles: [
      [1, 2, 3],
      [17, 18, 19],
      [33, 34, 35],
    ],
    collider: { shape: 'circle', x: 352, y: 288, radius: 96 },
  },
  {
    x: 1504,
    y: 640,
    tiles: [
      [6, 7, 8, 9],
      [22, 23, 24, 25],
      [38, 39, 40, 41],
      [54, 55, 56, 57],
    ],
    collider: { shape: 'rect', x: 1516, y: 652, width: 232, height: 232 },
  },
]
