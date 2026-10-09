import { getHistory } from '../api/client.ts'
import { loadPlayerId } from '../api/player.ts'
import type { EndReason, MatchRecord } from '../api/types.ts'
import { MatchTable, PlayedAt } from './MatchTable.tsx'

export function History() {
  const playerId = loadPlayerId()
  return (
    <MatchTable
      name="match history"
      queryKey={['history', playerId]}
      fetchPage={(params, signal) => getHistory(playerId, params, signal)}
      caption={(data) => {
        const captain = data?.items[0]?.playerName
        if (!captain) return 'Your recent battles'
        return (
          <>
            <span className="ranking-captain" title={captain}>
              {captain}
            </span>{' '}
            · Your recent battles
          </>
        )
      }}
      columns={['Date', 'Points', 'Duration', 'Result']}
      tableClass="history-table"
      emptyText="No battles recorded yet."
      row={(record, position) => (
        <Row key={record.matchId} record={record} isLatest={position === 0} />
      )}
    />
  )
}

function Row({ record, isLatest }: { record: MatchRecord; isLatest: boolean }) {
  return (
    <tr className={isLatest ? 'ranking-mine' : undefined}>
      <th scope="row" className="ranking-date">
        <PlayedAt iso={record.playedAt} />
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
