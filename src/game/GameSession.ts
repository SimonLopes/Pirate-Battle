import { UPDATE_PRIORITY, type Application } from 'pixi.js'
import type { GameConfig } from './config.ts'
import { clearActions, idleActions, type Actions } from './core/actions.ts'
import { createWorld, step, type World } from './core/world.ts'
import { islands } from './map.ts'
import { createRenderer, type Renderer } from './render/renderer.ts'

export class GameSession {
  readonly config: GameConfig
  readonly world: World
  readonly actions: Actions

  private readonly app: Application
  private readonly renderer: Renderer
  private accumulator = 0
  private started = false
  private running = false
  private destroyed = false
  private discard = false

  constructor(app: Application, config: GameConfig) {
    this.app = app
    this.config = structuredClone(config)
    this.world = createWorld(
      this.config,
      islands.map((island) => island.collider),
    )
    this.actions = idleActions()
    this.renderer = createRenderer(app.stage)
    document.addEventListener('visibilitychange', this.onHide)
    window.addEventListener('blur', this.onBlur)
  }

  start(): void {
    if (this.destroyed || this.started) return
    this.started = true
    this.running = true
    this.accumulator = 0
    this.discard = true
    this.app.ticker.add(this.onTick, undefined, UPDATE_PRIORITY.HIGH)
    this.app.ticker.start()
    if (document.hidden) this.pause()
  }

  pause(): void {
    if (this.destroyed || !this.running) return
    this.running = false
    this.accumulator = 0
    this.discard = true
    clearActions(this.actions)
    this.app.ticker.stop()
  }

  resume(): void {
    if (this.destroyed || !this.started || this.running) return
    clearActions(this.actions)
    this.accumulator = 0
    this.discard = true
    this.running = true
    this.app.ticker.start()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.running = false
    this.app.ticker.remove(this.onTick)
    document.removeEventListener('visibilitychange', this.onHide)
    window.removeEventListener('blur', this.onBlur)
    this.renderer.destroy()
  }

  private readonly onTick = (): void => {
    if (this.destroyed || !this.running) return
    if (this.discard) {
      this.discard = false
      return
    }

    const { fixedDt, maxSteps } = this.config
    this.accumulator += this.app.ticker.elapsedMS / 1000

    let steps = 0
    while (this.accumulator >= fixedDt && steps < maxSteps) {
      step(this.world, fixedDt, this.actions)
      this.accumulator -= fixedDt
      steps += 1
    }

    if (this.accumulator >= fixedDt) this.accumulator = 0

    this.renderer.draw(this.world)
  }

  private readonly onHide = (): void => {
    if (document.hidden) this.pause()
  }

  private readonly onBlur = (): void => {
    this.pause()
  }
}
