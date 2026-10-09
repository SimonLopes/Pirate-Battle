import type { MatchRecord } from './api/types.ts'

export function parseJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    if (error instanceof SyntaxError) return null
    throw error
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isNonNegativeNumber(value)
}

export function isEndReason(value: unknown): value is 'time' | 'death' {
  return value === 'time' || value === 'death'
}

export function isMatchRecord(value: unknown): value is MatchRecord {
  if (!isRecord(value) || !isRecord(value.config)) return false
  return (
    isId(value.matchId) &&
    isId(value.playerId) &&
    typeof value.playerName === 'string' &&
    isDateString(value.playedAt) &&
    isNonNegativeInteger(value.score) &&
    isNonNegativeNumber(value.durationMs) &&
    isEndReason(value.endReason) &&
    isNonNegativeNumber(value.config.sessionTime) &&
    isNonNegativeNumber(value.config.spawnInterval)
  )
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}
