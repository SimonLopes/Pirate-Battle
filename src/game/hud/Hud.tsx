import {
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import { Button } from '../../ui/Button.tsx'
import { FullscreenButton } from '../../ui/FullscreenButton.tsx'
import { Panel } from '../../ui/Panel.tsx'
import { useDialog } from '../../ui/useDialog.ts'
import type { HudStore } from './store.ts'

const hudArt = '/assets/png/default/ui/hud'
const panelArt = `${hudArt}/counter_panel.png`
const scoreArt = `${hudArt}/icon_score.png`
const timeArt = `${hudArt}/icon_time.png`

const panelW = 160
const panelH = 56
const hudIconArt = 48
const plateOpacity = 0.7

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
  background: 'transparent',
  containerType: 'inline-size',
}

const timerCounter: CSSProperties = {
  ...counter,
  marginLeft: 'auto',
}

const counterPlate: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundColor: 'transparent',
  backgroundImage: `url(${panelArt})`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
  backgroundSize: '100% 100%',
  opacity: plateOpacity,
  pointerEvents: 'none',
}

const counterRow: CSSProperties = {
  position: 'relative',
  zIndex: 1,
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

export function Hud({
  store,
  onResume,
  onMenu,
  barRef,
}: {
  store: HudStore
  onResume: () => void
  onMenu: () => void
  barRef: Ref<HTMLDivElement>
}) {
  return (
    <>
      <HudScore store={store} barRef={barRef} />
      <HudNotice store={store} />
      <PauseDialog store={store} onResume={onResume} onMenu={onMenu} />
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
      <Counter icon={timeArt} label="Time left " style={timerCounter}>
        <time dateTime={`PT${view.secondsLeft}S`}>
          {clock(view.secondsLeft)}
        </time>
      </Counter>
      <FullscreenButton className="hud-fullscreen" />
    </div>
  )
}

function Counter({
  icon,
  label,
  style = counter,
  children,
}: {
  icon: string
  label: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <p style={style}>
      <span aria-hidden="true" style={counterPlate} />
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
  onMenu,
}: {
  store: HudStore
  onResume: () => void
  onMenu: () => void
}) {
  const view = useSyncExternalStore(
    store.subscribe,
    store.getView,
    store.getView,
  )
  const open = view.status === 'paused'
  const dialogRef = useDialog(open, onResume)

  if (!open) return null

  return (
    <div className="pause-layer">
      <div className="pause-shade" aria-hidden="true" />
      <div
        ref={dialogRef}
        className="pause-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        aria-describedby="pause-hint"
      >
        <Panel>
          <h2 id="pause-title" className="menu-heading" tabIndex={-1}>
            Paused
          </h2>
          <p id="pause-hint" className="menu-copy">
            Ready when you are.
          </p>

          <div className="menu-stack">
            <Button onClick={onResume}>Resume</Button>
            <Button variant="secondary" onClick={onMenu}>
              Main menu
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function clock(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
