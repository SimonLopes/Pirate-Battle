import { readStorage, writeStorage } from '../storage.ts'
import { isRecord, parseJson } from '../validate.ts'
import {
  defaultConfig,
  sessionDurationLimits,
  spawnIntervalLimits,
  type GameConfig,
} from './config.ts'

const storageKey = 'pirate-battle.options'
const captainNameLength = { min: 3, max: 16 }

export type PlayerOptions = {
  captainName: string
  sessionDuration: number
  spawnInterval: number
  fullscreenOnMobile: boolean
  muted: boolean
}

type StoredOptions = {
  sessionDuration: number
  spawnInterval: number
  fullscreenOnMobile?: boolean
  muted?: boolean
  captainName?: unknown
}

export function loadOptions(): PlayerOptions {
  const parsed = parseJson(readStorage(storageKey))
  const stored = isStoredOptions(parsed) ? parsed : null
  const captainName = readCaptainName(stored?.captainName) ?? createCaptainName()
  const options = {
    captainName,
    sessionDuration: stored?.sessionDuration ?? defaultConfig.sessionDuration,
    spawnInterval: stored?.spawnInterval ?? defaultConfig.spawnInterval,
    fullscreenOnMobile: stored?.fullscreenOnMobile ?? true,
    muted: stored?.muted ?? false,
  }
  if (stored?.captainName !== captainName) saveOptions(options)
  return options
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

export function captainNameError(text: string): string | null {
  const length = text.trim().length
  if (length < captainNameLength.min || length > captainNameLength.max) {
    return `Enter a name from ${captainNameLength.min} to ${captainNameLength.max} characters.`
  }
  return null
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

function readCaptainName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim()
  if (captainNameError(name)) return null
  return name
}

function createCaptainName(): string {
  const suffix = 1000 + Math.floor(Math.random() * 9000)
  return `Captain ${suffix}`
}

function isStoredOptions(value: unknown): value is StoredOptions {
  if (!isRecord(value)) return false
  if (!fits(value.sessionDuration, sessionDurationLimits)) return false
  if (!fits(value.spawnInterval, spawnIntervalLimits)) return false
  return isFlag(value.fullscreenOnMobile) && isFlag(value.muted)
}

function isFlag(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean'
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
