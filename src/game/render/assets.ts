import { Assets, type Spritesheet, type Texture } from 'pixi.js'
import type { ArenaMap } from '../arena.ts'

export type EffectName =
  'explosion_1' | 'explosion_2' | 'explosion_3' | 'fire_1' | 'fire_2'

const barNames = [
  'health_frame',
  'health_fill_green',
  'health_fill_amber',
  'health_fill_red',
  'enemy_health_frame',
  'enemy_health_fill_green',
  'enemy_health_fill_red',
] as const

export type BarName = (typeof barNames)[number]

export type GameAssets = {
  ships: Spritesheet
  tiles: Texture
  effects: Record<EffectName, Texture>
  bars: Record<BarName, Texture>
  arena: ArenaMap
}

const effectNames = [
  'explosion_1',
  'explosion_2',
  'explosion_3',
  'fire_1',
  'fire_2',
] as const

type Progress = (progress: number) => void

let ready: GameAssets | null = null
let pending: Promise<GameAssets> | null = null
const listeners = new Set<Progress>()

export function loadAssets(onProgress: Progress): Promise<GameAssets> {
  if (ready) {
    onProgress(1)
    return Promise.resolve(ready)
  }

  listeners.add(onProgress)

  if (!pending) {
    pending = fetchAssets((progress) => {
      for (const listener of listeners) listener(progress)
    })
      .then((assets) => {
        ready = assets
        pending = null
        listeners.clear()
        return assets
      })
      .catch((error: unknown) => {
        pending = null
        listeners.clear()
        throw loadError(error)
      })
  }

  return pending
}

async function fetchAssets(onProgress: Progress): Promise<GameAssets> {
  const retina = window.devicePixelRatio >= 2
  const folder = retina ? 'retina' : 'default'
  const shipSheet = retina
    ? 'ships_miscellaneous_sheet_retina.json'
    : 'ships_miscellaneous_sheet.json'
  const tileSheet = retina ? 'tiles_sheet_retina.png' : 'tiles_sheet.png'

  const loaded = await Assets.load<Spritesheet | Texture | ArenaMap>(
    [
      { alias: 'ships', src: `/assets/spritesheet/${shipSheet}` },
      {
        alias: 'tiles',
        src: `/assets/tilesheet/${tileSheet}`,
        data: { resolution: retina ? 2 : 1 },
      },
      { alias: 'arena', src: '/assets/maps/arena.json' },
      ...effectNames.map((name) => ({
        alias: name,
        src: `/assets/png/${folder}/effects/${name}.png`,
      })),
      ...barNames.map((name) => ({
        alias: name,
        src: `/assets/png/default/ui/hud/${name}.png`,
      })),
    ],
    { onProgress, strategy: 'throw' },
  )

  const ships = loaded.ships
  const tiles = loaded.tiles
  const arena = loaded.arena
  if (!isSpritesheet(ships) || !isTexture(tiles) || !isArena(arena)) {
    throw new Error('ship atlas, tile sheet, or arena is missing')
  }

  const effects = {} as Record<EffectName, Texture>
  for (const name of effectNames) {
    const texture = loaded[name]
    if (!isTexture(texture)) throw new Error(`effect ${name} is missing`)
    effects[name] = texture
  }

  const bars = {} as Record<BarName, Texture>
  for (const name of barNames) {
    const texture = loaded[name]
    if (!isTexture(texture)) throw new Error(`hud ${name} is missing`)
    bars[name] = texture
  }

  return { ships, tiles, effects, bars, arena }
}

type Loaded = Spritesheet | Texture | ArenaMap | undefined

function isArena(asset: Loaded): asset is ArenaMap {
  if (!asset || !('shallow' in asset) || !('ground' in asset)) return false
  const cells = asset.width * asset.height
  return (
    asset.shallow.length === cells &&
    asset.ground.length === cells &&
    Array.isArray(asset.decor) &&
    Array.isArray(asset.colliders) &&
    typeof asset.spawns?.player?.x === 'number' &&
    typeof asset.spawns.player.y === 'number'
  )
}

function isSpritesheet(asset: Loaded): asset is Spritesheet {
  return !!asset && 'textures' in asset
}

function isTexture(asset: Loaded): asset is Texture {
  return !!asset && 'source' in asset && !('textures' in asset)
}

function loadError(error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error)
  return new Error(`Failed to load game assets: ${detail}`)
}
