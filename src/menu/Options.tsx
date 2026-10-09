import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react'
import { sessionDurationLimits, spawnIntervalLimits } from '../game/config.ts'
import {
  sessionTimeError,
  spawnTimeError,
  stepSeconds,
  wholeSeconds,
  type PlayerOptions,
} from '../game/options.ts'
import { Button } from '../ui/Button.tsx'
import { FullscreenButton } from '../ui/FullscreenButton.tsx'
import { Panel } from '../ui/Panel.tsx'

const art = '/assets/png/default/ui/controls'
const minusArt = `${art}/icon_minus.png`
const plusArt = `${art}/icon_plus.png`

export function Options({
  saved,
  onSave,
  onBack,
}: {
  saved: PlayerOptions
  onSave: (options: PlayerOptions) => boolean
  onBack: () => void
}) {
  const sessionRef = useRef<HTMLInputElement>(null)
  const spawnRef = useRef<HTMLInputElement>(null)
  const [sessionTime, setSessionTime] = useState(String(saved.sessionDuration))
  const [spawnTime, setSpawnTime] = useState(String(saved.spawnInterval))
  const [fullscreenOnMobile, setFullscreenOnMobile] = useState(
    saved.fullscreenOnMobile,
  )
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [spawnError, setSpawnError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (attempt === 0) return
    if (sessionError) sessionRef.current?.focus()
    else if (spawnError) spawnRef.current?.focus()
  }, [attempt, sessionError, spawnError])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextSessionError = sessionTimeError(sessionTime)
    const nextSpawnError = spawnTimeError(spawnTime)
    setSessionError(nextSessionError)
    setSpawnError(nextSpawnError)
    setSaveError(null)
    if (nextSessionError || nextSpawnError) {
      setAttempt((value) => value + 1)
      return
    }
    const next = {
      sessionDuration: Number(sessionTime.trim()),
      spawnInterval: Number(spawnTime.trim()),
      fullscreenOnMobile,
    }
    if (!onSave(next)) {
      setSaveError('Não foi possível salvar as opções.')
      return
    }
    onBack()
  }

  return (
    <Panel>
      <h1 className="menu-heading">Opções</h1>
      <form className="option-form" noValidate onSubmit={submit}>
        <TimeField
          id="session-time"
          label="Tempo da partida"
          value={sessionTime}
          error={sessionError}
          limits={sessionDurationLimits}
          inputRef={sessionRef}
          onChange={(value) => {
            setSessionTime(value)
            setSessionError(null)
            setSaveError(null)
          }}
        />
        <TimeField
          id="spawn-time"
          label="Tempo de surgimento dos inimigos"
          value={spawnTime}
          error={spawnError}
          limits={spawnIntervalLimits}
          inputRef={spawnRef}
          onChange={(value) => {
            setSpawnTime(value)
            setSpawnError(null)
            setSaveError(null)
          }}
        />
        <div className="option-field">
          <label className="option-label" htmlFor="fullscreen-mobile">
            Fullscreen on mobile
          </label>
          <div className="option-row">
            <input
              id="fullscreen-mobile"
              className="option-check"
              type="checkbox"
              checked={fullscreenOnMobile}
              onChange={(event) => setFullscreenOnMobile(event.target.checked)}
            />
            <FullscreenButton />
          </div>
        </div>
        {saveError && (
          <p className="option-error" role="alert">
            {saveError}
          </p>
        )}
        <Button type="submit">Menu principal</Button>
      </form>
    </Panel>
  )
}

function TimeField({
  id,
  label,
  value,
  error,
  limits,
  inputRef,
  onChange,
}: {
  id: string
  label: string
  value: string
  error: string | null
  limits: { min: number; max: number }
  inputRef: RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
}) {
  const errorId = `${id}-error`
  const name = `${label.charAt(0).toLowerCase()}${label.slice(1)}`
  const seconds = wholeSeconds(value)
  const atMin = seconds !== null && seconds <= limits.min
  const atMax = seconds !== null && seconds >= limits.max

  return (
    <div className="option-field">
      <label className="option-label" htmlFor={id}>
        {label}
        <span className="sr-only"> em segundos</span>
      </label>
      <div className="option-row">
        <StepButton
          icon={minusArt}
          label={`Diminuir ${name}`}
          disabled={atMin}
          onClick={() => onChange(stepSeconds(value, -1, limits))}
        />
        <span className="option-value">
          <input
            ref={inputRef}
            id={id}
            value={value}
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={error !== null}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => onChange(event.target.value)}
          />
          <span className="option-unit" aria-hidden="true">
            s
          </span>
        </span>
        <StepButton
          icon={plusArt}
          label={`Aumentar ${name}`}
          disabled={atMax}
          onClick={() => onChange(stepSeconds(value, 1, limits))}
        />
      </div>
      {error && (
        <p id={errorId} className="option-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function StepButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="step-button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <img src={icon} alt="" draggable={false} />
    </button>
  )
}
