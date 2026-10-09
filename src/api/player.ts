const storageKey = 'pirate-battle.player'

export const playerName = 'Captain'

let current: string | null = null

export function loadPlayerId(): string {
  if (current) return current
  const stored = readStored()
  if (stored) {
    current = stored
    return stored
  }
  current = crypto.randomUUID()
  writeStored(current)
  return current
}

function readStored(): string | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw || !isPlayerId(raw)) return null
    return raw
  } catch {
    return null
  }
}

function writeStored(id: string): void {
  try {
    localStorage.setItem(storageKey, id)
  } catch {
    return
  }
}

function isPlayerId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}
