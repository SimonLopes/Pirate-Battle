import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
} from 'react'
import type { HudStore } from './store.ts'

const scoreboard: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 2,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  margin: 0,
  paddingTop: 'max(12px, env(safe-area-inset-top))',
  paddingRight: 'max(16px, env(safe-area-inset-right))',
  paddingBottom: 12,
  paddingLeft: 'max(16px, env(safe-area-inset-left))',
  background: 'rgba(2, 16, 24, 0.82)',
  color: '#fff6df',
  font: '600 20px/1.2 system-ui, sans-serif',
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none',
  userSelect: 'none',
}

const figure: CSSProperties = {
  margin: 0,
}

const hidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
}

const shade: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  background: 'rgba(2, 16, 24, 0.55)',
}

const panel: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  zIndex: 3,
  width: 'min(420px, calc(100% - 32px))',
  margin: 0,
  padding: '28px 32px',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(2, 16, 24, 0.94)',
  color: '#fff6df',
  border: '2px solid #e6c15a',
  borderRadius: 12,
  textAlign: 'center',
  maxHeight: 'calc(100% - 32px)',
  overflow: 'auto',
  font: '600 18px/1.4 system-ui, sans-serif',
}

const title: CSSProperties = {
  margin: 0,
  font: '700 32px/1.2 system-ui, sans-serif',
}

const hint: CSSProperties = {
  margin: '12px 0 0',
}

const resumeButton: CSSProperties = {
  marginTop: 20,
  minWidth: 160,
  minHeight: 48,
  padding: '12px 24px',
  color: '#021018',
  background: '#fff6df',
  border: '2px solid #e6c15a',
  borderRadius: 8,
  font: '700 18px/1 system-ui, sans-serif',
  cursor: 'pointer',
  outline: '3px solid #e6c15a',
  outlineOffset: 3,
}

export function Hud({
  store,
  onResume,
}: {
  store: HudStore
  onResume: () => void
}) {
  return (
    <>
      <HudScore store={store} />
      <HudNotice store={store} />
      <PauseDialog store={store} onResume={onResume} />
    </>
  )
}

function HudScore({ store }: { store: HudStore }) {
  const view = useSyncExternalStore(
    store.subscribe,
    store.getView,
    store.getView,
  )

  return (
    <div style={scoreboard} inert={view.status === 'paused'}>
      <p style={figure}>Score {view.score}</p>
      <p style={figure}>
        Time left{' '}
        <time dateTime={`PT${view.secondsLeft}S`}>
          {clock(view.secondsLeft)}
        </time>
      </p>
    </div>
  )
}

function HudNotice({ store }: { store: HudStore }) {
  const notice = useSyncExternalStore(
    store.subscribe,
    store.getNotice,
    store.getNotice,
  )

  return (
    <div aria-live="polite" style={hidden}>
      {notice}
    </div>
  )
}

function PauseDialog({
  store,
  onResume,
}: {
  store: HudStore
  onResume: () => void
}) {
  const view = useSyncExternalStore(
    store.subscribe,
    store.getView,
    store.getView,
  )
  const open = view.status === 'paused'
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    buttonRef.current?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      event.preventDefault()
      buttonRef.current?.focus()
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [open])

  if (!open) return null

  return (
    <>
      <div style={shade} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        aria-describedby="pause-hint"
        style={panel}
      >
        <h2 id="pause-title" style={title}>
          Paused
        </h2>
        <p id="pause-hint" style={hint}>
          Press a key or resume to continue.
        </p>
        <button
          ref={buttonRef}
          type="button"
          style={resumeButton}
          onClick={onResume}
        >
          Resume
        </button>
      </div>
    </>
  )
}

function clock(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
