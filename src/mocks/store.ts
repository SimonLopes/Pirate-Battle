import type { MatchRecord } from '../api/types.ts'

export const matchesStorageKey = 'pirate-battle.matches'

let memoryMatches: MatchRecord[] = []

export function readStoredMatches(): MatchRecord[] {
  if (typeof localStorage === 'undefined') return memoryMatches

  try {
    const raw = localStorage.getItem(matchesStorageKey)
    if (!raw) {
      memoryMatches = []
      return memoryMatches
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    memoryMatches = parsed.filter(isMatchRecord)
    return memoryMatches
  } catch {
    return memoryMatches
  }
}

export function writeStoredMatches(matches: MatchRecord[]): void {
  memoryMatches = matches
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(matchesStorageKey, JSON.stringify(matches))
  } catch {
    return
  }
}

export function resetStoredMatches(): void {
  memoryMatches = []
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.removeItem(matchesStorageKey)
  } catch {
    return
  }
}

export function isMatchRecord(value: unknown): value is MatchRecord {
  if (!isRecord(value) || !isRecord(value.config)) return false
  return (
    typeof value.matchId === 'string' &&
    typeof value.playerId === 'string' &&
    typeof value.playerName === 'string' &&
    isDateString(value.playedAt) &&
    isNonNegativeInteger(value.score) &&
    isNonNegativeNumber(value.durationMs) &&
    (value.endReason === 'time' || value.endReason === 'death') &&
    isNonNegativeNumber(value.config.sessionTime) &&
    isNonNegativeNumber(value.config.spawnInterval)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isNonNegativeNumber(value)
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}
