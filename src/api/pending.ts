import { loadPlayerId } from './player.ts'
import { readStorage, removeStorage, writeStorage } from '../storage.ts'
import { isMatchRecord, parseJson } from '../validate.ts'
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
  playerName: string
}): MatchRecord {
  return {
    matchId: crypto.randomUUID(),
    playerId: loadPlayerId(),
    playerName: input.playerName,
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

export function clearPending(): void {
  queue = []
  removeStorage(storageKey)
}

function readPending(): MatchRecord[] {
  if (queue === null) queue = readStored()
  return queue
}

function commit(next: MatchRecord[]): void {
  queue = next
  writeStorage(storageKey, JSON.stringify(next))
}

function readStored(): MatchRecord[] {
  const parsed = parseJson(readStorage(storageKey))
  if (!Array.isArray(parsed)) return []
  return parsed.filter(isMatchRecord)
}
