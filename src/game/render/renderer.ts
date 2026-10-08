import { Container, Rectangle, Sprite, Texture, TilingSprite } from 'pixi.js'
import type { Ball } from '../core/ball.ts'
import type { Enemy } from '../core/enemy.ts'
import type { Ship } from '../core/ship.ts'
import type { World } from '../core/world.ts'
import { islands, sheetColumns, tileSize, waterTile } from '../map.ts'
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

export function createRenderer(stage: Container): Renderer {
  const root = new Container()
  const arenaLayer = new Container()
  const shipsLayer = new Container()
  const ballLayer = new Container()
  const effectLayer = new Container()
  const barLayer = new Container()
  root.addChild(arenaLayer, shipsLayer, ballLayer, effectLayer, barLayer)
  stage.addChild(root)

  const frames = new Map<number, Texture>()
  const enemyMarks: ShipMark[] = []
  const ballSprites: Sprite[] = []
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
      if (!ready) {
        if (!assets) return
        ready = true
        paintArena(arenaLayer, assets.tiles, frames, world.config.arena)
        ballTexture = cannonBallTexture(assets.ships)
        playerMark = createMark(shipsLayer, barLayer, playerStyle(assets.bars))
        enemyBars = enemyStyle(assets.bars)
        fx = createEffects(effectLayer, assets.effects)
        fx.prime(world)
      }
      if (!assets || !playerMark || !ballTexture || !enemyBars || !fx) return
      fx.sync(world, dt)
      placeMark(
        playerMark,
        world.player,
        world.config.ships.player.hp,
        playerHull,
        assets.ships,
        assets.effects,
        fx,
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
      )
      placeBalls(ballLayer, ballTexture, ballSprites, world.balls)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      fx?.destroy()
      const crops = enemyMarks.map((mark) => mark.crop)
      if (playerMark) crops.push(playerMark.crop)
      root.destroy({ children: true })
      for (const crop of crops) crop.destroy(false)
      for (const texture of frames.values()) texture.destroy(false)
      frames.clear()
    },
  }
}

function paintArena(
  root: Container,
  sheet: Texture,
  frames: Map<number, Texture>,
  arena: { width: number; height: number },
): void {
  const water = tileTexture(sheet, frames, waterTile)
  const scale = tileSize / water.frame.width
  root.addChild(
    new TilingSprite({
      texture: water,
      width: arena.width,
      height: arena.height,
      tileScale: { x: scale, y: scale },
    }),
  )

  for (const island of islands) {
    const grid = new Container()
    grid.position.set(island.x, island.y)
    let y = 0
    for (const row of island.tiles) {
      let x = 0
      for (const id of row) {
        const sprite = new Sprite(tileTexture(sheet, frames, id))
        sprite.position.set(x * tileSize, y * tileSize)
        sprite.width = tileSize
        sprite.height = tileSize
        grid.addChild(sprite)
        x += 1
      }
      y += 1
    }
    root.addChild(grid)
  }
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
): void {
  const ratio = maxHp > 0 ? Math.min(1, Math.max(0, ship.hp / maxHp)) : 0
  mark.hull.visible = true
  mark.bar.visible = true
  mark.hull.texture = hullTexture(sheet, hullBase, ratio)
  mark.hull.tint = fx.tint(ship)
  mark.hull.position.set(ship.x, ship.y)
  mark.hull.rotation = ship.heading - artBow
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
