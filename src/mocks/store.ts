import type { MatchRecord } from '../api/types.ts'
import { isMatchRecord, parseJson } from '../validate.ts'

export const matchesStorageKey = 'pirate-battle.matches'

export function readStoredMatches(): MatchRecord[] {
  const parsed = parseJson(localStorage.getItem(matchesStorageKey))
  if (!Array.isArray(parsed)) return []
  return parsed.filter(isMatchRecord)
}

export function writeStoredMatches(matches: MatchRecord[]): void {
  localStorage.setItem(matchesStorageKey, JSON.stringify(matches))
}

export function resetStoredMatches(): void {
  localStorage.removeItem(matchesStorageKey)
}
