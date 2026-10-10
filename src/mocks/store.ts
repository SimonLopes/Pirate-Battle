import type { MatchRecord } from '../api/types.ts'
import { readStorage, removeStorage, writeStorage } from '../lib/storage.ts'
import { isMatchRecord, parseJson } from '../lib/validate.ts'

export const matchesStorageKey = 'pirate-battle.matches'

let matches: MatchRecord[] | null = null

export function readStoredMatches(): MatchRecord[] {
  if (matches === null) matches = readStored()
  return matches
}

export function writeStoredMatches(next: MatchRecord[]): void {
  matches = next
  writeStorage(matchesStorageKey, JSON.stringify(next))
}

export function resetStoredMatches(): void {
  matches = []
  removeStorage(matchesStorageKey)
}

function readStored(): MatchRecord[] {
  const parsed = parseJson(readStorage(matchesStorageKey))
  if (!Array.isArray(parsed)) return []
  return parsed.filter(isMatchRecord)
}
