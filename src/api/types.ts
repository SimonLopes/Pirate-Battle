export type EndReason = 'time' | 'death'

export type MatchConfig = {
  sessionTime: number
  spawnInterval: number
}

export type MatchRecord = {
  matchId: string
  playerId: string
  playerName: string
  playedAt: string
  score: number
  durationMs: number
  endReason: EndReason
  config: MatchConfig
}

export type MatchPage = {
  items: MatchRecord[]
  page: number
  pageSize: number
  total: number
}

export type PageParams = {
  page: number
  pageSize: number
}

export type RankingParams = PageParams & {
  sessionTime: number
  spawnInterval: number
}
