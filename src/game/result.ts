import type { EndReason } from './core/world.ts'

const storageKey = 'pirate-battle.result'

export type MatchResult = {
  score: number
  played: number
  reason: EndReason
}

export function loadResult(): MatchResult | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isMatchResult(parsed)) return null
    return {
      score: parsed.score,
      played: parsed.played,
      reason: parsed.reason,
    }
  } catch {
    return null
  }
}

export function saveResult(result: MatchResult): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(result))
  } catch {
    return
  }
}

function isMatchResult(value: unknown): value is MatchResult {
  if (!isRecord(value)) return false
  return (
    isScore(value.score) && isPlayed(value.played) && isReason(value.reason)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isPlayed(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isReason(value: unknown): value is EndReason {
  return value === 'time' || value === 'death'
}
