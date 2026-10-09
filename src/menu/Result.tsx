import type { MatchResult } from '../game/result.ts'
import { Button } from '../ui/Button.tsx'
import { Panel } from '../ui/Panel.tsx'

export function Result({
  result,
  onPlay,
  onMenu,
}: {
  result: MatchResult
  onPlay: () => void
  onMenu: () => void
}) {
  const reason = result.reason === 'time' ? 'Tempo esgotado' : 'Derrota'

  return (
    <main className="menu-scene">
      <Panel>
        <h1 className="menu-heading">Batalha encerrada</h1>
        <p className="menu-score">
          <span className="sr-only">Pontuação </span>
          {result.score}
        </p>
        <p className="result-summary">
          Pontos ·{' '}
          <time dateTime={span(result.played)}>{clock(result.played)}</time> ·{' '}
          {reason}
        </p>
        <p className="result-record">Registro pendente</p>
        <div className="menu-stack">
          <Button onClick={onPlay}>Jogar de novo</Button>
          <Button onClick={onMenu}>Menu principal</Button>
        </div>
      </Panel>
    </main>
  )
}

function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
}

function span(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `PT${minutes}M${rest}S`
}
