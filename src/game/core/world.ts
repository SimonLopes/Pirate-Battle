import type { GameConfig } from '../config.ts'
import type { Actions } from './actions.ts'

export type World = {
  config: GameConfig
  time: number
  phase: 'play' | 'over'
}

export function createWorld(config: GameConfig): World {
  return {
    config,
    time: 0,
    phase: 'play',
  }
}

export function step(world: World, dt: number, actions: Actions): void {
  if (world.phase !== 'play') return
  void actions
  world.time += dt
  if (world.time < world.config.sessionDuration) return
  world.time = world.config.sessionDuration
  world.phase = 'over'
}
