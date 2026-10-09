import type { MatchResult } from '../game/result.ts'
import { Button } from '../ui/Button.tsx'
import { Panel } from '../ui/Panel.tsx'
import { useDialog } from '../ui/useDialog.ts'

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
  const dialogRef = useDialog(true, onMenu)

  return (
    <main className="menu-scene">
      <div
        ref={dialogRef}
        className="dialog-host"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        aria-describedby="result-summary"
      >
        <Panel>
          <h1 id="result-title" className="menu-heading">
            Batalha encerrada
          </h1>
          <p className="menu-score">
            <span className="sr-only">Pontuação </span>
            {result.score}
          </p>
          <p id="result-summary" className="result-summary">
            Pontos · <span className="sr-only">Time </span>
            <time dateTime={span(result.played)}>
              {clock(result.played)}
            </time> · {reason}
          </p>
          <p className="result-record">Registro pendente</p>
          <div className="menu-stack">
            <Button onClick={onPlay}>Jogar de novo</Button>
            <Button onClick={onMenu}>Menu principal</Button>
          </div>
        </Panel>
      </div>
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
