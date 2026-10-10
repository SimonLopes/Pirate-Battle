import { readStorage, writeStorage } from '../lib/storage.ts'
import {
  isEndReason,
  isNonNegativeInteger,
  isNonNegativeNumber,
  isRecord,
  parseJson,
} from '../lib/validate.ts'
import type { EndReason } from './core/world.ts'

const storageKey = 'pirate-battle.result'

export type MatchResult = {
  score: number
  played: number
  reason: EndReason
}

export function loadResult(): MatchResult | null {
  const parsed = parseJson(readStorage(storageKey))
  if (!isMatchResult(parsed)) return null
  return {
    score: parsed.score,
    played: parsed.played,
    reason: parsed.reason,
  }
}

export function saveResult(result: MatchResult): void {
  writeStorage(storageKey, JSON.stringify(result))
}

function isMatchResult(value: unknown): value is MatchResult {
  if (!isRecord(value)) return false
  return (
    isNonNegativeInteger(value.score) &&
    isNonNegativeNumber(value.played) &&
    isEndReason(value.reason)
  )
}
