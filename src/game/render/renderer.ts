import { Container } from 'pixi.js'
import type { World } from '../core/world.ts'

export type Renderer = {
  draw(world: World): void
  destroy(): void
}

export function createRenderer(stage: Container): Renderer {
  const root = new Container()
  stage.addChild(root)

  return {
    draw(world) {
      void world
    },
    destroy() {
      root.destroy({ children: true })
    },
  }
}
