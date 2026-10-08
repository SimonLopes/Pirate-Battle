import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import type { HudStore } from './store.ts'

const hudArt = '/assets/png/default/ui/hud'
const panelArt = `${hudArt}/counter_panel.png`
const scoreArt = `${hudArt}/icon_score.png`
const timeArt = `${hudArt}/icon_time.png`

const panelW = 160
const panelH = 56
const hudIconArt = 48

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
  background: 'transparent',
  color: '#fff6df',
  pointerEvents: 'none',
  userSelect: 'none',
}

const counter: CSSProperties = {
  position: 'relative',
  boxSizing: 'border-box',
  width: `min(${panelW}px, calc(50% - 8px))`,
  aspectRatio: `${panelW} / ${panelH}`,
  margin: 0,
  backgroundColor: 'transparent',
  backgroundImage: `url(${panelArt})`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
  containerType: 'inline-size',
}

const counterRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  boxSizing: 'border-box',
  width: '100%',
  height: '100%',
  padding: '2cqw 6cqw 2cqw 4cqw',
  gap: '2cqw',
}

const counterIcon: CSSProperties = {
  width: `${(hudIconArt / panelW) * 100}cqw`,
  height: `${(hudIconArt / panelW) * 100}cqw`,
  flexShrink: 0,
  objectFit: 'contain',
  pointerEvents: 'none',
  userSelect: 'none',
}

const counterValue: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: '12.5cqw',
  lineHeight: 1,
  fontFamily: 'system-ui, sans-serif',
  fontVariantNumeric: 'tabular-nums',
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
  barRef,
}: {
  store: HudStore
  onResume: () => void
  barRef: Ref<HTMLDivElement>
}) {
  return (
    <>
      <HudScore store={store} barRef={barRef} />
      <HudNotice store={store} />
      <PauseDialog store={store} onResume={onResume} />
    </>
  )
}

function HudScore({
  store,
  barRef,
}: {
  store: HudStore
  barRef: Ref<HTMLDivElement>
}) {
  const view = useSyncExternalStore(
    store.subscribe,
    store.getView,
    store.getView,
  )

  return (
    <div ref={barRef} style={scoreboard} inert={view.status === 'paused'}>
      <Counter icon={scoreArt} label="Score ">
        {view.score}
      </Counter>
      <Counter icon={timeArt} label="Time left ">
        <time dateTime={`PT${view.secondsLeft}S`}>
          {clock(view.secondsLeft)}
        </time>
      </Counter>
    </div>
  )
}

function Counter({
  icon,
  label,
  children,
}: {
  icon: string
  label: string
  children: ReactNode
}) {
  return (
    <p style={counter}>
      <span style={counterRow}>
        <img src={icon} alt="" draggable={false} style={counterIcon} />
        <span style={hidden}>{label}</span>
        <span style={counterValue}>{children}</span>
      </span>
    </p>
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
