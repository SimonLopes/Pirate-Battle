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
import {
  stickMove,
  type Box,
  type StickAim,
  type TouchBinding,
  type TouchLayout,
} from './touch.ts'

const art = '/assets/png/default/ui/controls'
const faces = {
  normal: `${art}/button_round_normal.png`,
  hover: `${art}/button_round_hover.png`,
  pressed: `${art}/button_round_pressed.png`,
} as const

const roundArt = 64
const roundIcon = 32
const restOpacity = 0.7
const coverOpacity = 0.1

const pads: {
  binding: 'fireFront' | 'fireLeft' | 'fireRight'
  label: string
  icon: string
}[] = [
  {
    binding: 'fireFront',
    label: 'Tiro frontal',
    icon: `${art}/icon_fire_front.png`,
  },
  {
    binding: 'fireLeft',
    label: 'Tiro à esquerda',
    icon: `${art}/icon_fire_left.png`,
  },
  {
    binding: 'fireRight',
    label: 'Tiro à direita',
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
      aria-label="Controles de toque"
      inert={!running}
      style={overlay}
    >
      <Joystick
        box={layout.stick}
        knob={layout.knob}
        running={running}
        sessionRef={sessionRef}
        store={store}
      />
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
      <PauseButton
        box={layout.pause}
        running={running}
        sessionRef={sessionRef}
      />
    </div>
  )
}

function Joystick({
  box,
  knob,
  running,
  sessionRef,
  store,
}: {
  box: Box
  knob: number
  running: boolean
  sessionRef: RefObject<GameSession | null>
  store: HudStore
}) {
  const wellRef = useRef<HTMLDivElement>(null)
  const active = useRef<number | null>(null)
  const point = useRef({ x: 0, y: 0 })
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [tracking, setTracking] = useState(false)
  const [play, setPlay] = useState(running)
  const covered = useOnStick(store)
  if (play !== running) {
    setPlay(running)
    if (!running) {
      setTracking(false)
      setOffset({ x: 0, y: 0 })
    }
  }

  useEffect(() => {
    if (!tracking) return
    let frame = 0
    const tick = () => {
      frame = requestAnimationFrame(tick)
      const session = sessionRef.current
      const node = wellRef.current
      if (!session || !node || active.current === null) return
      applyStick(
        session,
        readStick(node, point.current.x, point.current.y, knob),
      )
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [knob, sessionRef, tracking])

  useEffect(() => {
    if (running) return
    const node = wellRef.current
    const pointerId = active.current
    active.current = null
    if (node && pointerId !== null) releaseCaptured(node, pointerId)
    clearStick(sessionRef.current)
  }, [running, sessionRef])

  useEffect(() => {
    const session = sessionRef
    return () => {
      active.current = null
      clearStick(session.current)
    }
  }, [sessionRef])

  const follow = (well: HTMLDivElement, clientX: number, clientY: number) => {
    point.current = { x: clientX, y: clientY }
    const aim = readStick(well, clientX, clientY, knob)
    setOffset({ x: aim.x, y: aim.y })
    const session = sessionRef.current
    if (!session) return
    applyStick(session, aim)
  }

  const press = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!running || active.current !== null) return
    event.preventDefault()
    capturePointer(event.currentTarget, event.pointerId)
    active.current = event.pointerId
    follow(event.currentTarget, event.clientX, event.clientY)
    setTracking(true)
  }

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (active.current !== event.pointerId) return
    event.preventDefault()
    follow(event.currentTarget, event.clientX, event.clientY)
  }

  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (active.current !== event.pointerId) return
    active.current = null
    setTracking(false)
    setOffset({ x: 0, y: 0 })
    clearStick(sessionRef.current)
  }

  return (
    <div
      ref={wellRef}
      role="group"
      aria-label="Direcional"
      onPointerDown={press}
      onPointerMove={move}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
      style={stickStyle(box, covered ? coverOpacity : 1)}
    >
      <span aria-hidden style={stickFace(tracking)} />
      <span aria-hidden style={knobStyle(knob, offset.x, offset.y, tracking)} />
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
  const [over, setOver] = useState(false)
  const [keyed, setKeyed] = useState(false)
  const [play, setPlay] = useState(running)
  if (play !== running) {
    setPlay(running)
    if (!running) {
      setHeld(false)
      setOver(false)
    }
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
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setOver(true)
      }}
      onPointerLeave={(event) => {
        setOver(false)
        leave(event)
      }}
      onContextMenu={(event) => event.preventDefault()}
      onFocus={(event) => {
        if (event.currentTarget.matches(':focus-visible')) setKeyed(true)
      }}
      onBlur={() => setKeyed(false)}
      style={buttonStyle(box, buttonFace(held, over), keyed)}
    >
      <img src={icon} alt="" draggable={false} style={iconStyle} />
    </button>
  )
}

function PauseButton({
  box,
  running,
  sessionRef,
}: {
  box: Box
  running: boolean
  sessionRef: RefObject<GameSession | null>
}) {
  const [down, setDown] = useState(false)
  const [over, setOver] = useState(false)
  const [keyed, setKeyed] = useState(false)
  const [play, setPlay] = useState(running)
  if (play !== running) {
    setPlay(running)
    if (!running) {
      setDown(false)
      setOver(false)
    }
  }

  return (
    <button
      type="button"
      aria-label="Pausar"
      onClick={() => {
        if (!running) return
        sessionRef.current?.pause()
      }}
      onPointerDown={() => {
        if (!running) return
        setDown(true)
      }}
      onPointerUp={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setOver(true)
      }}
      onPointerLeave={() => {
        setOver(false)
        setDown(false)
      }}
      onContextMenu={(event) => event.preventDefault()}
      onFocus={(event) => {
        if (event.currentTarget.matches(':focus-visible')) setKeyed(true)
      }}
      onBlur={() => setKeyed(false)}
      style={buttonStyle(box, buttonFace(down, over), keyed)}
    >
      <img
        src={`${art}/icon_pause.png`}
        alt=""
        draggable={false}
        style={iconStyle}
      />
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

function useOnStick(store: HudStore): boolean {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getView().onStick,
    () => false,
  )
}

const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  pointerEvents: 'none',
}

function stickFace(pressed: boolean): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'transparent',
    backgroundImage: `url(${faces.normal})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
    opacity: pressed ? 1 : restOpacity,
    pointerEvents: 'none',
  }
}

function stickStyle(box: Box, opacity: number): CSSProperties {
  return {
    position: 'absolute',
    left: box.x,
    top: box.y,
    width: box.w,
    height: box.h,
    opacity,
    transition: 'opacity 200ms ease',
    margin: 0,
    padding: 0,
    border: 'none',
    background: 'transparent',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    pointerEvents: 'auto',
  }
}

function knobStyle(
  size: number,
  x: number,
  y: number,
  pressed: boolean,
): CSSProperties {
  return {
    position: 'absolute',
    left: `calc(50% + ${x}px)`,
    top: `calc(50% + ${y}px)`,
    width: size,
    height: size,
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'transparent',
    backgroundImage: `url(${faces.normal})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
    opacity: pressed ? 1 : restOpacity,
    pointerEvents: 'none',
  }
}

const iconStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: `${(roundIcon / roundArt) * 100}%`,
  height: `${(roundIcon / roundArt) * 100}%`,
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
  userSelect: 'none',
}

function applyStick(session: GameSession, aim: StickAim) {
  if (session.world.status !== 'running') return
  const move = stickMove(session.world.player.heading, aim)
  session.setTouch('forward', move.forward)
  session.setTouch('turnLeft', move.turnLeft)
  session.setTouch('turnRight', move.turnRight)
}

function clearStick(session: GameSession | null) {
  if (!session) return
  session.setTouch('forward', false)
  session.setTouch('turnLeft', false)
  session.setTouch('turnRight', false)
}

function readStick(
  well: HTMLDivElement,
  clientX: number,
  clientY: number,
  knob: number,
): StickAim {
  const radius = Math.max(0, (well.clientWidth - knob) / 2)
  const rect = well.getBoundingClientRect()
  let x = clientX - (rect.left + rect.width / 2)
  let y = clientY - (rect.top + rect.height / 2)
  const dist = Math.hypot(x, y)
  if (dist > radius && dist > 0) {
    const scale = radius / dist
    x *= scale
    y *= scale
  }
  return { x, y, radius }
}

function capturePointer(target: HTMLElement, pointerId: number) {
  try {
    target.setPointerCapture(pointerId)
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
  }
}

function releaseCaptured(target: HTMLElement, pointerId: number) {
  try {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId)
    }
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
  }
}

function buttonFace(down: boolean, over: boolean): keyof typeof faces {
  if (down) return 'pressed'
  if (over) return 'hover'
  return 'normal'
}

function buttonStyle(
  box: Box,
  face: keyof typeof faces,
  keyed: boolean,
): CSSProperties {
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
    backgroundImage: `url(${faces[face]})`,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '100% 100%',
    touchAction: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    pointerEvents: 'auto',
    cursor: 'pointer',
    opacity: face === 'pressed' ? 1 : restOpacity,
    outline: keyed ? '3px solid #e6c15a' : 'none',
    outlineOffset: 3,
  }
}
