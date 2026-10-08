import type { GameConfig } from '../config.ts'
import type { Actions } from './actions.ts'
import { launch, launchSide, stepBalls, type Ball } from './ball.ts'
import { keepInArena, pushOut, type Collider } from './collider.ts'
import { strike } from './combat.ts'
import {
  createChaser,
  createShooter,
  stepEnemies,
  type Enemy,
} from './enemy.ts'
import { headingUp, move, type Ship } from './ship.ts'

export type World = {
  config: GameConfig
  time: number
  score: number
  phase: 'play' | 'over'
  colliders: Collider[]
  player: Ship
  enemies: Enemy[]
  balls: Ball[]
  frontCooldown: number
  leftCooldown: number
  rightCooldown: number
}

export function createWorld(config: GameConfig, colliders: Collider[]): World {
  const player: Ship = {
    x: config.arena.width / 2,
    y: config.arena.height / 2,
    heading: headingUp,
    radius: config.ships.player.radius,
    hp: config.ships.player.hp,
  }
  return {
    config,
    time: 0,
    score: 0,
    phase: 'play',
    colliders,
    player,
    enemies: [
      createChaser(
        config,
        player.x + config.minSpawnDistance,
        player.y,
        player,
      ),
      createShooter(
        config,
        player.x - config.minSpawnDistance,
        player.y,
        player,
      ),
    ],
    balls: [],
    frontCooldown: 0,
    leftCooldown: 0,
    rightCooldown: 0,
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
  const ball = world.config.ball
  const cannon = world.config.cannon
  world.frontCooldown = tickCannon(
    world.frontCooldown,
    dt,
    actions.fireFront,
    cannon.frontCooldown,
    () => launch(world.balls, world.player, ball, 'player'),
  )
  world.leftCooldown = tickCannon(
    world.leftCooldown,
    dt,
    actions.fireLeft,
    cannon.sideCooldown,
    () =>
      launchSide(
        world.balls,
        world.player,
        ball,
        cannon.sideSpacing,
        -1,
        'player',
      ),
  )
  world.rightCooldown = tickCannon(
    world.rightCooldown,
    dt,
    actions.fireRight,
    cannon.sideCooldown,
    () =>
      launchSide(
        world.balls,
        world.player,
        ball,
        cannon.sideSpacing,
        1,
        'player',
      ),
  )
  stepBalls(world.balls, dt, ball, world.config.arena, world.colliders)
  world.score += strike(world.balls, world.player, world.enemies)
  if (world.player.hp > 0) {
    stepEnemies(
      world.enemies,
      world.player,
      world.balls,
      dt,
      world.config,
      world.colliders,
    )
  }
  if (world.player.hp <= 0) {
    world.player.hp = 0
    world.phase = 'over'
    return
  }
  world.time += dt
  if (world.time < world.config.sessionDuration) return
  world.time = world.config.sessionDuration
  world.phase = 'over'
}

function tickCannon(
  cooldown: number,
  dt: number,
  held: boolean,
  reload: number,
  shoot: () => void,
): number {
  const next = cooldown - dt
  if (next > 0) return next
  if (!held) return 0
  shoot()
  return reload
}
