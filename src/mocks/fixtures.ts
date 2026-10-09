import type { EndReason, MatchRecord } from '../api/types.ts'

const defaultMatchConfig = {
  sessionTime: 120,
  spawnInterval: 3,
}

function match(
  matchId: string,
  playerId: string,
  playerName: string,
  playedAt: string,
  score: number,
  durationMs: number,
  endReason: EndReason = 'time',
  sessionTime = 120,
  spawnInterval = 3,
): MatchRecord {
  return {
    matchId,
    playerId,
    playerName,
    playedAt,
    score,
    durationMs,
    endReason,
    config:
      sessionTime === 120 && spawnInterval === 3
        ? { ...defaultMatchConfig }
        : { sessionTime, spawnInterval },
  }
}

export const matchFixtures: MatchRecord[] = [
  match(
    'fixture-001',
    'blackbeard',
    'Blackbeard',
    '2026-08-04T18:10:00.000Z',
    31,
    120000,
  ),
  match(
    'fixture-002',
    'anne-bonny',
    'Anne Bonny',
    '2026-08-07T13:45:00.000Z',
    28,
    118420,
    'death',
  ),
  match(
    'fixture-003',
    'calico-jack',
    'Calico Jack',
    '2026-08-09T20:05:00.000Z',
    28,
    117900,
    'death',
  ),
  match(
    'fixture-004',
    'mary-read',
    'Mary Read',
    '2026-08-01T09:30:00.000Z',
    28,
    117900,
    'death',
  ),
  match(
    'fixture-005',
    'bartholomew',
    'Bartholomew Roberts',
    '2026-08-11T16:20:00.000Z',
    25,
    120000,
  ),
  match(
    'fixture-006',
    'grace-omalley',
    "Grace O'Malley",
    '2026-08-13T11:15:00.000Z',
    23,
    120000,
  ),
  match(
    'fixture-007',
    'henry-morgan',
    'Henry Morgan',
    '2026-08-14T22:40:00.000Z',
    21,
    103850,
    'death',
  ),
  match(
    'fixture-008',
    'sam-bellamy',
    'Sam Bellamy',
    '2026-08-16T07:25:00.000Z',
    19,
    120000,
  ),
  match(
    'fixture-009',
    'charles-vane',
    'Charles Vane',
    '2026-08-18T19:05:00.000Z',
    17,
    96500,
    'death',
  ),
  match(
    'fixture-010',
    'zheng-yi-sao',
    'Zheng Yi Sao',
    '2026-08-20T14:50:00.000Z',
    16,
    120000,
  ),
  match(
    'fixture-011',
    'edward-low',
    'Edward Low',
    '2026-08-21T17:35:00.000Z',
    14,
    88200,
    'death',
  ),
  match(
    'fixture-012',
    'francois',
    "François l'Olonnais",
    '2026-08-23T10:10:00.000Z',
    12,
    120000,
  ),
  match(
    'fixture-013',
    'howell-davis',
    'Howell Davis',
    '2026-08-25T21:55:00.000Z',
    10,
    76400,
    'death',
  ),
  match(
    'fixture-014',
    'stede-bonnet',
    'Stede Bonnet',
    '2026-08-27T12:00:00.000Z',
    8,
    120000,
  ),
  match(
    'fixture-015',
    'blackbeard',
    'Blackbeard',
    '2026-08-29T18:10:00.000Z',
    42,
    180000,
    'time',
    180,
    3,
  ),
  match(
    'fixture-016',
    'anne-bonny',
    'Anne Bonny',
    '2026-08-30T13:45:00.000Z',
    22,
    60000,
    'time',
    60,
    2,
  ),
  match(
    'fixture-017',
    'mary-read',
    'Mary Read',
    '2026-09-01T09:30:00.000Z',
    26,
    120000,
    'time',
    120,
    5,
  ),
]

const manyPagePlayers = [
  ['red-jenny', 'Red Jenny'],
  ['long-ben', 'Long Ben'],
  ['island-rose', 'Island Rose'],
  ['sea-wolf', 'Sea Wolf'],
] as const

export const manyPageFixtures: MatchRecord[] = Array.from(
  { length: 36 },
  (_, index) => {
    const player = manyPagePlayers[index % manyPagePlayers.length]
    return match(
      `many-${String(index + 1).padStart(3, '0')}`,
      player?.[0] ?? 'red-jenny',
      player?.[1] ?? 'Red Jenny',
      new Date(Date.UTC(2026, 6, index + 1, 12)).toISOString(),
      45 - (index % 30),
      60000 + index * 1250,
      index % 4 === 0 ? 'death' : 'time',
    )
  },
)
