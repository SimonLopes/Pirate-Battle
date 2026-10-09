import type { Island } from '../map.ts'

export type TerrainCell = {
  x: number
  y: number
  id: number
}

const sandKind = 1
const grassKind = 2

type Notch = 'se' | 'sw' | 'ne' | 'nw'

export function terrainCells(
  islands: readonly Island[],
  cols: number,
  rows: number,
): TerrainCell[] {
  if (cols <= 0 || rows <= 0) return []
  const land = new Uint8Array(cols * rows)
  const foam = new Uint8Array(cols * rows)
  stamp(land, islands, cols, rows)
  markFoam(land, foam, cols, rows)
  const cells: TerrainCell[] = []
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (foam[y * cols + x] === 0) continue
      cells.push({ x, y, id: foamId(land, foam, cols, rows, x, y) })
    }
  }
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (land[y * cols + x] === 0) continue
      cells.push({ x, y, id: landId(land, cols, rows, x, y) })
    }
  }
  return cells
}

function stamp(
  land: Uint8Array,
  islands: readonly Island[],
  cols: number,
  rows: number,
): void {
  for (const island of islands) {
    const kind = island.kind === 'grass' ? grassKind : sandKind
    const x0 = Math.max(0, island.x)
    const y0 = Math.max(0, island.y)
    const x1 = Math.min(cols, island.x + island.width)
    const y1 = Math.min(rows, island.y + island.height)
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) land[y * cols + x] = kind
    }
  }
}

function markFoam(
  land: Uint8Array,
  foam: Uint8Array,
  cols: number,
  rows: number,
): void {
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (land[y * cols + x] !== 0) continue
      if (nearLand(land, cols, rows, x, y)) foam[y * cols + x] = 1
    }
  }
}

function nearLand(
  land: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
): boolean {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      if (land[ny * cols + nx] !== 0) return true
    }
  }
  return false
}

function landId(
  land: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
): number {
  const kind = land[y * cols + x] ?? 0
  const n = isWater(land, cols, rows, x, y - 1)
  const e = isWater(land, cols, rows, x + 1, y)
  const s = isWater(land, cols, rows, x, y + 1)
  const w = isWater(land, cols, rows, x - 1, y)
  if (kind === grassKind) return grassId(land, cols, rows, x, y, n, e, s, w)
  return sandId(land, cols, rows, x, y, n, e, s, w)
}

function sandId(
  land: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  n: boolean,
  e: boolean,
  s: boolean,
  w: boolean,
): number {
  if (n && w) return 1
  if (n && e) return 3
  if (s && w) return 33
  if (s && e) return 35
  if (n) return 2
  if (s) return 34
  if (w) return 17
  if (e) return 19
  const notch = landNotch(land, cols, rows, x, y)
  if (notch === 'se') return 4
  if (notch === 'sw') return 5
  if (notch === 'ne') return 20
  if (notch === 'nw') return 21
  return sandFill(x, y)
}

function grassId(
  land: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  n: boolean,
  e: boolean,
  s: boolean,
  w: boolean,
): number {
  if (n && w) return 6
  if (n && e) return 9
  if (s && w) return 54
  if (s && e) return 57
  if (n) return isWater(land, cols, rows, x - 2, y) ? 7 : 8
  if (s) return isWater(land, cols, rows, x - 2, y) ? 55 : 56
  if (w) return isWater(land, cols, rows, x, y - 2) ? 22 : 38
  if (e) return isWater(land, cols, rows, x, y - 2) ? 25 : 41
  const notch = landNotch(land, cols, rows, x, y)
  if (notch === 'se') return 36
  if (notch === 'sw') return 37
  if (notch === 'ne') return 52
  if (notch === 'nw') return 53
  return grassFill(land, cols, rows, x, y)
}

function sandFill(x: number, y: number): number {
  const n = (x * 5 + y * 3) % 7
  if (n === 0) return 68
  if (n === 1) return 69
  return 18
}

function grassFill(
  land: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
): number {
  const underTop = isWater(land, cols, rows, x, y - 2)
  const aboveBottom = isWater(land, cols, rows, x, y + 2)
  const besideLeft = isWater(land, cols, rows, x - 2, y)
  if (underTop && besideLeft) return 23
  if (underTop) return 24
  if (aboveBottom && besideLeft) return 39
  if (aboveBottom) return 40
  if (besideLeft) return 39
  if (y & 1) return x & 1 ? 23 : 24
  return x & 1 ? 39 : 40
}

function foamId(
  land: Uint8Array,
  foam: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
): number {
  const n = isDeep(land, foam, cols, rows, x, y - 1)
  const e = isDeep(land, foam, cols, rows, x + 1, y)
  const s = isDeep(land, foam, cols, rows, x, y + 1)
  const w = isDeep(land, foam, cols, rows, x - 1, y)
  if (n && w) return 10
  if (n && e) return 12
  if (s && w) return 42
  if (s && e) return 44
  if (n) return 11
  if (s) return 43
  if (w) return 26
  if (e) return 28
  const notch = lone(
    isDeep(land, foam, cols, rows, x + 1, y + 1),
    isDeep(land, foam, cols, rows, x - 1, y + 1),
    isDeep(land, foam, cols, rows, x + 1, y - 1),
    isDeep(land, foam, cols, rows, x - 1, y - 1),
  )
  if (notch === 'se') return 58
  if (notch === 'sw') return 59
  if (notch === 'ne') return 74
  if (notch === 'nw') return 75
  return 27
}

function landNotch(
  land: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
): Notch | null {
  return lone(
    isWater(land, cols, rows, x + 1, y + 1),
    isWater(land, cols, rows, x - 1, y + 1),
    isWater(land, cols, rows, x + 1, y - 1),
    isWater(land, cols, rows, x - 1, y - 1),
  )
}

function lone(se: boolean, sw: boolean, ne: boolean, nw: boolean): Notch | null {
  if (se && !sw && !ne && !nw) return 'se'
  if (sw && !se && !ne && !nw) return 'sw'
  if (ne && !se && !sw && !nw) return 'ne'
  if (nw && !se && !sw && !ne) return 'nw'
  return null
}

function isWater(
  land: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
): boolean {
  if (x < 0 || y < 0 || x >= cols || y >= rows) return false
  return land[y * cols + x] === 0
}

function isDeep(
  land: Uint8Array,
  foam: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
): boolean {
  if (x < 0 || y < 0 || x >= cols || y >= rows) return true
  const i = y * cols + x
  return land[i] === 0 && foam[i] === 0
}
