import { getRanking } from '../api/client.ts'
import { loadPlayerId } from '../api/player.ts'
import type { MatchConfig, MatchRecord } from '../api/types.ts'
import { MatchTable, PlayedAt } from './MatchTable.tsx'

const starArt = '/assets/png/default/ui/hud/icon_score.png'

export function Ranking({ config }: { config: MatchConfig }) {
  const playerId = loadPlayerId()
  return (
    <MatchTable
      name="ranking"
      queryKey={['ranking', config]}
      fetchPage={(params, signal) =>
        getRanking({ ...params, ...config }, signal)
      }
      caption={() =>
        `${config.sessionTime} second battles · ${config.spawnInterval} second spawn interval`
      }
      columns={['Rank', 'Captain', 'Points', 'Played']}
      emptyText="No battles recorded with these settings yet."
      row={(record, position) => (
        <Row
          key={record.matchId}
          record={record}
          rank={position + 1}
          isMine={record.playerId === playerId}
        />
      )}
    />
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
      <th scope="row" className="ranking-captain-cell">
        <span className="ranking-name">
          {rank === 1 && (
            <img
              className="ranking-star"
              src={starArt}
              alt=""
              draggable={false}
            />
          )}
          <span className="ranking-captain" title={record.playerName}>
            {record.playerName}
          </span>
          {isMine && <span className="ranking-you">You</span>}
        </span>
      </th>
      <td className="ranking-score">{record.score}</td>
      <td className="ranking-date">
        <PlayedAt iso={record.playedAt} />
      </td>
    </tr>
  )
}
