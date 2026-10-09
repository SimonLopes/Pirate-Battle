import axios from 'axios'
import type {
  MatchPage,
  MatchRecord,
  PageParams,
  RankingParams,
} from './types.ts'

const http = axios.create({
  baseURL: '/api',
  timeout: 8000,
})

export async function getRanking(
  params: RankingParams,
  signal?: AbortSignal,
): Promise<MatchPage> {
  const response = await http.get<MatchPage>('/ranking', { params, signal })
  return response.data
}

export async function getHistory(
  playerId: string,
  params: PageParams,
  signal?: AbortSignal,
): Promise<MatchPage> {
  const response = await http.get<MatchPage>(
    `/players/${encodeURIComponent(playerId)}/history`,
    { params, signal },
  )
  return response.data
}

export async function saveMatch(record: MatchRecord): Promise<MatchRecord> {
  const response = await http.put<MatchRecord>(
    `/matches/${encodeURIComponent(record.matchId)}`,
    record,
  )
  return response.data
}
