import { UPDATE_PRIORITY, type Application } from 'pixi.js'
import type { GameConfig } from './config.ts'
import { idleActions, type Actions } from './core/actions.ts'
import {
  createWorld,
  pauseMatch,
  resumeMatch,
  step,
  type World,
} from './core/world.ts'
import type { HudStore } from './hud/store.ts'
import { createKeyboard, type Keyboard } from './input/keyboard.ts'
import { islands } from './map.ts'
import { createRenderer, type Renderer } from './render/renderer.ts'

export class GameSession {
  readonly config: GameConfig
  readonly world: World
  readonly actions: Actions

  private readonly app: Application
  private readonly hud: HudStore
  private readonly renderer: Renderer
  private readonly adopt: (session: GameSession) => void
  private keyboard: Keyboard | null = null
  private accumulator = 0
  private started = false
  private ticking = false
  private destroyed = false
  private discard = false

  constructor(
    app: Application,
    config: GameConfig,
    hud: HudStore,
    adopt: (session: GameSession) => void,
  ) {
    this.app = app
    this.hud = hud
    this.adopt = adopt
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
    this.keyboard = createKeyboard(
      this.actions,
      () => {
        if (this.world.status === 'paused') this.resume()
        else this.pause()
      },
      () => this.resume(),
    )
    this.ticking = true
    this.accumulator = 0
    this.discard = true
    this.app.ticker.add(this.onTick, undefined, UPDATE_PRIORITY.HIGH)
    this.app.ticker.start()
    this.publish()
    this.hud.announce('Match started')
    if (document.hidden) this.pause()
  }

  pause(): void {
    if (this.destroyed || !this.ticking) return
    if (this.world.status !== 'running') return
    pauseMatch(this.world)
    this.ticking = false
    this.accumulator = 0
    this.discard = true
    this.keyboard?.clear()
    this.app.ticker.stop()
    this.publish()
    this.hud.announce('Match paused')
  }

  resume(): void {
    if (this.destroyed || !this.started || this.ticking) return
    if (this.world.status === 'ended') return
    this.keyboard?.clear()
    this.accumulator = 0
    this.discard = true
    if (this.world.status === 'paused') resumeMatch(this.world)
    this.ticking = true
    this.app.ticker.start()
    this.publish()
    this.hud.announce('')
  }

  restart(): void {
    if (this.destroyed) return
    const next = new GameSession(this.app, this.config, this.hud, this.adopt)
    this.destroy()
    this.adopt(next)
    next.start()
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.ticking = false
    this.app.ticker.remove(this.onTick)
    this.keyboard?.destroy()
    this.keyboard = null
    document.removeEventListener('visibilitychange', this.onHide)
    window.removeEventListener('blur', this.onBlur)
    this.renderer.destroy()
  }

  private readonly onTick = (): void => {
    if (this.destroyed || !this.ticking) return
    if (this.discard) {
      this.discard = false
      return
    }

    if (this.world.status === 'running') {
      const { fixedDt, maxSteps } = this.config
      this.accumulator += this.app.ticker.elapsedMS / 1000

      let steps = 0
      while (
        this.accumulator >= fixedDt &&
        steps < maxSteps &&
        this.world.status === 'running'
      ) {
        step(this.world, fixedDt, this.actions)
        this.accumulator -= fixedDt
        steps += 1
      }

      if (this.world.status !== 'running' || this.accumulator >= fixedDt) {
        this.accumulator = 0
      }
    }

    if (this.destroyed) return
    this.renderer.draw(this.world)
    this.publish()
    if (this.world.status === 'ended') this.hud.announce('Match ended')
  }

  private publish(): void {
    const { world } = this
    const duration = world.config.sessionDuration
    const secondsLeft =
      world.time >= duration ? 0 : duration - Math.floor(world.time)
    this.hud.publish(world.score, world.player.hp, secondsLeft, world.status)
  }

  private readonly onHide = (): void => {
    if (document.hidden) this.pause()
  }

  private readonly onBlur = (): void => {
    this.pause()
  }
}
