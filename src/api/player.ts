import { readStorage, writeStorage } from '../lib/storage.ts'

const storageKey = 'pirate-battle.player'

let current: string | null = null

export function loadPlayerId(): string {
  if (current) return current
  const stored = readStored()
  if (stored) {
    current = stored
    return stored
  }
  current = crypto.randomUUID()
  writeStorage(storageKey, current)
  return current
}

function readStored(): string | null {
  const raw = readStorage(storageKey)
  if (!raw || !isPlayerId(raw)) return null
  return raw
}

function isPlayerId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}
