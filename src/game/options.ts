import {
  defaultConfig,
  sessionDurationLimits,
  spawnIntervalLimits,
  type GameConfig,
} from './config.ts'

const storageKey = 'pirate-battle.options'

export type PlayerOptions = {
  sessionDuration: number
  spawnInterval: number
}

export function loadOptions(): PlayerOptions {
  const fallback = {
    sessionDuration: defaultConfig.sessionDuration,
    spawnInterval: defaultConfig.spawnInterval,
  }
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!isPlayerOptions(parsed)) return fallback
    return {
      sessionDuration: parsed.sessionDuration,
      spawnInterval: parsed.spawnInterval,
    }
  } catch {
    return fallback
  }
}

export function saveOptions(options: PlayerOptions): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(options))
    return true
  } catch {
    return false
  }
}

export function configFromOptions(options: PlayerOptions): GameConfig {
  const config = structuredClone(defaultConfig)
  config.sessionDuration = options.sessionDuration
  config.spawnInterval = options.spawnInterval
  return config
}

export function sessionTimeError(text: string): string | null {
  return rangeError(text, sessionDurationLimits)
}

export function spawnTimeError(text: string): string | null {
  return rangeError(text, spawnIntervalLimits)
}

export function stepSeconds(
  text: string,
  delta: number,
  limits: { min: number; max: number },
): string {
  const value = wholeSeconds(text)
  if (value === null) {
    if (delta < 0) return String(limits.min)
    return String(limits.max)
  }
  const next = value + delta
  if (next < limits.min) return String(limits.min)
  if (next > limits.max) return String(limits.max)
  return String(next)
}

export function wholeSeconds(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isInteger(value)) return null
  return value
}

function rangeError(
  text: string,
  limits: { min: number; max: number },
): string | null {
  const value = wholeSeconds(text)
  if (value === null || value < limits.min || value > limits.max) {
    return `Informe um número inteiro de segundos de ${limits.min} a ${limits.max}.`
  }
  return null
}

function isPlayerOptions(value: unknown): value is PlayerOptions {
  if (!isRecord(value)) return false
  return (
    fits(value.sessionDuration, sessionDurationLimits) &&
    fits(value.spawnInterval, spawnIntervalLimits)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function fits(
  value: unknown,
  limits: { min: number; max: number },
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= limits.min &&
    value <= limits.max
  )
}
