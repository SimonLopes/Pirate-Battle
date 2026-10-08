export type Rng = {
  next(): number
  range(min: number, max: number): number
  pick<T>(items: readonly T[]): T
}

export function createRng(seed: number): Rng {
  let state = seed | 0

  function next(): number {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  function range(min: number, max: number): number {
    return min + next() * (max - min)
  }

  function pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(next() * items.length)]
    if (item === undefined) throw new Error('Cannot pick from an empty list')
    return item
  }

  return { next, range, pick }
}
