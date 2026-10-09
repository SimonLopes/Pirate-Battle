import { wrapAngle } from '../core/math.ts'

export type Insets = {
  top: number
  right: number
  bottom: number
  left: number
}

export type Box = {
  x: number
  y: number
  w: number
  h: number
}

export type TouchBinding =
  'forward' | 'turnLeft' | 'turnRight' | 'fireFront' | 'fireLeft' | 'fireRight'

export type TouchBindings = Record<TouchBinding, boolean>

export type TouchLayout = {
  stick: Box
  knob: number
  fireFront: Box
  fireLeft: Box
  fireRight: Box
  pause: Box
}

export type StickAim = {
  x: number
  y: number
  radius: number
}

export type StickMove = {
  forward: boolean
  turnLeft: boolean
  turnRight: boolean
}

const preferred = 64
const minimum = 44
const gap = 10
const pad = 12
const edge = 8
const stickDeadZone = 0.2
const steerBand = 0.05

const idleStick: StickMove = {
  forward: false,
  turnLeft: false,
  turnRight: false,
}

export function stickMove(heading: number, aim: StickAim): StickMove {
  if (aim.radius <= 0) return idleStick
  const dist = Math.hypot(aim.x, aim.y)
  if (dist <= aim.radius * stickDeadZone) return idleStick
  const delta = wrapAngle(Math.atan2(aim.y, aim.x) - heading)
  if (delta <= -steerBand) {
    return { forward: true, turnLeft: true, turnRight: false }
  }
  if (delta >= steerBand) {
    return { forward: true, turnLeft: false, turnRight: true }
  }
  return { forward: true, turnLeft: false, turnRight: false }
}

function stickWell(size: number): number {
  return size * 2 + gap
}

export function idleTouch(): TouchBindings {
  return {
    forward: false,
    turnLeft: false,
    turnRight: false,
    fireFront: false,
    fireLeft: false,
    fireRight: false,
  }
}

export function stageFit(
  viewW: number,
  viewH: number,
  arenaW: number,
  arenaH: number,
): { scale: number; x: number; y: number } | null {
  if (viewW <= 0 || viewH <= 0 || arenaW <= 0 || arenaH <= 0) return null
  const scale = Math.min(viewW / arenaW, viewH / arenaH)
  return {
    scale,
    x: (viewW - arenaW * scale) / 2,
    y: (viewH - arenaH * scale) / 2,
  }
}

export function touchLayout(
  viewW: number,
  viewH: number,
  hudHeight: number,
  safe: Insets,
): TouchLayout | null {
  if (viewW < 1 || viewH < 1 || hudHeight < 1) return null
  const sides = viewW > viewH
  let size = preferred
  while (size > minimum && !fits(sides, size, viewW, viewH, hudHeight, safe)) {
    size -= 2
  }
  if (sides) return sideLayout(size, viewW, viewH, hudHeight, safe)
  return bottomLayout(size, viewW, viewH, hudHeight, safe)
}

function fits(
  sides: boolean,
  size: number,
  viewW: number,
  viewH: number,
  hudHeight: number,
  safe: Insets,
): boolean {
  const well = stickWell(size)
  if (sides) {
    const columnH = size * 4 + gap * 3
    if (hudHeight + pad + columnH + pad + safe.bottom > viewH) return false
    const left = Math.max(safe.left, edge)
    const right = viewW - Math.max(safe.right, edge) - size
    return left + well + pad <= right
  }
  const rowW = size * 3 + gap * 2
  const pauseY = viewH - Math.max(safe.bottom, edge) - pad - well
  if (pauseY < hudHeight + pad) return false
  const left = Math.max(safe.left, edge)
  const right = viewW - Math.max(safe.right, edge) - rowW
  return left + well + pad <= right
}

function sideLayout(
  size: number,
  viewW: number,
  viewH: number,
  hudHeight: number,
  safe: Insets,
): TouchLayout {
  const well = stickWell(size)
  const rightH = size * 4 + gap * 3
  const yRight = Math.max(
    hudHeight + pad,
    viewH - Math.max(safe.bottom, edge) - pad - rightH,
  )
  const leftX = Math.max(safe.left, edge)
  const rightX = viewW - Math.max(safe.right, edge) - size
  const yStick = yRight + rightH - well
  const step = size + gap
  return {
    stick: { x: leftX, y: yStick, w: well, h: well },
    knob: size,
    pause: { x: rightX, y: yRight, w: size, h: size },
    fireFront: { x: rightX, y: yRight + step, w: size, h: size },
    fireLeft: { x: rightX, y: yRight + step * 2, w: size, h: size },
    fireRight: { x: rightX, y: yRight + step * 3, w: size, h: size },
  }
}

function bottomLayout(
  size: number,
  viewW: number,
  viewH: number,
  hudHeight: number,
  safe: Insets,
): TouchLayout {
  const well = stickWell(size)
  const rowW = size * 3 + gap * 2
  const pauseY = Math.max(
    hudHeight + pad,
    viewH - Math.max(safe.bottom, edge) - pad - well,
  )
  const y = pauseY + size + gap
  const leftX = Math.max(safe.left, edge)
  const rightX = viewW - Math.max(safe.right, edge) - rowW
  return {
    stick: { x: leftX, y: pauseY, w: well, h: well },
    knob: size,
    pause: {
      x: rightX + (rowW - size) / 2,
      y: pauseY,
      w: size,
      h: size,
    },
    fireLeft: { x: rightX, y, w: size, h: size },
    fireFront: { x: rightX + size + gap, y, w: size, h: size },
    fireRight: { x: rightX + (size + gap) * 2, y, w: size, h: size },
  }
}
