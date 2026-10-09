import type { Collider } from './core/collider.ts'
import type { Rng } from './core/rng.ts'

export const tileSize = 64

export type IslandKind = 'sand' | 'grass'

export type Decor = {
  x: number
  y: number
  id: number
}

export type Island = {
  x: number
  y: number
  width: number
  height: number
  kind: IslandKind
  decor: readonly Decor[]
  colliders: Collider[]
}

function island(
  x: number,
  y: number,
  width: number,
  height: number,
  kind: IslandKind,
  decor: readonly Decor[],
): Island {
  return {
    x,
    y,
    width,
    height,
    kind,
    decor,
    colliders: [
      {
        shape: 'rect',
        x: x * tileSize,
        y: y * tileSize,
        width: width * tileSize,
        height: height * tileSize,
      },
    ],
  }
}

function fort(x: number, y: number): Decor[] {
  return [
    { x, y, id: 77 },
    { x: x + 1, y, id: 16 },
    { x: x + 2, y, id: 48 },
    { x: x + 3, y, id: 76 },
    { x: x + 4, y, id: 47 },
    { x: x + 5, y, id: 62 },
    { x, y: y + 1, id: 29 },
    { x: x + 1, y: y + 1, id: 13 },
    { x: x + 4, y: y + 1, id: 14 },
    { x, y: y + 2, id: 61 },
  ]
}

function ruins(x: number, y: number): Decor[] {
  return [
    { x, y, id: 90 },
    { x: x + 1, y, id: 92 },
    { x, y: y + 1, id: 89 },
    { x: x + 1, y: y + 1, id: 91 },
  ]
}

export const layouts: readonly (readonly Island[])[] = [
  [
    island(0, 0, 11, 5, 'grass', [
      { x: 1, y: 1, id: 77 },
      { x: 2, y: 1, id: 16 },
      { x: 3, y: 1, id: 48 },
      { x: 4, y: 1, id: 30 },
      { x: 5, y: 1, id: 76 },
      { x: 6, y: 1, id: 47 },
      { x: 7, y: 1, id: 62 },
      { x: 1, y: 2, id: 32 },
      { x: 2, y: 2, id: 13 },
      { x: 6, y: 2, id: 14 },
      { x: 1, y: 3, id: 60 },
      { x: 1, y: 4, id: 31 },
      { x: 8, y: 2, id: 70 },
      { x: 9, y: 2, id: 71 },
      { x: 8, y: 3, id: 72 },
      { x: 9, y: 3, id: 87 },
      { x: 6, y: 3, id: 88 },
      { x: 3, y: 4, id: 71 },
    ]),
    island(0, 5, 6, 4, 'grass', [
      { x: 1, y: 0, id: 29 },
      { x: 1, y: 1, id: 61 },
      { x: 3, y: 1, id: 70 },
      { x: 4, y: 1, id: 72 },
      { x: 2, y: 2, id: 87 },
      { x: 4, y: 2, id: 88 },
      { x: 2, y: 3, id: 82 },
      { x: 3, y: 3, id: 84 },
      { x: 4, y: 3, id: 86 },
      { x: 6, y: 1, id: 49 },
      { x: 2, y: 4, id: 50 },
    ]),
    island(26, 10, 6, 3, 'sand', [
      { x: 2, y: 1, id: 70 },
      { x: 4, y: 1, id: 88 },
      { x: -1, y: 0, id: 51 },
      { x: -1, y: 1, id: 65 },
    ]),
    island(21, 13, 11, 5, 'sand', [
      ...ruins(6, 2),
      { x: 2, y: 2, id: 72 },
      { x: 3, y: 2, id: 88 },
      { x: 9, y: 2, id: 71 },
      { x: 4, y: 3, id: 87 },
      { x: 1, y: -1, id: 66 },
      { x: 3, y: -1, id: 67 },
      { x: -1, y: 2, id: 49 },
    ]),
    island(8, 13, 5, 4, 'sand', [
      { x: 2, y: 1, id: 70 },
      { x: 3, y: 1, id: 88 },
      { x: 1, y: 2, id: 72 },
      { x: 1, y: 3, id: 81 },
      { x: 2, y: 3, id: 83 },
      { x: 3, y: 3, id: 85 },
      { x: 1, y: -1, id: 50 },
      { x: 3, y: -1, id: 51 },
      { x: 5, y: 1, id: 65 },
      { x: -1, y: 1, id: 66 },
    ]),
  ],
  [
    island(10, 0, 12, 4, 'grass', [
      ...ruins(4, 1),
      { x: 2, y: 1, id: 70 },
      { x: 8, y: 1, id: 71 },
      { x: 7, y: 2, id: 72 },
      { x: 9, y: 2, id: 87 },
      { x: 3, y: 2, id: 88 },
      { x: 2, y: 3, id: 82 },
      { x: 6, y: 3, id: 84 },
      { x: 9, y: 3, id: 86 },
      { x: 2, y: 4, id: 49 },
      { x: 8, y: 4, id: 50 },
    ]),
    island(0, 7, 5, 4, 'sand', [
      { x: 2, y: 1, id: 71 },
      { x: 1, y: 2, id: 88 },
      { x: 3, y: 1, id: 72 },
      { x: 1, y: 3, id: 81 },
      { x: 2, y: 3, id: 83 },
      { x: 5, y: 1, id: 51 },
      { x: 5, y: 2, id: 65 },
      { x: 2, y: 4, id: 66 },
      { x: 2, y: -1, id: 67 },
    ]),
    island(27, 7, 5, 4, 'grass', [
      { x: 2, y: 1, id: 70 },
      { x: 1, y: 2, id: 87 },
      { x: 3, y: 2, id: 71 },
      { x: 1, y: 3, id: 82 },
      { x: 2, y: 3, id: 86 },
      { x: -1, y: 1, id: 49 },
      { x: -1, y: 2, id: 50 },
      { x: 2, y: 4, id: 51 },
    ]),
    island(9, 14, 14, 4, 'sand', [
      ...fort(2, 1),
      { x: 9, y: 1, id: 70 },
      { x: 10, y: 1, id: 72 },
      { x: 11, y: 2, id: 88 },
      { x: 9, y: 2, id: 71 },
      { x: 4, y: 3, id: 87 },
      { x: 3, y: -1, id: 65 },
      { x: 9, y: -1, id: 66 },
      { x: 12, y: -1, id: 67 },
      { x: -1, y: 2, id: 49 },
    ]),
  ],
  [
    island(0, 0, 8, 5, 'sand', [
      { x: 2, y: 2, id: 70 },
      { x: 4, y: 2, id: 71 },
      { x: 5, y: 1, id: 88 },
      { x: 3, y: 3, id: 72 },
      { x: 2, y: 4, id: 81 },
      { x: 4, y: 4, id: 83 },
      { x: 5, y: 4, id: 85 },
      { x: 8, y: 2, id: 49 },
      { x: 8, y: 3, id: 50 },
      { x: 3, y: 5, id: 51 },
      { x: 6, y: 5, id: 65 },
    ]),
    island(22, 0, 10, 5, 'grass', [
      ...fort(2, 1),
      { x: 8, y: 2, id: 70 },
      { x: 8, y: 1, id: 87 },
      { x: 5, y: 3, id: 71 },
      { x: 8, y: 3, id: 72 },
      { x: 3, y: 4, id: 82 },
      { x: 5, y: 4, id: 84 },
      { x: 7, y: 4, id: 86 },
      { x: 4, y: 5, id: 66 },
      { x: 8, y: 5, id: 67 },
      { x: -1, y: 2, id: 49 },
    ]),
    island(14, 1, 4, 4, 'grass', [
      { x: 2, y: 2, id: 87 },
      { x: -1, y: 1, id: 50 },
      { x: 4, y: 2, id: 51 },
      { x: 1, y: -1, id: 65 },
      { x: 2, y: 4, id: 66 },
    ]),
    island(0, 13, 9, 5, 'grass', [
      ...ruins(3, 2),
      { x: 1, y: 2, id: 70 },
      { x: 6, y: 2, id: 72 },
      { x: 6, y: 3, id: 88 },
      { x: 2, y: 3, id: 71 },
      { x: 2, y: -1, id: 49 },
      { x: 6, y: -1, id: 67 },
      { x: 9, y: 2, id: 50 },
    ]),
    island(14, 14, 5, 4, 'sand', [
      { x: 2, y: 1, id: 70 },
      { x: 3, y: 2, id: 88 },
      { x: 1, y: 2, id: 72 },
      { x: 1, y: -1, id: 51 },
      { x: 3, y: -1, id: 65 },
      { x: 5, y: 1, id: 66 },
    ]),
    island(22, 13, 10, 5, 'sand', [
      { x: 3, y: 2, id: 71 },
      { x: 5, y: 2, id: 70 },
      { x: 6, y: 3, id: 87 },
      { x: 4, y: 3, id: 72 },
      { x: 2, y: -1, id: 49 },
      { x: 6, y: -1, id: 50 },
      { x: -1, y: 2, id: 67 },
    ]),
  ],
]

export function pickLayout(rng: Rng): readonly Island[] {
  return rng.pick(layouts)
}
