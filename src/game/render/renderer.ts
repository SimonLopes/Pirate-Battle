import { Container, Rectangle, Sprite, Texture, TilingSprite } from 'pixi.js'
import type { Ship } from '../core/ship.ts'
import type { World } from '../core/world.ts'
import { islands, sheetColumns, tileSize, waterTile } from '../map.ts'
import { loadAssets, type GameAssets } from './assets.ts'

export type Renderer = {
  draw(world: World): void
  destroy(): void
}

export function createRenderer(stage: Container): Renderer {
  const root = new Container()
  stage.addChild(root)

  const frames = new Map<number, Texture>()
  let destroyed = false
  let ready = false
  let assets: GameAssets | null = null
  let shipSprite: Sprite | null = null

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
    draw(world) {
      if (destroyed) return
      if (!ready) {
        if (!assets) return
        ready = true
        paintArena(root, assets.tiles, frames, world.config.arena)
        shipSprite = paintShip(root, assets.ships)
      }
      if (shipSprite) placeShip(shipSprite, world.player)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      root.destroy({ children: true })
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

const playerShip = 'ship_1.png'
const artBow = Math.PI / 2

function paintShip(root: Container, sheet: GameAssets['ships']): Sprite {
  const texture = sheet.textures[playerShip]
  if (!texture) throw new Error('player ship sprite is missing')
  const sprite = new Sprite(texture)
  sprite.anchor.set(0.5)
  root.addChild(sprite)
  return sprite
}

function placeShip(sprite: Sprite, ship: Ship): void {
  sprite.position.set(ship.x, ship.y)
  sprite.rotation = ship.heading - artBow
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
