import { isRecord, parseJson } from '../validate.ts'

export const networkScenarios = [
  'success',
  'empty',
  'many-pages',
  'slow',
  'jitter',
  'out-of-order',
  'timeout',
  'network-error',
  'server-error',
  'client-error',
  'ranking-fail',
  'history-fail',
  'timeout-after-save',
  'offline-on-finish',
] as const

export type NetworkScenario = (typeof networkScenarios)[number]

export type NetworkSettings = {
  scenario: NetworkScenario
  seed: number
}

export const defaultNetworkSettings: NetworkSettings = {
  scenario: 'success',
  seed: 1337,
}

const settingsStorageKey = 'pirate-battle.network'
const requestCounts = new Map<string, number>()

let currentSettings = loadSettings()

persistSettings(currentSettings)

export function getNetworkSettings(): NetworkSettings {
  return { ...currentSettings }
}

export function getRequestSettings(request: Request): NetworkSettings {
  const url = new URL(request.url)
  const scenario = toScenario(url.searchParams.get('scenario'))
  const seed = toSeed(url.searchParams.get('seed'))
  return {
    scenario: scenario ?? currentSettings.scenario,
    seed: seed ?? currentSettings.seed,
  }
}

export function setNetworkSettings(settings: NetworkSettings): void {
  currentSettings = {
    scenario: settings.scenario,
    seed: toSeed(settings.seed) ?? defaultNetworkSettings.seed,
  }
  resetScenarioRuntime()
  persistSettings(currentSettings)
  updateUrl(currentSettings)
}

export function resetNetworkSettings(): NetworkSettings {
  currentSettings = { ...defaultNetworkSettings }
  resetScenarioRuntime()
  persistSettings(currentSettings)
  updateUrl(null)
  return getNetworkSettings()
}

export function scenarioLatency(
  settings: NetworkSettings,
  endpoint: string,
): number {
  if (settings.scenario === 'slow') return 1500
  const count = nextCount(settings, endpoint)
  if (settings.scenario === 'out-of-order') {
    return count % 2 === 0 ? 1600 : 100
  }
  if (settings.scenario !== 'jitter') return 0
  return 250 + Math.floor(seedRandom(settings.seed, count) * 1251)
}

export function resetScenarioRuntime(): void {
  requestCounts.clear()
}

function loadSettings(): NetworkSettings {
  const stored = readStoredSettings()
  const params = new URL(window.location.href).searchParams
  return {
    scenario: toScenario(params.get('scenario')) ?? stored.scenario,
    seed: toSeed(params.get('seed')) ?? stored.seed,
  }
}

function readStoredSettings(): NetworkSettings {
  const parsed = parseJson(localStorage.getItem(settingsStorageKey))
  if (!isRecord(parsed)) return { ...defaultNetworkSettings }
  return {
    scenario: toScenario(parsed.scenario) ?? defaultNetworkSettings.scenario,
    seed: toSeed(parsed.seed) ?? defaultNetworkSettings.seed,
  }
}

function persistSettings(settings: NetworkSettings): void {
  localStorage.setItem(settingsStorageKey, JSON.stringify(settings))
}

function updateUrl(settings: NetworkSettings | null): void {
  const url = new URL(window.location.href)
  if (settings) {
    url.searchParams.set('scenario', settings.scenario)
    url.searchParams.set('seed', String(settings.seed))
  } else {
    url.searchParams.delete('scenario')
    url.searchParams.delete('seed')
  }
  window.history.replaceState(null, '', url)
}

function nextCount(settings: NetworkSettings, endpoint: string): number {
  const key = `${settings.scenario}:${settings.seed}:${endpoint}`
  const count = requestCounts.get(key) ?? 0
  requestCounts.set(key, count + 1)
  return count
}

function seedRandom(seed: number, count: number): number {
  let value = (seed + Math.imul(count + 1, 0x9e3779b9)) | 0
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad)
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97)
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296
}

function toScenario(value: unknown): NetworkScenario | null {
  if (typeof value !== 'string') return null
  return networkScenarios.find((scenario) => scenario === value) ?? null
}

function toSeed(value: unknown): number | null {
  if (value === null || value === '') return null
  const seed = typeof value === 'number' ? value : Number(value)
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 2147483647) return null
  return seed
}
