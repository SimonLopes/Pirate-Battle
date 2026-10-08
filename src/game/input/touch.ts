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
  insets: Insets
  forward: Box
  turnLeft: Box
  turnRight: Box
  fireFront: Box
  fireLeft: Box
  fireRight: Box
  pause: Box
}

export const zeroInsets: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

const preferred = 64
const minimum = 44
const gap = 10
const pad = 12
const edge = 8

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
  inset: Insets,
): { scale: number; x: number; y: number } | null {
  const availW = viewW - inset.left - inset.right
  const availH = viewH - inset.top - inset.bottom
  if (viewW <= 0 || viewH <= 0 || availW <= 0 || availH <= 0) return null
  const scale = Math.min(availW / arenaW, availH / arenaH)
  return {
    scale,
    x: inset.left + (availW - arenaW * scale) / 2,
    y: inset.top + (availH - arenaH * scale) / 2,
  }
}

export function touchLayout(
  viewW: number,
  viewH: number,
  hudHeight: number,
  safe: Insets,
  arena: { width: number; height: number },
): TouchLayout | null {
  if (viewW < 1 || viewH < 1 || hudHeight < 1) return null
  if (arena.width < 1 || arena.height < 1) return null
  const sides = viewW > viewH
  let size = preferred
  while (size > minimum && !fits(sides, size, viewW, viewH, hudHeight, safe)) {
    size -= 2
  }
  if (sides) return sideLayout(size, viewW, viewH, hudHeight, safe, arena)
  return bottomLayout(size, viewW, viewH, hudHeight, safe, arena)
}

function fits(
  sides: boolean,
  size: number,
  viewW: number,
  viewH: number,
  hudHeight: number,
  safe: Insets,
): boolean {
  if (sides) {
    const columnH = size * 4 + gap * 3
    if (hudHeight + pad + columnH + pad + safe.bottom > viewH) return false
    const left = Math.max(safe.left, edge)
    const right = viewW - Math.max(safe.right, edge) - size
    return left + size + pad <= right
  }
  const rowW = size * 3 + gap * 2
  const pauseY = viewH - Math.max(safe.bottom, edge) - pad - size * 2 - gap
  if (pauseY < hudHeight + pad) return false
  const left = Math.max(safe.left, edge)
  const right = viewW - Math.max(safe.right, edge) - rowW
  return left + rowW + pad <= right
}

function sideLayout(
  size: number,
  viewW: number,
  viewH: number,
  hudHeight: number,
  safe: Insets,
  arena: { width: number; height: number },
): TouchLayout {
  const leftH = size * 3 + gap * 2
  const rightH = size * 4 + gap * 3
  const yLeft = Math.max(
    hudHeight + pad,
    viewH - Math.max(safe.bottom, edge) - pad - leftH,
  )
  const yRight = Math.max(
    hudHeight + pad,
    viewH - Math.max(safe.bottom, edge) - pad - rightH,
  )
  const leftX = Math.max(safe.left, edge)
  const rightX = viewW - Math.max(safe.right, edge) - size
  const leftLimit = leftX + size + pad
  const rightLimit = rightX - pad
  const natural = arenaBox(viewW, viewH, arena, zeroInsets)
  const insets = { ...zeroInsets }
  if (natural.x < leftLimit || natural.x + natural.w > rightLimit) {
    insets.left = leftLimit
    insets.right = viewW - rightLimit
  }
  const step = size + gap
  return {
    insets,
    forward: { x: leftX, y: yLeft, w: size, h: size },
    turnLeft: { x: leftX, y: yLeft + step, w: size, h: size },
    turnRight: { x: leftX, y: yLeft + step * 2, w: size, h: size },
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
  arena: { width: number; height: number },
): TouchLayout {
  const rowW = size * 3 + gap * 2
  const y = Math.max(
    hudHeight + pad + size + gap,
    viewH - Math.max(safe.bottom, edge) - pad - size,
  )
  const leftX = Math.max(safe.left, edge)
  const rightX = viewW - Math.max(safe.right, edge) - rowW
  const pauseY = y - size - gap
  const limit = pauseY - pad
  const natural = arenaBox(viewW, viewH, arena, zeroInsets)
  const insets = { ...zeroInsets }
  if (natural.y + natural.h > limit) insets.bottom = viewH - limit
  return {
    insets,
    pause: {
      x: rightX + (rowW - size) / 2,
      y: pauseY,
      w: size,
      h: size,
    },
    turnLeft: { x: leftX, y, w: size, h: size },
    forward: { x: leftX + size + gap, y, w: size, h: size },
    turnRight: { x: leftX + (size + gap) * 2, y, w: size, h: size },
    fireLeft: { x: rightX, y, w: size, h: size },
    fireFront: { x: rightX + size + gap, y, w: size, h: size },
    fireRight: { x: rightX + (size + gap) * 2, y, w: size, h: size },
  }
}

function arenaBox(
  viewW: number,
  viewH: number,
  arena: { width: number; height: number },
  inset: Insets,
): Box {
  const fit = stageFit(viewW, viewH, arena.width, arena.height, inset)
  if (!fit) return { x: 0, y: 0, w: 0, h: 0 }
  return {
    x: fit.x,
    y: fit.y,
    w: arena.width * fit.scale,
    h: arena.height * fit.scale,
  }
}
