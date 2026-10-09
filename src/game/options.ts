import { readStorage, writeStorage } from '../storage.ts'
import { isRecord, parseJson } from '../validate.ts'
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
  fullscreenOnMobile: boolean
}

type StoredOptions = {
  sessionDuration: number
  spawnInterval: number
  fullscreenOnMobile?: boolean
}

export function loadOptions(): PlayerOptions {
  const fallback = {
    sessionDuration: defaultConfig.sessionDuration,
    spawnInterval: defaultConfig.spawnInterval,
    fullscreenOnMobile: true,
  }
  const parsed = parseJson(readStorage(storageKey))
  if (!isStoredOptions(parsed)) return fallback
  return {
    sessionDuration: parsed.sessionDuration,
    spawnInterval: parsed.spawnInterval,
    fullscreenOnMobile: parsed.fullscreenOnMobile ?? true,
  }
}

export function saveOptions(options: PlayerOptions): boolean {
  return writeStorage(storageKey, JSON.stringify(options))
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
    return `Enter a whole number of seconds from ${limits.min} to ${limits.max}.`
  }
  return null
}

function isStoredOptions(value: unknown): value is StoredOptions {
  if (!isRecord(value)) return false
  if (!fits(value.sessionDuration, sessionDurationLimits)) return false
  if (!fits(value.spawnInterval, spawnIntervalLimits)) return false
  const flag = value.fullscreenOnMobile
  return flag === undefined || typeof flag === 'boolean'
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
