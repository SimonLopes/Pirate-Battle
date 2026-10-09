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
  const reason = reasonLabel(result)
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
            Battle complete
          </h1>
          <p className="menu-score">
            <span className="sr-only">Score </span>
            {result.score}
          </p>
          <p id="result-summary" className="result-summary">
            Points · <span className="sr-only">Time </span>
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
          <div className="menu-stack result-actions">
            {failed && (
              <Button variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            )}
            <Button onClick={onPlay}>Play again</Button>
            <Button onClick={onMenu}>Main menu</Button>
          </div>
        </Panel>
      </div>
    </main>
  )
}

export function LastResult({ result }: { result: MatchResult }) {
  return (
    <section className="last-result" aria-labelledby="last-result-title">
      <h2 id="last-result-title" className="menu-copy">
        Last battle
      </h2>
      <p className="result-summary">
        {result.score} points ·{' '}
        <time dateTime={span(result.played)}>{clock(result.played)}</time> ·{' '}
        {reasonLabel(result)}
      </p>
    </section>
  )
}

function reasonLabel(result: MatchResult): string {
  return result.reason === 'time' ? 'Time up' : 'Defeated'
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
