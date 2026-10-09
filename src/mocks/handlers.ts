import { delay, http, HttpResponse } from 'msw'
import type { MatchPage, MatchRecord } from '../api/types.ts'
import { manyPageFixtures, matchFixtures } from './fixtures.ts'
import {
  getRequestSettings,
  scenarioLatency,
  type NetworkSettings,
} from './scenarios.ts'
import { isMatchRecord } from '../validate.ts'
import { readStoredMatches, writeStoredMatches } from './store.ts'

export { matchesStorageKey } from './store.ts'

export const handlers = [
  http.get('*/api/ranking', async ({ request }) => {
    const settings = getRequestSettings(request)
    const response = await scenarioResponse('ranking', settings)
    if (response) return response

    const url = new URL(request.url)
    const page = positiveInteger(url.searchParams.get('page'), 1)
    const pageSize = positiveInteger(url.searchParams.get('pageSize'), 10)
    const sessionTime = Number(url.searchParams.get('sessionTime'))
    const spawnInterval = Number(url.searchParams.get('spawnInterval'))
    if (settings.scenario === 'empty') {
      return HttpResponse.json(toPage([], page, pageSize))
    }

    const records =
      settings.scenario === 'many-pages'
        ? [
            ...allMatches(),
            ...manyPageFixtures.map((record) => ({
              ...record,
              config: { sessionTime, spawnInterval },
            })),
          ]
        : allMatches()
    const matches = records
      .filter(
        (record) =>
          record.config.sessionTime === sessionTime &&
          record.config.spawnInterval === spawnInterval,
      )
      .sort(compareRanking)

    return HttpResponse.json(toPage(matches, page, pageSize))
  }),

  http.get('*/api/players/:playerId/history', async ({ params, request }) => {
    const settings = getRequestSettings(request)
    const response = await scenarioResponse('history', settings)
    if (response) return response

    const url = new URL(request.url)
    const page = positiveInteger(url.searchParams.get('page'), 1)
    const pageSize = positiveInteger(url.searchParams.get('pageSize'), 10)
    const playerId = typeof params.playerId === 'string' ? params.playerId : ''
    if (settings.scenario === 'empty') {
      return HttpResponse.json(toPage([], page, pageSize))
    }

    const records =
      settings.scenario === 'many-pages'
        ? [
            ...allMatches(),
            ...manyPageFixtures.map((record) => ({
              ...record,
              playerId,
              playerName: 'Demo Captain',
            })),
          ]
        : allMatches()
    const matches = records
      .filter((record) => record.playerId === playerId)
      .sort(compareHistory)

    return HttpResponse.json(toPage(matches, page, pageSize))
  }),

  http.put('*/api/matches/:matchId', async ({ params, request }) => {
    const settings = getRequestSettings(request)
    if (settings.scenario !== 'timeout-after-save') {
      const response = await scenarioResponse('save', settings)
      if (response) return response
    }

    const matchId = typeof params.matchId === 'string' ? params.matchId : ''
    const existing = allMatches().find((record) => record.matchId === matchId)
    if (existing) {
      return HttpResponse.json(existing, { status: 200 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return HttpResponse.json(
        { message: 'Invalid match record' },
        { status: 400 },
      )
    }

    if (!isMatchRecord(body) || body.matchId !== matchId) {
      return HttpResponse.json(
        { message: 'Invalid match record' },
        { status: 400 },
      )
    }

    const confirmed = allMatches().find((record) => record.matchId === matchId)
    if (confirmed) {
      return HttpResponse.json(confirmed, { status: 200 })
    }

    const stored = readStoredMatches()
    writeStoredMatches([...stored, body])
    if (settings.scenario === 'timeout-after-save') {
      await delay('infinite')
    }
    return HttpResponse.json(body, { status: 201 })
  }),
]

function allMatches(): MatchRecord[] {
  return [...matchFixtures, ...readStoredMatches()]
}

function toPage(
  matches: MatchRecord[],
  page: number,
  pageSize: number,
): MatchPage {
  const start = (page - 1) * pageSize
  return {
    items: matches.slice(start, start + pageSize),
    page,
    pageSize,
    total: matches.length,
  }
}

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return parsed
}

function compareRanking(left: MatchRecord, right: MatchRecord): number {
  return (
    right.score - left.score ||
    left.durationMs - right.durationMs ||
    Date.parse(left.playedAt) - Date.parse(right.playedAt) ||
    left.matchId.localeCompare(right.matchId)
  )
}

function compareHistory(left: MatchRecord, right: MatchRecord): number {
  return (
    Date.parse(right.playedAt) - Date.parse(left.playedAt) ||
    left.matchId.localeCompare(right.matchId)
  )
}

async function scenarioResponse(
  endpoint: 'ranking' | 'history' | 'save',
  settings: NetworkSettings,
): Promise<Response | null> {
  const latency = scenarioLatency(settings, endpoint)
  if (latency > 0) await delay(latency)

  if (settings.scenario === 'timeout') {
    await delay('infinite')
  }
  if (
    settings.scenario === 'network-error' ||
    (settings.scenario === 'offline-on-finish' && endpoint === 'save')
  ) {
    return HttpResponse.error()
  }
  if (
    settings.scenario === 'server-error' ||
    (settings.scenario === 'ranking-fail' && endpoint === 'ranking') ||
    (settings.scenario === 'history-fail' && endpoint === 'history')
  ) {
    return HttpResponse.json({ message: 'Mock server error' }, { status: 500 })
  }
  if (settings.scenario === 'client-error') {
    return HttpResponse.json({ message: 'Mock client error' }, { status: 404 })
  }
  return null
}
