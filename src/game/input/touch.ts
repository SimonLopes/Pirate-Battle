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

type StickMove = {
  forward: boolean
  turnLeft: boolean
  turnRight: boolean
}

const preferred = 64
const minimum = 44
const gap = 10
const pauseGap = 28
const pad = 12
const edge = 8
const stickDeadZone = 0.2
const steerBand = 0.05
const smallView = 440
const smallWell = 1.7
const smallKnob = 0.8

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

function stickWell(size: number, isSmall: boolean): number {
  if (isSmall) return Math.round(size * smallWell)
  return size * 2 + gap
}

function stickKnob(size: number, isSmall: boolean): number {
  if (isSmall) return Math.round(size * smallKnob)
  return size
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
  const isSmall = sides && viewH < smallView
  let size = preferred
  while (
    size > minimum &&
    !fits(sides, isSmall, size, viewW, viewH, hudHeight, safe)
  ) {
    size -= 2
  }
  if (sides) return sideLayout(size, isSmall, viewW, viewH, hudHeight, safe)
  return bottomLayout(size, viewW, viewH, hudHeight, safe)
}

function fits(
  sides: boolean,
  isSmall: boolean,
  size: number,
  viewW: number,
  viewH: number,
  hudHeight: number,
  safe: Insets,
): boolean {
  const well = stickWell(size, isSmall)
  if (sides) {
    const columnH = sideColumn(size)
    if (hudHeight + pad + columnH + pad + safe.bottom > viewH) return false
    const left = Math.max(safe.left, edge)
    const right = viewW - Math.max(safe.right, edge) - size
    return left + well + pad <= right
  }
  const rowW = size * 3 + gap * 2
  const pauseY =
    viewH - Math.max(safe.bottom, edge) - pad - bottomHeight(size, well)
  if (pauseY < hudHeight + pad) return false
  const left = Math.max(safe.left, edge)
  const right = viewW - Math.max(safe.right, edge) - rowW
  return left + well + pad <= right
}

function sideLayout(
  size: number,
  isSmall: boolean,
  viewW: number,
  viewH: number,
  hudHeight: number,
  safe: Insets,
): TouchLayout {
  const well = stickWell(size, isSmall)
  const rightH = sideColumn(size)
  const yRight = Math.max(
    hudHeight + pad,
    viewH - Math.max(safe.bottom, edge) - pad - rightH,
  )
  const leftX = Math.max(safe.left, edge)
  const rightX = viewW - Math.max(safe.right, edge) - size
  const yStick = isSmall
    ? viewH - Math.max(safe.bottom, edge) - edge - well
    : yRight + rightH - well
  const step = size + gap
  const yFire = yRight + size + pauseGap
  return {
    stick: { x: leftX, y: yStick, w: well, h: well },
    knob: stickKnob(size, isSmall),
    pause: { x: rightX, y: yRight, w: size, h: size },
    fireFront: { x: rightX, y: yFire, w: size, h: size },
    fireLeft: { x: rightX, y: yFire + step, w: size, h: size },
    fireRight: { x: rightX, y: yFire + step * 2, w: size, h: size },
  }
}

function sideColumn(size: number): number {
  return size * 4 + gap * 2 + pauseGap
}

function bottomHeight(size: number, well: number): number {
  return Math.max(well, size * 2 + pauseGap)
}

function bottomLayout(
  size: number,
  viewW: number,
  viewH: number,
  hudHeight: number,
  safe: Insets,
): TouchLayout {
  const well = stickWell(size, false)
  const rowW = size * 3 + gap * 2
  const height = bottomHeight(size, well)
  const pauseY = Math.max(
    hudHeight + pad,
    viewH - Math.max(safe.bottom, edge) - pad - height,
  )
  const y = pauseY + size + pauseGap
  const leftX = Math.max(safe.left, edge)
  const rightX = viewW - Math.max(safe.right, edge) - rowW
  return {
    stick: { x: leftX, y: pauseY + height - well, w: well, h: well },
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
