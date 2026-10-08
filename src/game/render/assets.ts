import { Assets, type Spritesheet, type Texture } from 'pixi.js'

export type EffectName =
  'explosion_1' | 'explosion_2' | 'explosion_3' | 'fire_1' | 'fire_2'

export type GameAssets = {
  ships: Spritesheet
  tiles: Texture
  effects: Record<EffectName, Texture>
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

  const loaded = await Assets.load<Spritesheet | Texture>(
    [
      { alias: 'ships', src: `/assets/spritesheet/${shipSheet}` },
      {
        alias: 'tiles',
        src: `/assets/tilesheet/${tileSheet}`,
        data: { resolution: retina ? 2 : 1 },
      },
      ...effectNames.map((name) => ({
        alias: name,
        src: `/assets/png/${folder}/effects/${name}.png`,
      })),
    ],
    { onProgress, strategy: 'throw' },
  )

  const ships = loaded.ships
  const tiles = loaded.tiles
  if (!isSpritesheet(ships) || !isTexture(tiles)) {
    throw new Error('ship atlas or tile sheet is missing')
  }

  const effects = {} as Record<EffectName, Texture>
  for (const name of effectNames) {
    const texture = loaded[name]
    if (!isTexture(texture)) throw new Error(`effect ${name} is missing`)
    effects[name] = texture
  }

  return { ships, tiles, effects }
}

function isSpritesheet(
  asset: Spritesheet | Texture | undefined,
): asset is Spritesheet {
  return !!asset && 'textures' in asset
}

function isTexture(asset: Spritesheet | Texture | undefined): asset is Texture {
  return !!asset && 'source' in asset && !('textures' in asset)
}

function loadError(error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error)
  return new Error(`Failed to load game assets: ${detail}`)
}
