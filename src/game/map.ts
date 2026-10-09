import { defaultConfig } from './config.ts'
import type { Collider } from './core/collider.ts'
import type { Rng } from './core/rng.ts'

export const tileSize = 64

const plants = [70, 71, 72, 87, 88]
const rocks = [49, 50, 51, 65, 66, 67]
const beachProps = [81, 82, 83, 84, 85, 86]

export type IslandKind = 'sand' | 'grass'

export type Decor = {
  x: number
  y: number
  id: number
}

type Spot = {
  x: number
  y: number
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
): Island {
  return {
    x,
    y,
    width,
    height,
    kind,
    decor: [],
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

const layouts: readonly (readonly Island[])[] = [
  [
    island(2, 2, 8, 4, 'grass'),
    island(13, 2, 5, 3, 'sand'),
    island(21, 2, 4, 3, 'grass'),
    island(3, 12, 7, 4, 'sand'),
    island(16, 13, 5, 3, 'grass'),
  ],
  [
    island(2, 2, 3, 3, 'sand'),
    island(8, 2, 5, 3, 'grass'),
    island(16, 2, 3, 3, 'sand'),
    island(22, 2, 8, 4, 'grass'),
    island(4, 13, 5, 3, 'sand'),
    island(15, 13, 4, 3, 'grass'),
  ],
  [
    island(2, 2, 6, 4, 'sand'),
    island(11, 2, 4, 3, 'grass'),
    island(18, 2, 5, 3, 'sand'),
    island(8, 12, 8, 4, 'grass'),
  ],
]

const cols = Math.floor(defaultConfig.arena.width / tileSize)
const rows = Math.floor(defaultConfig.arena.height / tileSize)

for (const layout of layouts) checkLanes(layout)

export function pickLayout(rng: Rng): readonly Island[] {
  const layout = rng.pick(layouts)
  const taken = new Set<number>()
  return layout.map((spec) => ({
    x: spec.x,
    y: spec.y,
    width: spec.width,
    height: spec.height,
    kind: spec.kind,
    decor: decorate(spec, layout, taken, rng),
    colliders: spec.colliders,
  }))
}

function decorate(
  spec: Island,
  layout: readonly Island[],
  taken: Set<number>,
  rng: Rng,
): Decor[] {
  const rules = defaultConfig.islands
  const decor: Decor[] = []
  for (let y = 1; y < spec.height - 1; y += 1) {
    for (let x = 1; x < spec.width - 1; x += 1) {
      if (rng.next() >= rules.plantDensity) continue
      if (!claim(taken, spec.x + x, spec.y + y)) continue
      decor.push({ x, y, id: rng.pick(plants) })
    }
  }
  if (spec.kind === 'sand') {
    const shore: Spot[] = []
    const y = spec.height - 1
    for (let x = 1; x < spec.width - 1; x += 1) shore.push({ x, y })
    shuffle(shore, rng)
    const count = Math.min(rules.beachMax, shore.length)
    for (let i = 0; i < count; i += 1) {
      const spot = shore[i]
      if (!spot) continue
      if (!claim(taken, spec.x + spot.x, spec.y + spot.y)) continue
      decor.push({ x: spot.x, y: spot.y, id: rng.pick(beachProps) })
    }
  }
  const span = rules.rockMax - rules.rockMin + 1
  const wanted = rules.rockMin + Math.floor(rng.next() * span)
  const spots = rockSpots(spec, layout)
  shuffle(spots, rng)
  let placed = 0
  for (const spot of spots) {
    if (placed >= wanted) break
    if (!claim(taken, spot.x, spot.y)) continue
    decor.push({
      x: spot.x - spec.x,
      y: spot.y - spec.y,
      id: rng.pick(rocks),
    })
    placed += 1
  }
  return decor
}

function rockSpots(spec: Island, layout: readonly Island[]): Spot[] {
  const spots: Spot[] = []
  const add = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return
    if (layout.some((item) => covers(item, x, y))) return
    const blocked = layout.some(
      (item) =>
        item !== spec && !apart(x, y, 1, 1, item, defaultConfig.islands.gap),
    )
    if (blocked) return
    spots.push({ x, y })
  }
  for (let x = spec.x; x < spec.x + spec.width; x += 1) {
    add(x, spec.y - 1)
    add(x, spec.y + spec.height)
  }
  for (let y = spec.y; y < spec.y + spec.height; y += 1) {
    add(spec.x - 1, y)
    add(spec.x + spec.width, y)
  }
  return spots
}

function checkLanes(layout: readonly Island[]): void {
  const { margin, gap } = defaultConfig.islands
  for (let i = 0; i < layout.length; i += 1) {
    const a = layout[i]
    if (!a) continue
    const clear =
      a.x >= margin &&
      a.y >= margin &&
      a.x + a.width <= cols - margin &&
      a.y + a.height <= rows - margin
    if (!clear) throw new Error('Island leaves no edge lane')
    for (let j = i + 1; j < layout.length; j += 1) {
      const b = layout[j]
      if (!b) continue
      if (!apart(a.x, a.y, a.width, a.height, b, gap)) {
        throw new Error('Island leaves no gap')
      }
    }
  }
}

function apart(
  x: number,
  y: number,
  width: number,
  height: number,
  other: Island,
  gap: number,
): boolean {
  const dx = axisGap(x, x + width, other.x, other.x + other.width)
  const dy = axisGap(y, y + height, other.y, other.y + other.height)
  return (dx !== null && dx >= gap) || (dy !== null && dy >= gap)
}

function axisGap(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): number | null {
  if (a0 < b1 && b0 < a1) return null
  if (a0 >= b1) return a0 - b1
  return b0 - a1
}

function covers(item: Island, x: number, y: number): boolean {
  return (
    x >= item.x &&
    y >= item.y &&
    x < item.x + item.width &&
    y < item.y + item.height
  )
}

function claim(taken: Set<number>, x: number, y: number): boolean {
  const key = y * cols + x
  if (taken.has(key)) return false
  taken.add(key)
  return true
}

function shuffle<T>(items: T[], rng: Rng): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1))
    const left = items[i]
    const right = items[j]
    if (left === undefined || right === undefined) continue
    items[i] = right
    items[j] = left
  }
}
