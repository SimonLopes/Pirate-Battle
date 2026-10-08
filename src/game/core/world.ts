import type { GameConfig } from '../config.ts'
import type { Actions } from './actions.ts'
import { launch, stepBalls, type Ball } from './ball.ts'
import { keepInArena, pushOut, type Collider } from './collider.ts'
import { headingUp, move, type Ship } from './ship.ts'

export type World = {
  config: GameConfig
  time: number
  phase: 'play' | 'over'
  colliders: Collider[]
  player: Ship
  balls: Ball[]
  frontCooldown: number
}

export function createWorld(config: GameConfig, colliders: Collider[]): World {
  return {
    config,
    time: 0,
    phase: 'play',
    colliders,
    player: {
      x: config.arena.width / 2,
      y: config.arena.height / 2,
      heading: headingUp,
      radius: config.ships.player.radius,
    },
    balls: [],
    frontCooldown: 0,
  }
}

export function step(world: World, dt: number, actions: Actions): void {
  if (world.phase !== 'play') return
  const stats = world.config.ships.player
  move(
    world.player,
    dt,
    stats.moveSpeed,
    stats.turnSpeed,
    actions.turn,
    actions.thrust,
  )
  pushOut(world.player, world.colliders)
  keepInArena(world.player, world.config.arena)
  world.frontCooldown -= dt
  if (world.frontCooldown <= 0) {
    world.frontCooldown = 0
    if (actions.fireFront) {
      launch(world.balls, world.player, world.config.ball, 'player')
      world.frontCooldown = world.config.cannon.frontCooldown
    }
  }
  stepBalls(
    world.balls,
    dt,
    world.config.ball,
    world.config.arena,
    world.colliders,
  )
  world.time += dt
  if (world.time < world.config.sessionDuration) return
  world.time = world.config.sessionDuration
  world.phase = 'over'
}
