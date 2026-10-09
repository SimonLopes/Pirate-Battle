import { loadPlayerId, playerName } from './player.ts'
import type { EndReason, MatchRecord } from './types.ts'

const storageKey = 'pirate-battle.pending'

let queue: MatchRecord[] | null = null
const sending = new Set<string>()
let flushed = false

export function createPendingMatch(input: {
  score: number
  played: number
  reason: EndReason
  sessionTime: number
  spawnInterval: number
}): MatchRecord {
  return {
    matchId: crypto.randomUUID(),
    playerId: loadPlayerId(),
    playerName,
    playedAt: new Date().toISOString(),
    score: input.score,
    durationMs: Math.round(input.played * 1000),
    endReason: input.reason,
    config: {
      sessionTime: input.sessionTime,
      spawnInterval: input.spawnInterval,
    },
  }
}

export function enqueuePending(record: MatchRecord): void {
  const current = readPending()
  if (current.some((item) => item.matchId === record.matchId)) return
  commit([...current, record])
}

export function dropPending(matchId: string): void {
  const current = readPending()
  if (!current.some((item) => item.matchId === matchId)) return
  commit(current.filter((item) => item.matchId !== matchId))
}

export function isQueued(matchId: string): boolean {
  return readPending().some((item) => item.matchId === matchId)
}

export function isSending(matchId: string): boolean {
  return sending.has(matchId)
}

export function sendPending(
  record: MatchRecord,
  mutate: (record: MatchRecord) => void,
): void {
  if (sending.has(record.matchId)) return
  sending.add(record.matchId)
  mutate(record)
}

export function settleSend(matchId: string): void {
  sending.delete(matchId)
}

export function flushPending(mutate: (record: MatchRecord) => void): void {
  if (flushed) return
  flushed = true
  for (const record of readPending()) sendPending(record, mutate)
}

function readPending(): MatchRecord[] {
  if (queue === null) queue = readStored()
  return queue
}

function commit(next: MatchRecord[]): void {
  queue = next
  try {
    localStorage.setItem(storageKey, JSON.stringify(next))
  } catch {
    return
  }
}

function readStored(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPendingRecord)
  } catch {
    return []
  }
}

function isPendingRecord(value: unknown): value is MatchRecord {
  if (!isRecord(value) || !isRecord(value.config)) return false
  return (
    isId(value.matchId) &&
    isId(value.playerId) &&
    typeof value.playerName === 'string' &&
    isDateString(value.playedAt) &&
    isScore(value.score) &&
    isDuration(value.durationMs) &&
    (value.endReason === 'time' || value.endReason === 'death') &&
    isDuration(value.config.sessionTime) &&
    isDuration(value.config.spawnInterval)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}
