import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { getRanking } from '../api/client.ts'
import { loadPlayerId } from '../api/player.ts'
import type { MatchConfig, MatchRecord } from '../api/types.ts'
import { Button } from '../ui/Button.tsx'

const pageSize = 5
const starArt = '/assets/png/default/ui/hud/icon_score.png'
const prevArt = '/assets/png/default/ui/controls/icon_turn_left.png'
const nextArt = '/assets/png/default/ui/controls/icon_turn_right.png'

export function Ranking({ config }: { config: MatchConfig }) {
  const [page, setPage] = useState(1)
  const playerId = loadPlayerId()
  const query = useQuery({
    queryKey: ['ranking', { page, pageSize, ...config }],
    queryFn: ({ signal }) => getRanking({ page, pageSize, ...config }, signal),
    placeholderData: keepPreviousData,
    retry: canRetry,
    refetchOnMount: 'always',
  })

  const data = query.data
  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1
  const isBusy = query.isFetching

  return (
    <div className="ranking" aria-busy={isBusy}>
      <p className="ranking-config">
        {config.sessionTime} second battles · {config.spawnInterval} second
        spawn interval
      </p>
      <p className="ranking-status" role="status">
        {statusText(query.isPending, isBusy)}
      </p>
      {query.isError && (
        <div className="ranking-error" role="alert">
          <p>
            {data
              ? 'Could not refresh the ranking. Showing the last loaded page.'
              : 'Could not load the ranking.'}
          </p>
          <Button compact onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {data && data.items.length === 0 && (
        <p className="menu-copy">
          No battles recorded with these settings yet.
        </p>
      )}
      {data && data.items.length > 0 && (
        <>
          <table
            className={
              query.isPlaceholderData
                ? 'ranking-table ranking-stale'
                : 'ranking-table'
            }
          >
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Captain</th>
                <th scope="col">Points</th>
                <th scope="col">Played</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((record, index) => (
                <Row
                  key={record.matchId}
                  record={record}
                  rank={(data.page - 1) * pageSize + index + 1}
                  isMine={record.playerId === playerId}
                />
              ))}
            </tbody>
          </table>
          <nav className="ranking-pager" aria-label="Ranking pages">
            <button
              type="button"
              className="step-button ranking-step"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              <img src={prevArt} alt="" draggable={false} />
            </button>
            <span>
              Page {Math.min(page, pages)} of {pages}
            </span>
            <button
              type="button"
              className="step-button ranking-step"
              aria-label="Next page"
              disabled={query.isPlaceholderData || page >= pages}
              onClick={() => setPage((current) => current + 1)}
            >
              <img src={nextArt} alt="" draggable={false} />
            </button>
          </nav>
        </>
      )}
    </div>
  )
}

function Row({
  record,
  rank,
  isMine,
}: {
  record: MatchRecord
  rank: number
  isMine: boolean
}) {
  return (
    <tr className={isMine ? 'ranking-mine' : undefined}>
      <td className="ranking-rank">{String(rank).padStart(2, '0')}</td>
      <th scope="row">
        <span className="ranking-name">
          {rank === 1 && (
            <img
              className="ranking-star"
              src={starArt}
              alt=""
              draggable={false}
            />
          )}
          {record.playerName}
          {isMine && <span className="ranking-you">You</span>}
        </span>
      </th>
      <td className="ranking-score">{record.score}</td>
      <td className="ranking-date">{formatPlayed(record.playedAt)}</td>
    </tr>
  )
}

function statusText(isPending: boolean, isFetching: boolean): string {
  if (isPending) return 'Loading ranking…'
  if (isFetching) return 'Updating…'
  return ''
}

function canRetry(count: number, error: Error): boolean {
  if (count >= 2) return false
  if (!isAxiosError(error) || !error.response) return true
  return error.response.status >= 500
}

function formatPlayed(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${day.toUpperCase()} · ${time}`
}
