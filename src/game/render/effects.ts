import { Container, Graphics, Sprite, type Texture } from 'pixi.js'
import type { Ball } from '../core/ball.ts'
import type { Ship } from '../core/ship.ts'
import type { World } from '../core/world.ts'
import type { GameConfig } from '../config.ts'
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
  heading: number
  hull: number
}

type Flash = {
  view: Graphics
  life: number
}

type Boom = {
  sprite: Sprite
  life: number
}

type Puff = {
  view: Graphics
  life: number
  duration: number
}

type Ring = {
  view: Graphics
  life: number
  duration: number
  radius: number
}

type Wreck = {
  sprite: Sprite
  life: number
}

type Bit = {
  sprite: Sprite
  life: number
  duration: number
  vx: number
  vy: number
  spin: number
}

type Fx = GameConfig['fx']

const flashDuration = 0.08
const hitDuration = 0.14
const boomFrame = 0.08
const flameStep = 0.12
const maxStep = 0.05
const playerHull = 1
const chaserHull = 2
const shooterHull = 3
const wreckShift = 18
const artBow = Math.PI / 2
const trailDrops = 4
const boomFrames: { name: EffectName; w: number; h: number }[] = [
  { name: 'explosion_1', w: 74, h: 75 },
  { name: 'explosion_2', w: 60, h: 59 },
  { name: 'explosion_3', w: 42, h: 41 },
]
const boomDuration = boomFrame * boomFrames.length

export function createEffects(
  layer: Container,
  trailLayer: Container,
  wakeLayer: Container,
  shipLayer: Container,
  textures: GameAssets['effects'],
  sheet: GameAssets['ships'],
): Effects {
  const seen = new Set<Ball>()
  const watched = new Map<Ship, Watch>()
  const hits = new Map<Ship, number>()
  const trails = new Map<Ball, { x: number; y: number }>()
  const flashes: Flash[] = []
  const booms: Boom[] = []
  const puffs: Puff[] = []
  const rings: Ring[] = []
  const wrecks: Wreck[] = []
  const bits: Bit[] = []
  let flameTime = 0
  let pooled = false
  let dead = false

  const ensure = (fx: Fx): void => {
    if (pooled) return
    pooled = true
    for (let i = 0; i < fx.trailPool; i += 1) puffs.push(makePuff(trailLayer))
    for (let i = 0; i < fx.splashPool; i += 1) rings.push(makeRing(wakeLayer))
    for (let i = 0; i < fx.wreckPool; i += 1) wrecks.push(makeWreck(shipLayer))
    const count = fx.wreckPool * (fx.woodCount + fx.crewCount)
    for (let i = 0; i < count; i += 1) bits.push(makeBit(shipLayer))
  }

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

  const layTrail = (ball: Ball, fx: Fx): void => {
    const trail = trails.get(ball)
    if (!trail) {
      trails.set(ball, { x: ball.x, y: ball.y })
      return
    }
    const dx = ball.x - trail.x
    const dy = ball.y - trail.y
    const dist = Math.hypot(dx, dy)
    if (dist < fx.trailGap || dist === 0) return
    const nx = dx / dist
    const ny = dy / dist
    for (let placed = 0; placed < trailDrops; placed += 1) {
      const left = Math.hypot(ball.x - trail.x, ball.y - trail.y)
      if (left < fx.trailGap) break
      const puff = free(puffs)
      if (!puff) break
      puff.life = fx.trailLife
      puff.duration = fx.trailLife
      puff.view.visible = true
      puff.view.alpha = 1
      puff.view.scale.set(1)
      puff.view.position.set(trail.x, trail.y)
      puff.view.rotation = Math.atan2(ny, nx)
      trail.x += nx * fx.trailGap
      trail.y += ny * fx.trailGap
    }
  }

  const spawnSplash = (x: number, y: number, fx: Fx): void => {
    const ring = free(rings)
    if (!ring) return
    ring.life = fx.splashLife
    ring.duration = fx.splashLife
    ring.radius = fx.splashRadius
    ring.view.visible = true
    ring.view.alpha = 1
    ring.view.scale.set(fx.splashRadius * 0.35)
    ring.view.position.set(x, y)
  }

  const sink = (
    x: number,
    y: number,
    heading: number,
    hull: number,
    fx: Fx,
  ): void => {
    spawnBoom(x, y)
    const wreck = free(wrecks)
    if (wreck) {
      wreck.life = fx.wreckHold
      wreck.sprite.texture = sheetTexture(
        sheet,
        `ship_${hull + wreckShift}.png`,
      )
      wreck.sprite.position.set(x, y)
      wreck.sprite.rotation = heading - artBow
      wreck.sprite.alpha = 1
      wreck.sprite.visible = true
    }
    const total = fx.woodCount + fx.crewCount
    for (let i = 0; i < total; i += 1) {
      const bit = free(bits)
      if (!bit) break
      const angle = heading + (i + 0.5) * ((Math.PI * 2) / total)
      const speed = fx.debrisSpeed * (0.55 + (i % 4) * 0.15)
      bit.life = fx.debrisLife
      bit.duration = fx.debrisLife
      bit.vx = Math.cos(angle) * speed
      bit.vy = Math.sin(angle) * speed
      bit.spin = (i % 2 === 0 ? 1 : -1) * (1.2 + (i % 3) * 0.45)
      bit.sprite.texture = sheetTexture(sheet, pieceName(i, fx.woodCount))
      bit.sprite.position.set(
        x + Math.cos(angle) * (8 + (i % 3) * 5),
        y + Math.sin(angle) * (8 + (i % 3) * 5),
      )
      bit.sprite.rotation = angle
      bit.sprite.alpha = 1
      bit.sprite.visible = true
    }
  }

  const noteShip = (
    ship: Ship,
    hull: number,
    live: Set<Ship>,
    fx: Fx,
  ): void => {
    live.add(ship)
    const prev = watched.get(ship)
    if (prev && ship.hp < prev.hp) {
      if (ship.hp <= 0) {
        hits.delete(ship)
        sink(ship.x, ship.y, ship.heading, hull, fx)
      } else hits.set(ship, hitDuration)
    }
    watched.set(ship, {
      hp: ship.hp,
      x: ship.x,
      y: ship.y,
      heading: ship.heading,
      hull,
    })
  }

  return {
    prime(world) {
      if (dead) return
      for (const ball of world.balls) seen.add(ball)
      watched.set(world.player, watchOf(world.player, playerHull))
      for (const enemy of world.enemies) {
        const hull = enemy.type === 'chaser' ? chaserHull : shooterHull
        watched.set(enemy, watchOf(enemy, hull))
      }
    },
    sync(world, dt) {
      if (dead) return
      const fx = world.config.fx
      ensure(fx)
      const step = dt > 0 ? Math.min(dt, maxStep) : 0
      flameTime += step
      tickFlashes(flashes, step)
      tickBooms(booms, textures, step)
      tickHits(hits, step)
      tickPuffs(puffs, step)
      tickRings(rings, step)
      tickWrecks(wrecks, step)
      tickBits(bits, step)
      for (const ball of world.balls) {
        if (!seen.has(ball)) {
          seen.add(ball)
          spawnFlash(ball)
        }
        layTrail(ball, fx)
      }
      const liveBalls = new Set(world.balls)
      for (const ball of seen) {
        if (liveBalls.has(ball)) continue
        seen.delete(ball)
        trails.delete(ball)
        if (ball.lifetime <= 0 || ball.traveled > world.config.ball.range) {
          spawnSplash(ball.x, ball.y, fx)
        }
      }
      const live = new Set<Ship>()
      noteShip(world.player, playerHull, live, fx)
      for (const enemy of world.enemies) {
        const hull = enemy.type === 'chaser' ? chaserHull : shooterHull
        noteShip(enemy, hull, live, fx)
      }
      for (const ship of watched.keys()) {
        if (live.has(ship)) continue
        const prev = watched.get(ship)
        watched.delete(ship)
        hits.delete(ship)
        if (prev && prev.hp > 0) {
          sink(prev.x, prev.y, prev.heading, prev.hull, fx)
        }
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
      for (const puff of puffs) puff.view.destroy()
      for (const ring of rings) ring.view.destroy()
      for (const wreck of wrecks) {
        wreck.sprite.destroy({ texture: false, textureSource: false })
      }
      for (const bit of bits) {
        bit.sprite.destroy({ texture: false, textureSource: false })
      }
      flashes.length = 0
      booms.length = 0
      puffs.length = 0
      rings.length = 0
      wrecks.length = 0
      bits.length = 0
      seen.clear()
      watched.clear()
      hits.clear()
      trails.clear()
    },
  }
}

function watchOf(ship: Ship, hull: number): Watch {
  return {
    hp: ship.hp,
    x: ship.x,
    y: ship.y,
    heading: ship.heading,
    hull,
  }
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

function makePuff(layer: Container): Puff {
  const view = new Graphics()
  view.ellipse(0, 0, 7, 2).fill({ color: 0xffffff, alpha: 0.92 })
  view.visible = false
  layer.addChild(view)
  return { view, life: 0, duration: 0 }
}

function makeRing(layer: Container): Ring {
  const view = new Graphics()
  view.circle(0, 0, 1).stroke({ width: 0.14, color: 0xffffff, alpha: 0.9 })
  view.circle(0, 0, 0.62).stroke({ width: 0.08, color: 0xdff6ff, alpha: 0.7 })
  view.visible = false
  layer.addChild(view)
  return { view, life: 0, duration: 0, radius: 0 }
}

function makeWreck(layer: Container): Wreck {
  const sprite = new Sprite()
  sprite.anchor.set(0.5)
  sprite.visible = false
  layer.addChild(sprite)
  return { sprite, life: 0 }
}

function makeBit(layer: Container): Bit {
  const sprite = new Sprite()
  sprite.anchor.set(0.5)
  sprite.visible = false
  layer.addChild(sprite)
  return { sprite, life: 0, duration: 0, vx: 0, vy: 0, spin: 0 }
}

function free<T extends { life: number }>(items: readonly T[]): T | null {
  let oldest: T | undefined
  for (const item of items) {
    if (item.life <= 0) return item
    if (!oldest || item.life < oldest.life) oldest = item
  }
  return oldest ?? null
}

function sheetTexture(sheet: GameAssets['ships'], name: string): Texture {
  const texture = sheet.textures[name]
  if (!texture) throw new Error(`${name} is missing`)
  return texture
}

function pieceName(index: number, woodCount: number): string {
  if (index < woodCount) return `wood_${(index % 4) + 1}.png`
  return `crew_${((index - woodCount) % 6) + 1}.png`
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

function tickPuffs(puffs: Puff[], dt: number): void {
  for (const puff of puffs) {
    if (puff.life <= 0) continue
    puff.life -= dt
    if (puff.life <= 0 || puff.duration <= 0) {
      puff.view.visible = false
      continue
    }
    const t = puff.life / puff.duration
    puff.view.alpha = t
    puff.view.scale.set(0.45 + 0.55 * t)
  }
}

function tickRings(rings: Ring[], dt: number): void {
  for (const ring of rings) {
    if (ring.life <= 0) continue
    ring.life -= dt
    if (ring.life <= 0 || ring.duration <= 0) {
      ring.view.visible = false
      continue
    }
    const t = 1 - ring.life / ring.duration
    ring.view.alpha = 1 - t
    ring.view.scale.set(ring.radius * (0.35 + 0.65 * t))
  }
}

function tickWrecks(wrecks: Wreck[], dt: number): void {
  for (const wreck of wrecks) {
    if (wreck.life <= 0) continue
    wreck.life -= dt
    if (wreck.life <= 0) wreck.sprite.visible = false
  }
}

function tickBits(bits: Bit[], dt: number): void {
  for (const bit of bits) {
    if (bit.life <= 0) continue
    bit.life -= dt
    if (bit.life <= 0 || bit.duration <= 0) {
      bit.sprite.visible = false
      continue
    }
    bit.sprite.alpha = bit.life / bit.duration
    bit.sprite.x += bit.vx * dt
    bit.sprite.y += bit.vy * dt
    bit.sprite.rotation += bit.spin * dt
  }
}

function hitTint(left: number | undefined): number {
  if (!left || left <= 0) return 0xffffff
  const t = left / hitDuration
  const g = Math.round(255 - 120 * t)
  const b = Math.round(255 - 150 * t)
  return 0xff0000 + g * 256 + b
}
