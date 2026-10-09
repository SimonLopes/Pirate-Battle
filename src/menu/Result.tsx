import type { RecordStatus } from '../api/useMatchSave.ts'
import type { MatchResult } from '../game/result.ts'
import { Button } from '../ui/Button.tsx'
import { Panel } from '../ui/Panel.tsx'
import { useDialog } from '../ui/useDialog.ts'

export function Result({
  result,
  status,
  onRetry,
  onPlay,
  onMenu,
}: {
  result: MatchResult
  status: RecordStatus
  onRetry: () => void
  onPlay: () => void
  onMenu: () => void
}) {
  const reason = result.reason === 'time' ? 'Tempo esgotado' : 'Derrota'
  const dialogRef = useDialog(true, onMenu)
  const failed = status === 'failed'

  return (
    <main className="menu-scene">
      <div
        ref={dialogRef}
        className="dialog-host"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        aria-describedby="result-summary result-record"
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
            Pontos · <span className="sr-only">Tempo </span>
            <time dateTime={span(result.played)}>
              {clock(result.played)}
            </time> · {reason}
          </p>
          <p
            id="result-record"
            className={failed ? 'result-record result-failed' : 'result-record'}
            role={failed ? 'alert' : 'status'}
          >
            {recordLabel(status)}
          </p>
          <div className="menu-stack">
            {failed && (
              <Button variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            )}
            <Button onClick={onPlay}>Jogar de novo</Button>
            <Button onClick={onMenu}>Menu principal</Button>
          </div>
        </Panel>
      </div>
    </main>
  )
}

function recordLabel(status: RecordStatus): string {
  if (status === 'saved') return 'Record saved'
  if (status === 'failed') return 'Save failed'
  return 'Saving record…'
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
