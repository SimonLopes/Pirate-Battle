import { UPDATE_PRIORITY, type Application } from 'pixi.js'
import { arenaColliders, type ArenaMap } from './arena.ts'
import type { GameConfig } from './config.ts'
import { idleActions, type Actions } from './core/actions.ts'
import { createRng } from './core/rng.ts'
import {
  createWorld,
  pauseMatch,
  resumeMatch,
  step,
  type World,
} from './core/world.ts'
import type { HudStore } from './hud/store.ts'
import { createKeyboard, type Keyboard } from './input/keyboard.ts'
import {
  idleTouch,
  type TouchBinding,
  type TouchBindings,
} from './input/touch.ts'
import { createRenderer, type Renderer } from './render/renderer.ts'

export class GameSession {
  readonly config: GameConfig
  readonly world: World
  readonly actions: Actions
  readonly touch: TouchBindings

  private readonly app: Application
  private readonly hud: HudStore
  private readonly renderer: Renderer
  private readonly adopt: (session: GameSession) => void
  private readonly arena: ArenaMap
  private keyboard: Keyboard | null = null
  private accumulator = 0
  private started = false
  private ticking = false
  private destroyed = false
  private discard = false
  private endAnnounced = false

  constructor(
    app: Application,
    config: GameConfig,
    hud: HudStore,
    adopt: (session: GameSession) => void,
    arena: ArenaMap,
    seed = Date.now(),
  ) {
    const rng = createRng(seed)
    this.app = app
    this.hud = hud
    this.adopt = adopt
    this.arena = arena
    this.config = structuredClone(config)
    this.world = createWorld(
      this.config,
      arenaColliders(arena),
      rng,
      arena.spawns.player,
      arena.spawns.enemies,
    )
    this.actions = idleActions()
    this.touch = idleTouch()
    const debug =
      new URLSearchParams(window.location.search).get('debug') === '1'
    this.renderer = createRenderer(app.stage, debug)
    document.addEventListener('visibilitychange', this.onHide)
    window.addEventListener('blur', this.onBlur)
  }

  start(): void {
    if (this.destroyed || this.started) return
    this.started = true
    this.keyboard = createKeyboard(
      this.actions,
      this.touch,
      () => {
        if (this.world.status === 'paused') this.resume()
        else this.pause()
      },
      () => this.resume(),
    )
    this.keyboard.sync()
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

  setTouch(binding: TouchBinding, down: boolean): void {
    if (this.destroyed) return
    if (this.touch[binding] === down) return
    this.touch[binding] = down
    this.keyboard?.sync()
  }

  releaseTouch(): void {
    if (this.destroyed) return
    const touch = this.touch
    if (
      !touch.forward &&
      !touch.turnLeft &&
      !touch.turnRight &&
      !touch.fireFront &&
      !touch.fireLeft &&
      !touch.fireRight
    ) {
      return
    }
    touch.forward = false
    touch.turnLeft = false
    touch.turnRight = false
    touch.fireFront = false
    touch.fireLeft = false
    touch.fireRight = false
    this.keyboard?.sync()
  }

  restart(): void {
    if (this.destroyed) return
    const next = new GameSession(
      this.app,
      this.config,
      this.hud,
      this.adopt,
      this.arena,
    )
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
    if (this.destroyed) return
    if (!this.ticking) {
      this.present()
      return
    }
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

    this.present()
  }

  private present(): void {
    if (!this.ticking && this.world.status !== 'ended') return
    if (!this.destroyed) {
      this.renderer.draw(this.world, this.app.ticker.elapsedMS / 1000)
    }
    this.publish()
    if (this.endAnnounced || this.world.status !== 'ended') return
    this.endAnnounced = true
    this.hud.announce('Match ended')
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
