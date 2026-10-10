import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from 'react'
import { play } from '../audio.ts'
import { sessionDurationLimits, spawnIntervalLimits } from '../game/config.ts'
import {
  captainNameError,
  sessionTimeError,
  spawnTimeError,
  stepSeconds,
  wholeSeconds,
  type PlayerOptions,
} from '../game/options.ts'
import { Button } from '../ui/Button.tsx'
import { FullscreenButton } from '../ui/FullscreenButton.tsx'
import { MuteField } from '../ui/MuteField.tsx'
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
  onSave: (options: PlayerOptions) => void
  onBack: () => void
}) {
  const nameRef = useRef<HTMLInputElement>(null)
  const sessionRef = useRef<HTMLInputElement>(null)
  const spawnRef = useRef<HTMLInputElement>(null)
  const [captainName, setCaptainName] = useState(saved.captainName)
  const [sessionTime, setSessionTime] = useState(String(saved.sessionDuration))
  const [spawnTime, setSpawnTime] = useState(String(saved.spawnInterval))
  const [fullscreenOnMobile, setFullscreenOnMobile] = useState(
    saved.fullscreenOnMobile,
  )
  const [muted, setMuted] = useState(saved.muted)
  const [nameError, setNameError] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [spawnError, setSpawnError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (attempt === 0) return
    if (nameError) nameRef.current?.focus()
    else if (sessionError) sessionRef.current?.focus()
    else if (spawnError) spawnRef.current?.focus()
  }, [attempt, nameError, sessionError, spawnError])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextNameError = captainNameError(captainName)
    const nextSessionError = sessionTimeError(sessionTime)
    const nextSpawnError = spawnTimeError(spawnTime)
    setNameError(nextNameError)
    setSessionError(nextSessionError)
    setSpawnError(nextSpawnError)
    if (nextNameError || nextSessionError || nextSpawnError) {
      setAttempt((value) => value + 1)
      return
    }
    const next = {
      captainName: captainName.trim(),
      sessionDuration: Number(sessionTime.trim()),
      spawnInterval: Number(spawnTime.trim()),
      fullscreenOnMobile,
      muted,
    }
    onSave(next)
    onBack()
  }

  return (
    <Panel
      className="menu-panel-options"
      actions={
        <>
          <Button
            id="options-back"
            variant="secondary"
            sound="ui_back"
            onClick={onBack}
          >
            Back
          </Button>
          <Button id="options-save" type="submit" form="options-form">
            Save
          </Button>
        </>
      }
    >
      <h1 className="menu-heading" tabIndex={-1}>
        Options
      </h1>
      <form
        id="options-form"
        className="option-form"
        noValidate
        onSubmit={submit}
      >
        <div className="option-field">
          <label className="option-label" htmlFor="captain-name">
            Captain name
          </label>
          <input
            ref={nameRef}
            id="captain-name"
            className="option-name"
            value={captainName}
            autoComplete="nickname"
            spellCheck={false}
            required
            aria-invalid={nameError !== null}
            aria-describedby={nameError ? 'captain-name-error' : undefined}
            onChange={(event) => {
              setCaptainName(event.target.value)
              setNameError(null)
            }}
          />
          {nameError && (
            <p id="captain-name-error" className="option-error" role="alert">
              {nameError}
            </p>
          )}
        </div>
        <TimeField
          id="session-time"
          label="Game session time"
          value={sessionTime}
          error={sessionError}
          limits={sessionDurationLimits}
          step={5}
          inputRef={sessionRef}
          onChange={(value) => {
            setSessionTime(value)
            setSessionError(null)
          }}
        />
        <TimeField
          className="option-span"
          id="spawn-time"
          label="Enemy spawn time"
          value={spawnTime}
          error={spawnError}
          limits={spawnIntervalLimits}
          inputRef={spawnRef}
          onChange={(value) => {
            setSpawnTime(value)
            setSpawnError(null)
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
        <MuteField id="mute-sound" muted={muted} onChange={setMuted} />
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
  step = 1,
  className,
  inputRef,
  onChange,
}: {
  id: string
  label: string
  value: string
  error: string | null
  limits: { min: number; max: number }
  step?: number
  className?: string
  inputRef: RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
}) {
  const errorId = `${id}-error`
  const name = `${label.charAt(0).toLowerCase()}${label.slice(1)}`
  const seconds = wholeSeconds(value)
  const atMin = seconds !== null && seconds <= limits.min
  const atMax = seconds !== null && seconds >= limits.max

  return (
    <div className={className ? `option-field ${className}` : 'option-field'}>
      <label className="option-label" htmlFor={id}>
        {label}
        <span className="sr-only"> in seconds</span>
      </label>
      <div className="option-row">
        <StepButton
          icon={minusArt}
          label={`Decrease ${name}`}
          disabled={atMin}
          onClick={() => onChange(stepSeconds(value, -step, limits))}
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
          label={`Increase ${name}`}
          disabled={atMax}
          onClick={() => onChange(stepSeconds(value, step, limits))}
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
      onClick={() => {
        play('ui_click')
        onClick()
      }}
    >
      <img src={icon} alt="" draggable={false} />
    </button>
  )
}
