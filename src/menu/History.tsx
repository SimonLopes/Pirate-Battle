import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { getHistory } from '../api/client.ts'
import { loadPlayerId } from '../api/player.ts'
import type { EndReason, MatchRecord } from '../api/types.ts'
import { Button } from '../ui/Button.tsx'

const pageSize = 5
const prevArt = '/assets/png/default/ui/controls/icon_turn_left.png'
const nextArt = '/assets/png/default/ui/controls/icon_turn_right.png'

export function History() {
  const [page, setPage] = useState(1)
  const playerId = loadPlayerId()
  const query = useQuery({
    queryKey: ['history', playerId, { page, pageSize }],
    queryFn: ({ signal }) => getHistory(playerId, { page, pageSize }, signal),
    placeholderData: keepPreviousData,
    retry: canRetry,
    refetchOnMount: 'always',
  })

  const data = query.data
  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1
  const isBusy = query.isFetching
  const captain = data?.items[0]?.playerName

  return (
    <div className="ranking" aria-busy={isBusy}>
      <p className="ranking-config">
        {captain ? `${captain} · Your recent battles` : 'Your recent battles'}
      </p>
      <p className="ranking-status" role="status">
        {statusText(query.isPending, isBusy)}
      </p>
      {query.isError && (
        <div className="ranking-error" role="alert">
          <p>
            {data
              ? 'Could not refresh the match history. Showing the last loaded page.'
              : 'Could not load the match history.'}
          </p>
          <Button compact onClick={() => void query.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {data && data.items.length === 0 && (
        <p className="menu-copy">No battles recorded yet.</p>
      )}
      {data && data.items.length > 0 && (
        <>
          <table
            className={
              query.isPlaceholderData
                ? 'ranking-table history-table ranking-stale'
                : 'ranking-table history-table'
            }
          >
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Points</th>
                <th scope="col">Duration</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((record, index) => (
                <Row
                  key={record.matchId}
                  record={record}
                  isLatest={data.page === 1 && index === 0}
                />
              ))}
            </tbody>
          </table>
          <nav className="ranking-pager" aria-label="Match history pages">
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

function Row({ record, isLatest }: { record: MatchRecord; isLatest: boolean }) {
  return (
    <tr className={isLatest ? 'ranking-mine' : undefined}>
      <th scope="row" className="ranking-date">
        {formatPlayed(record.playedAt)}
      </th>
      <td className="ranking-score">{record.score}</td>
      <td>{formatDuration(record.durationMs)}</td>
      <td
        className={
          record.endReason === 'death'
            ? 'history-result history-defeat'
            : 'history-result'
        }
      >
        {resultLabel(record.endReason)}
      </td>
    </tr>
  )
}

function statusText(isPending: boolean, isFetching: boolean): string {
  if (isPending) return 'Loading match history…'
  if (isFetching) return 'Updating…'
  return ''
}

function canRetry(count: number, error: Error): boolean {
  if (count >= 2) return false
  if (!isAxiosError(error) || !error.response) return true
  return error.response.status >= 500
}

function resultLabel(reason: EndReason): string {
  if (reason === 'death') return 'Defeated'
  return 'Time up'
}

function formatDuration(durationMs: number): string {
  const total = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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
