import { Container, Graphics, Sprite } from 'pixi.js'
import type { Ball } from '../core/ball.ts'
import type { Ship } from '../core/ship.ts'
import type { World } from '../core/world.ts'
import type { EffectName, GameAssets } from './assets.ts'

export type Effects = {
  prime(world: World): void
  sync(world: World, dt: number): void
  tint(ship: Ship): number
  flameFrame(): 0 | 1
  destroy(): void
}

type Watch = {
  hp: number
  x: number
  y: number
}

type Flash = {
  view: Graphics
  life: number
}

type Boom = {
  sprite: Sprite
  life: number
}

const flashDuration = 0.08
const hitDuration = 0.14
const boomFrame = 0.08
const flameStep = 0.12
const maxStep = 0.05
const boomFrames: { name: EffectName; w: number; h: number }[] = [
  { name: 'explosion_1', w: 74, h: 75 },
  { name: 'explosion_2', w: 60, h: 59 },
  { name: 'explosion_3', w: 42, h: 41 },
]
const boomDuration = boomFrame * boomFrames.length

export function createEffects(
  layer: Container,
  textures: GameAssets['effects'],
): Effects {
  const seen = new Set<Ball>()
  const watched = new Map<Ship, Watch>()
  const hits = new Map<Ship, number>()
  const flashes: Flash[] = []
  const booms: Boom[] = []
  let flameTime = 0
  let dead = false

  const spawnFlash = (ball: Ball): void => {
    const flash = borrowFlash(layer, flashes)
    const muzzle = muzzleOf(ball)
    flash.life = flashDuration
    flash.view.visible = true
    flash.view.alpha = 1
    flash.view.position.set(muzzle.x, muzzle.y)
    flash.view.rotation = muzzle.rotation
    layer.addChild(flash.view)
  }

  const spawnBoom = (x: number, y: number): void => {
    const boom = borrowBoom(layer, booms)
    boom.life = boomDuration
    boom.sprite.visible = true
    boom.sprite.position.set(x, y)
    paintBoom(boom, textures)
    layer.addChild(boom.sprite)
  }

  const noteShip = (ship: Ship, live: Set<Ship>): void => {
    live.add(ship)
    const prev = watched.get(ship)
    if (prev && ship.hp < prev.hp) {
      if (ship.hp <= 0) {
        hits.delete(ship)
        spawnBoom(ship.x, ship.y)
      } else {
        hits.set(ship, hitDuration)
      }
    }
    watched.set(ship, { hp: ship.hp, x: ship.x, y: ship.y })
  }

  return {
    prime(world) {
      if (dead) return
      for (const ball of world.balls) seen.add(ball)
      watched.set(world.player, watchOf(world.player))
      for (const enemy of world.enemies) watched.set(enemy, watchOf(enemy))
    },
    sync(world, dt) {
      if (dead) return
      const step = dt > 0 ? Math.min(dt, maxStep) : 0
      flameTime += step
      tickFlashes(flashes, step)
      tickBooms(booms, textures, step)
      tickHits(hits, step)
      for (const ball of world.balls) {
        if (seen.has(ball)) continue
        seen.add(ball)
        spawnFlash(ball)
      }
      const liveBalls = new Set(world.balls)
      for (const ball of seen) {
        if (!liveBalls.has(ball)) seen.delete(ball)
      }
      const live = new Set<Ship>()
      noteShip(world.player, live)
      for (const enemy of world.enemies) noteShip(enemy, live)
      for (const ship of watched.keys()) {
        if (live.has(ship)) continue
        const prev = watched.get(ship)
        watched.delete(ship)
        hits.delete(ship)
        if (prev && prev.hp > 0) spawnBoom(prev.x, prev.y)
      }
    },
    tint(ship) {
      return hitTint(hits.get(ship))
    },
    flameFrame() {
      return Math.floor(flameTime / flameStep) % 2 === 0 ? 0 : 1
    },
    destroy() {
      if (dead) return
      dead = true
      for (const flash of flashes) flash.view.destroy()
      for (const boom of booms) {
        boom.sprite.destroy({ texture: false, textureSource: false })
      }
      flashes.length = 0
      booms.length = 0
      seen.clear()
      watched.clear()
      hits.clear()
    },
  }
}

function watchOf(ship: Ship): Watch {
  return { hp: ship.hp, x: ship.x, y: ship.y }
}

function muzzleOf(ball: Ball): { x: number; y: number; rotation: number } {
  const speed = Math.hypot(ball.vx, ball.vy)
  if (speed === 0) return { x: ball.x, y: ball.y, rotation: 0 }
  const back = ball.traveled / speed
  return {
    x: ball.x - ball.vx * back,
    y: ball.y - ball.vy * back,
    rotation: Math.atan2(ball.vy, ball.vx),
  }
}

function makeFlash(): Graphics {
  const view = new Graphics()
  view.ellipse(14, 0, 14, 6).fill({ color: 0xffd56a, alpha: 0.95 })
  view.circle(0, 0, 7).fill({ color: 0xfff8e4 })
  view.visible = false
  return view
}

function borrowFlash(layer: Container, flashes: Flash[]): Flash {
  for (const flash of flashes) {
    if (flash.life <= 0) return flash
  }
  const view = makeFlash()
  layer.addChild(view)
  const flash = { view, life: 0 }
  flashes.push(flash)
  return flash
}

function borrowBoom(layer: Container, booms: Boom[]): Boom {
  for (const boom of booms) {
    if (boom.life <= 0) return boom
  }
  const sprite = new Sprite()
  sprite.anchor.set(0.5)
  sprite.visible = false
  layer.addChild(sprite)
  const boom = { sprite, life: 0 }
  booms.push(boom)
  return boom
}

function paintBoom(boom: Boom, textures: GameAssets['effects']): void {
  const index = Math.min(
    boomFrames.length - 1,
    Math.floor((boomDuration - boom.life) / boomFrame),
  )
  const frame = boomFrames[index]
  if (!frame) return
  const into = boomDuration - boom.life - index * boomFrame
  boom.sprite.texture = textures[frame.name]
  boom.sprite.width = frame.w
  boom.sprite.height = frame.h
  boom.sprite.alpha =
    index === boomFrames.length - 1 ? Math.max(0, 1 - into / boomFrame) : 1
}

function tickFlashes(flashes: Flash[], dt: number): void {
  for (const flash of flashes) {
    if (flash.life <= 0) continue
    flash.life -= dt
    if (flash.life <= 0) {
      flash.view.visible = false
      continue
    }
    flash.view.alpha = flash.life / flashDuration
  }
}

function tickBooms(
  booms: Boom[],
  textures: GameAssets['effects'],
  dt: number,
): void {
  for (const boom of booms) {
    if (boom.life <= 0) continue
    boom.life -= dt
    if (boom.life <= 0) {
      boom.sprite.visible = false
      continue
    }
    paintBoom(boom, textures)
  }
}

function tickHits(hits: Map<Ship, number>, dt: number): void {
  for (const [ship, left] of hits) {
    const next = left - dt
    if (next <= 0) hits.delete(ship)
    else hits.set(ship, next)
  }
}

function hitTint(left: number | undefined): number {
  if (!left || left <= 0) return 0xffffff
  const t = left / hitDuration
  const g = Math.round(255 - 120 * t)
  const b = Math.round(255 - 150 * t)
  return 0xff0000 + g * 256 + b
}
