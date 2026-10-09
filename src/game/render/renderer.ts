import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Texture,
  TilingSprite,
} from 'pixi.js'
import type { Ball } from '../core/ball.ts'
import type { Collider } from '../core/collider.ts'
import type { Enemy } from '../core/enemy.ts'
import { hullBody, type Ship } from '../core/ship.ts'
import type { World } from '../core/world.ts'
import type { ArenaMap } from '../arena.ts'
import { loadAssets, type BarName, type GameAssets } from './assets.ts'
import { createEffects, type Effects } from './effects.ts'

export type Renderer = {
  draw(world: World, dt: number): void
  destroy(): void
}

type BarStyle = {
  frame: Texture
  green: Texture
  amber: Texture | null
  red: Texture
  artWidth: number
  fillX: number
  fillW: number
  width: number
  greenAbove: number
  amberAbove: number
}

type ShipMark = {
  hull: Sprite
  flames: Sprite[]
  bar: Container
  fill: Sprite
  crop: Texture
  style: BarStyle
}

type Foam = {
  view: Graphics
  life: number
}

type Trail = {
  x: number
  y: number
  phase: number
  along: number
  head: Foam | null
  push: number
}

type Sea = {
  time: number
  step: number
  trails: Map<Ship, Trail>
  live: Set<Ship>
  nextPhase: number
  foams: Foam[]
  wakes: Container
}

type Ride = {
  bob: number
  tilt: number
  moving: boolean
  dx: number
  dy: number
}

const sheetColumns = 16
const waterTile = 73
const playerHull = 1
const chaserHull = 2
const shooterHull = 3
const hullSpan = 6
const cannonBall = 'cannon_ball.png'
const artBow = Math.PI / 2
const barGap = 6
const intactAbove = 2 / 3
const wornAbove = 1 / 3
const flameSpots = [
  { x: -8, y: 22 },
  { x: 10, y: 36 },
]
const flameSizes = [
  { w: 14, h: 30 },
  { w: 10, h: 22 },
]
const bobAmp = 2
const bobTilt = 0.035
const bobRate = 1.7
const bobCycle = (Math.PI * 2) / bobRate
const moved = 0.75
const idleHold = 0.12
const wakeGap = 18
const wakeStern = 46
const wakeLife = 0.55
const frameCap = 0.05
const phaseStep = 2.4
const debugStroke = { width: 1, color: 0x7dff6a, pixelLine: true }

export function createRenderer(stage: Container, debug: boolean): Renderer {
  const root = new Container()
  const arenaLayer = new Container()
  const wakeLayer = new Container()
  const shipsLayer = new Container()
  const trailLayer = new Container()
  const ballLayer = new Container()
  const effectLayer = new Container()
  const barLayer = new Container()
  const debugView = debug ? new Graphics() : null
  root.addChild(
    arenaLayer,
    wakeLayer,
    shipsLayer,
    trailLayer,
    ballLayer,
    effectLayer,
    barLayer,
  )
  if (debugView) root.addChild(debugView)
  stage.addChild(root)

  const frames = new Map<number, Texture>()
  const enemyMarks: ShipMark[] = []
  const ballSprites: Sprite[] = []
  const sea: Sea = {
    time: 0,
    step: 0,
    trails: new Map(),
    live: new Set(),
    nextPhase: 0,
    foams: [],
    wakes: wakeLayer,
  }
  let destroyed = false
  let ready = false
  let assets: GameAssets | null = null
  let ballTexture: Texture | null = null
  let playerMark: ShipMark | null = null
  let enemyBars: BarStyle | null = null
  let fx: Effects | null = null

  void loadAssets(() => undefined).then(
    (loaded) => {
      if (destroyed) return
      assets = loaded
    },
    () => {
      ready = true
    },
  )

  return {
    draw(world, dt) {
      if (destroyed) return
      if (debugView) paintColliders(debugView, world)
      if (!ready) {
        if (!assets) return
        ready = true
        paintArena(arenaLayer, assets.tiles, frames, assets.arena)
        ballTexture = cannonBallTexture(assets.ships)
        playerMark = createMark(shipsLayer, barLayer, playerStyle(assets.bars))
        enemyBars = enemyStyle(assets.bars)
        fx = createEffects(
          effectLayer,
          trailLayer,
          wakeLayer,
          shipsLayer,
          assets.effects,
          assets.ships,
        )
        fx.prime(world)
      }
      if (!assets || !playerMark || !ballTexture || !enemyBars || !fx) return
      sea.step = dt > 0 ? Math.min(dt, frameCap) : 0
      sea.time = wrap(sea.time + sea.step, bobCycle)
      sea.live.clear()
      tickFoams(sea.foams, sea.step)
      fx.sync(world, dt)
      placeMark(
        playerMark,
        world.player,
        world.config.ships.player.hp,
        playerHull,
        assets.ships,
        assets.effects,
        fx,
        sea,
      )
      placeEnemies(
        shipsLayer,
        barLayer,
        assets.ships,
        assets.effects,
        enemyBars,
        enemyMarks,
        world,
        fx,
        sea,
      )
      placeBalls(ballLayer, ballTexture, ballSprites, world.balls)
      dropTrails(sea)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      fx?.destroy()
      for (const foam of sea.foams) foam.view.destroy()
      sea.foams.length = 0
      const crops = enemyMarks.map((mark) => mark.crop)
      if (playerMark) crops.push(playerMark.crop)
      root.destroy({ children: true })
      for (const crop of crops) crop.destroy(false)
      for (const texture of frames.values()) texture.destroy(false)
      frames.clear()
      sea.trails.clear()
      sea.live.clear()
    },
  }
}

function paintArena(
  root: Container,
  sheet: Texture,
  frames: Map<number, Texture>,
  map: ArenaMap,
): void {
  const arena = new Container()
  const tile = tileTexture(sheet, frames, waterTile)
  const scale = map.tileSize / tile.frame.width
  arena.addChild(
    new TilingSprite({
      texture: tile,
      width: map.width * map.tileSize,
      height: map.height * map.tileSize,
      tileScale: { x: scale, y: scale },
    }),
  )
  paintCells(arena, sheet, frames, map.shallow, map)
  paintCells(arena, sheet, frames, map.ground, map)
  for (const decor of map.decor) {
    const sprite = new Sprite(tileTexture(sheet, frames, decor.id))
    sprite.position.set(
      decor.x * map.tileSize + decor.offsetX,
      decor.y * map.tileSize + decor.offsetY,
    )
    sprite.width = map.tileSize
    sprite.height = map.tileSize
    arena.addChild(sprite)
  }
  root.addChild(arena)
  arena.cacheAsTexture(true)
}

function paintCells(
  root: Container,
  sheet: Texture,
  frames: Map<number, Texture>,
  cells: readonly number[],
  map: ArenaMap,
): void {
  for (let i = 0; i < cells.length; i += 1) {
    const id = cells[i]
    if (!id) continue
    putTile(
      root,
      sheet,
      frames,
      i % map.width,
      Math.floor(i / map.width),
      id,
      map.tileSize,
    )
  }
}

function putTile(
  root: Container,
  sheet: Texture,
  frames: Map<number, Texture>,
  x: number,
  y: number,
  id: number,
  tileSize: number,
): void {
  const sprite = new Sprite(tileTexture(sheet, frames, id))
  sprite.position.set(x * tileSize, y * tileSize)
  sprite.width = tileSize
  sprite.height = tileSize
  root.addChild(sprite)
}

function playerStyle(bars: Record<BarName, Texture>): BarStyle {
  return {
    frame: bars.health_frame,
    green: bars.health_fill_green,
    amber: bars.health_fill_amber,
    red: bars.health_fill_red,
    artWidth: 256,
    fillX: 30,
    fillW: 196,
    width: 96,
    greenAbove: intactAbove,
    amberAbove: wornAbove,
  }
}

function enemyStyle(bars: Record<BarName, Texture>): BarStyle {
  return {
    frame: bars.enemy_health_frame,
    green: bars.enemy_health_fill_green,
    amber: null,
    red: bars.enemy_health_fill_red,
    artWidth: 160,
    fillX: 24,
    fillW: 112,
    width: 72,
    greenAbove: 0.5,
    amberAbove: 0,
  }
}

function createMark(
  ships: Container,
  bars: Container,
  style: BarStyle,
): ShipMark {
  const hull = new Sprite()
  hull.anchor.set(0.5)
  const flames = flameSpots.map((spot) => {
    const flame = new Sprite()
    flame.anchor.set(0.5, 1)
    flame.position.set(spot.x, spot.y)
    flame.visible = false
    hull.addChild(flame)
    return flame
  })
  ships.addChild(hull)

  const crop = new Texture({
    source: style.green.source,
    frame: new Rectangle(0, 0, style.frame.width, style.frame.height),
    dynamic: true,
  })
  const bar = new Container()
  const frame = new Sprite(style.frame)
  const fill = new Sprite(crop)
  bar.addChild(frame, fill)
  bar.scale.set(style.width / style.frame.width)
  bars.addChild(bar)
  return { hull, flames, bar, fill, crop, style }
}

function placeMark(
  mark: ShipMark,
  ship: Ship,
  maxHp: number,
  hullBase: number,
  sheet: GameAssets['ships'],
  effects: GameAssets['effects'],
  fx: Effects,
  sea: Sea,
): void {
  if (ship.hp <= 0) {
    hideMark(mark)
    return
  }
  const ratio = maxHp > 0 ? Math.min(1, Math.max(0, ship.hp / maxHp)) : 0
  const ride = rideOf(sea, ship)
  mark.hull.visible = true
  mark.bar.visible = true
  mark.hull.texture = hullTexture(sheet, hullBase, ratio)
  mark.hull.tint = fx.tint(ship)
  mark.hull.position.set(ship.x, ship.y + ride.bob)
  mark.hull.rotation = ship.heading - artBow + ride.tilt
  layWake(sea, ship, ride)
  placeFlames(mark, ratio > 0 && ratio <= wornAbove, fx.flameFrame(), effects)
  const texW = mark.style.frame.width
  const texH = mark.style.frame.height
  clipFill(mark, ratio, texW, texH)
  const scale = mark.bar.scale.x
  const hullH = mark.hull.texture.height
  mark.bar.rotation = 0
  mark.bar.position.set(
    ship.x - (texW * scale) / 2,
    ship.y - hullH / 2 - barGap - texH * scale,
  )
}

function clipFill(
  mark: ShipMark,
  ratio: number,
  texW: number,
  texH: number,
): void {
  const clip = fillClip(mark.style, ratio, texW)
  const crop = mark.crop
  const next = pickFill(mark.style, ratio)
  mark.fill.visible = clip > 0
  if (clip <= 0) return
  let dirty = crop.frame.width !== clip || crop.frame.height !== texH
  if (crop.source !== next.source) {
    crop.source = next.source
    dirty = true
  }
  if (!dirty) return
  crop.frame.width = clip
  crop.frame.height = texH
  crop.update()
}

function fillClip(style: BarStyle, ratio: number, texW: number): number {
  if (ratio <= 0) return 0
  if (ratio >= 1) return texW
  const unit = texW / style.artWidth
  return (style.fillX + style.fillW * ratio) * unit
}

function pickFill(style: BarStyle, ratio: number): Texture {
  if (ratio > style.greenAbove) return style.green
  if (style.amber && ratio > style.amberAbove) return style.amber
  return style.red
}

function hullStage(ratio: number): number {
  if (ratio <= 0) return 3
  if (ratio <= wornAbove) return 2
  if (ratio <= intactAbove) return 1
  return 0
}

function hullTexture(
  sheet: GameAssets['ships'],
  base: number,
  ratio: number,
): Texture {
  return shipTexture(sheet, `ship_${base + hullStage(ratio) * hullSpan}.png`)
}

function placeFlames(
  mark: ShipMark,
  burning: boolean,
  frame: 0 | 1,
  effects: GameAssets['effects'],
): void {
  for (let i = 0; i < mark.flames.length; i += 1) {
    const flame = mark.flames[i]
    if (!flame) continue
    if (!burning) {
      flame.visible = false
      continue
    }
    const slot = (frame + i) % 2 === 0 ? 0 : 1
    const size = flameSizes[slot]
    if (!size) continue
    flame.texture = slot === 0 ? effects.fire_1 : effects.fire_2
    flame.width = size.w
    flame.height = size.h
    flame.visible = true
  }
}

function hideMark(mark: ShipMark): void {
  mark.hull.visible = false
  mark.hull.tint = 0xffffff
  mark.bar.visible = false
  for (const flame of mark.flames) flame.visible = false
}

function shipTexture(sheet: GameAssets['ships'], name: string): Texture {
  const texture = sheet.textures[name]
  if (!texture) throw new Error(`${name} is missing`)
  return texture
}

function cannonBallTexture(sheet: GameAssets['ships']): Texture {
  return shipTexture(sheet, cannonBall)
}

function placeEnemies(
  ships: Container,
  bars: Container,
  sheet: GameAssets['ships'],
  effects: GameAssets['effects'],
  style: BarStyle,
  marks: ShipMark[],
  world: World,
  fx: Effects,
  sea: Sea,
): void {
  const enemies = world.enemies
  while (marks.length < enemies.length) {
    marks.push(createMark(ships, bars, style))
  }
  for (let i = 0; i < marks.length; i += 1) {
    const mark = marks[i]
    if (!mark) continue
    const enemy = enemies[i]
    if (!enemy) {
      hideMark(mark)
      continue
    }
    placeMark(
      mark,
      enemy,
      maxHp(world, enemy),
      hullBase(enemy),
      sheet,
      effects,
      fx,
      sea,
    )
  }
}

function maxHp(world: World, enemy: Enemy): number {
  return enemy.type === 'chaser'
    ? world.config.ships.chaser.hp
    : world.config.ships.shooter.hp
}

function hullBase(enemy: Enemy): number {
  return enemy.type === 'chaser' ? chaserHull : shooterHull
}

function placeBalls(
  root: Container,
  texture: Texture,
  sprites: Sprite[],
  balls: readonly Ball[],
): void {
  while (sprites.length < balls.length) {
    const sprite = new Sprite(texture)
    sprite.anchor.set(0.5)
    root.addChild(sprite)
    sprites.push(sprite)
  }
  for (let i = 0; i < sprites.length; i += 1) {
    const sprite = sprites[i]
    if (!sprite) continue
    const ball = balls[i]
    if (!ball) {
      sprite.visible = false
      continue
    }
    sprite.visible = true
    sprite.position.set(ball.x, ball.y)
  }
}

function rideOf(sea: Sea, ship: Ship): Ride {
  sea.live.add(ship)
  const prev = sea.trails.get(ship)
  if (!prev) {
    const phase = sea.nextPhase
    sea.nextPhase += phaseStep
    sea.trails.set(ship, {
      x: ship.x,
      y: ship.y,
      phase,
      along: 0,
      head: null,
      push: idleHold,
    })
    return bobRide(sea.time, phase)
  }
  const dx = ship.x - prev.x
  const dy = ship.y - prev.y
  const travel = Math.hypot(dx, dy)
  if (travel > moved) {
    prev.x = ship.x
    prev.y = ship.y
    prev.push = 0
    return { bob: 0, tilt: 0, moving: true, dx, dy }
  }
  prev.push += sea.step
  if (prev.push < idleHold) {
    return { bob: 0, tilt: 0, moving: true, dx: 0, dy: 0 }
  }
  return bobRide(sea.time, prev.phase)
}

function bobRide(time: number, phase: number): Ride {
  const wave = Math.sin(time * bobRate + phase)
  return {
    bob: wave * bobAmp,
    tilt: wave * bobTilt,
    moving: false,
    dx: 0,
    dy: 0,
  }
}

function layWake(sea: Sea, ship: Ship, ride: Ride): void {
  const trail = sea.trails.get(ship)
  if (!trail) return
  if (!ride.moving) {
    trail.head = null
    trail.along = 0
    return
  }
  let head = trail.head
  if (!head || head.life <= 0) {
    head = borrowFoam(sea)
    trail.head = head
  }
  head.life = wakeLife
  head.view.visible = true
  head.view.alpha = 1
  head.view.scale.set(1)
  const cos = Math.cos(ship.heading)
  const sin = Math.sin(ship.heading)
  head.view.position.set(ship.x - cos * wakeStern, ship.y - sin * wakeStern)
  head.view.rotation = ship.heading - artBow
  trail.along += Math.hypot(ride.dx, ride.dy)
  if (trail.along < wakeGap) return
  trail.along = 0
  trail.head = null
}

function borrowFoam(sea: Sea): Foam {
  for (const foam of sea.foams) {
    if (foam.life <= 0) return foam
  }
  const view = makeWake()
  sea.wakes.addChild(view)
  const foam = { view, life: 0 }
  sea.foams.push(foam)
  return foam
}

function tickFoams(foams: Foam[], step: number): void {
  for (const foam of foams) {
    if (foam.life <= 0) continue
    foam.life -= step
    if (foam.life <= 0) {
      foam.view.visible = false
      continue
    }
    const left = foam.life / wakeLife
    foam.view.alpha = 0.2 + 0.8 * left
    foam.view.scale.set(1.08 - 0.08 * left, 1.16 - 0.16 * left)
  }
}

function makeWake(): Graphics {
  const wake = new Graphics()
  wake.ellipse(0, 6, 3, 18).fill({ color: 0xffffff, alpha: 0.7 })
  wake.ellipse(-4, -8, 5, 14).fill({ color: 0xe7f5ff, alpha: 0.45 })
  wake.ellipse(4, -8, 5, 14).fill({ color: 0xe7f5ff, alpha: 0.45 })
  wake.ellipse(-9, -22, 4, 8).fill({ color: 0xf4fbff, alpha: 0.28 })
  wake.ellipse(9, -22, 4, 8).fill({ color: 0xf4fbff, alpha: 0.28 })
  wake.visible = false
  return wake
}

function dropTrails(sea: Sea): void {
  for (const ship of sea.trails.keys()) {
    if (!sea.live.has(ship)) sea.trails.delete(ship)
  }
}

function paintColliders(view: Graphics, world: World): void {
  view.clear()
  for (const collider of world.colliders) traceCollider(view, collider)
  traceShip(view, world.player)
  for (const enemy of world.enemies) traceShip(view, enemy)
  const radius = world.config.ball.radius
  for (const ball of world.balls) {
    view.circle(ball.x, ball.y, radius).stroke(debugStroke)
  }
}

function traceCollider(view: Graphics, collider: Collider): void {
  if (collider.shape === 'circle') {
    view.circle(collider.x, collider.y, collider.radius).stroke(debugStroke)
    return
  }
  view
    .rect(collider.x, collider.y, collider.width, collider.height)
    .stroke(debugStroke)
}

function traceShip(view: Graphics, ship: Ship): void {
  const hull = hullBody(ship)
  view.circle(hull.x, hull.y, hull.radius).stroke(debugStroke)
}

function wrap(value: number, span: number): number {
  const mod = value % span
  return mod < 0 ? mod + span : mod
}

function tileTexture(
  sheet: Texture,
  frames: Map<number, Texture>,
  index: number,
): Texture {
  const found = frames.get(index)
  if (found) return found

  const size = sheet.source.width / sheetColumns
  const col = (index - 1) % sheetColumns
  const row = Math.floor((index - 1) / sheetColumns)
  const texture = new Texture({
    source: sheet.source,
    frame: new Rectangle(col * size, row * size, size, size),
  })
  frames.set(index, texture)
  return texture
}
