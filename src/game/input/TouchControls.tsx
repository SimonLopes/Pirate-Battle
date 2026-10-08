import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type { GameSession } from '../GameSession.ts'
import type { HudStore } from '../hud/store.ts'
import type { Box, TouchBinding, TouchLayout } from './touch.ts'

const art = '/assets/png/retina/ui/controls'
const normal = `${art}/button_round_normal.png`
const pressed = `${art}/button_round_pressed.png`

const pads: {
  binding: TouchBinding
  label: string
  icon: string
}[] = [
  { binding: 'forward', label: 'Forward', icon: `${art}/icon_forward.png` },
  {
    binding: 'turnLeft',
    label: 'Turn left',
    icon: `${art}/icon_turn_left.png`,
  },
  {
    binding: 'turnRight',
    label: 'Turn right',
    icon: `${art}/icon_turn_right.png`,
  },
  {
    binding: 'fireFront',
    label: 'Fire front',
    icon: `${art}/icon_fire_front.png`,
  },
  {
    binding: 'fireLeft',
    label: 'Fire left',
    icon: `${art}/icon_fire_left.png`,
  },
  {
    binding: 'fireRight',
    label: 'Fire right',
    icon: `${art}/icon_fire_right.png`,
  },
]

export function TouchControls({
  layout,
  sessionRef,
  store,
}: {
  layout: TouchLayout
  sessionRef: RefObject<GameSession | null>
  store: HudStore
}) {
  const running = useRunning(store)

  useEffect(() => {
    if (running) return
    sessionRef.current?.releaseTouch()
  }, [running, sessionRef])

  useEffect(() => {
    const session = sessionRef
    return () => {
      session.current?.releaseTouch()
    }
  }, [sessionRef])

  return (
    <div
      role="group"
      aria-label="Touch controls"
      inert={!running}
      style={overlay}
    >
      {pads.map((pad) => (
        <HoldButton
          key={pad.binding}
          binding={pad.binding}
          label={pad.label}
          icon={pad.icon}
          box={layout[pad.binding]}
          running={running}
          sessionRef={sessionRef}
        />
      ))}
    </div>
  )
}

function HoldButton({
  binding,
  label,
  icon,
  box,
  running,
  sessionRef,
}: {
  binding: TouchBinding
  label: string
  icon: string
  box: Box
  running: boolean
  sessionRef: RefObject<GameSession | null>
}) {
  const pointers = useRef(new Set<number>())
  const [held, setHeld] = useState(false)
  const [keyed, setKeyed] = useState(false)
  const [play, setPlay] = useState(running)
  if (play !== running) {
    setPlay(running)
    if (!running) setHeld(false)
  }

  useEffect(() => {
    if (running) return
    pointers.current.clear()
  }, [running])

  useEffect(() => {
    const ids = pointers
    const session = sessionRef
    return () => {
      ids.current.clear()
      session.current?.setTouch(binding, false)
    }
  }, [binding, sessionRef])

  const press = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!running) return
    event.preventDefault()
    capturePointer(event.currentTarget, event.pointerId)
    if (pointers.current.has(event.pointerId)) return
    pointers.current.add(event.pointerId)
    if (pointers.current.size > 1) return
    setHeld(true)
    sessionRef.current?.setTouch(binding, true)
  }

  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!pointers.current.delete(event.pointerId)) return
    if (pointers.current.size > 0) return
    setHeld(false)
    sessionRef.current?.setTouch(binding, false)
  }

  const leave = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) return
    release(event)
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={held}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onPointerLeave={leave}
      onContextMenu={(event) => event.preventDefault()}
      onFocus={(event) => {
        if (event.currentTarget.matches(':focus-visible')) setKeyed(true)
      }}
      onBlur={() => setKeyed(false)}
      style={buttonStyle(box, held, keyed)}
    >
      <img src={icon} alt="" draggable={false} style={iconStyle} />
    </button>
  )
}

function useRunning(store: HudStore): boolean {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getView().status === 'running',
    () => true,
  )
}

const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
}

const iconStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: '50%',
  height: '50%',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
  userSelect: 'none',
}

function capturePointer(button: HTMLButtonElement, pointerId: number) {
  try {
    button.setPointerCapture(pointerId)
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
  }
}

function buttonStyle(box: Box, down: boolean, keyed: boolean): CSSProperties {
  return {
    position: 'absolute',
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    margin: 0,
    padding: 0,
    border: 'none',
    backgroundColor: 'transparent',
    backgroundImage: `url(${down ? pressed : normal})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    pointerEvents: 'auto',
    cursor: 'pointer',
    outline: keyed ? '3px solid #e6c15a' : 'none',
    outlineOffset: 3,
  }
}
