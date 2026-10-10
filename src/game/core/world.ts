import type { GameConfig } from '../config.ts'
import type { Actions } from './actions.ts'
import { launch, launchSide, stepBalls, type Ball } from './ball.ts'
import type { Collider } from './collider.ts'
import { strike } from './combat.ts'
import {
  createChaser,
  createShooter,
  stepEnemies,
  type Enemy,
} from './enemy.ts'
import type { Rng } from './rng.ts'
import { headingUp, move, moveHull, type Ship } from './ship.ts'
import { pickSpawn, stepSpawns, type SpawnPoint } from './spawn.ts'

export type MatchStatus = 'running' | 'paused' | 'ended'

export type EndReason = 'time' | 'death'

const fireCues = ['cannon_fire_1', 'cannon_fire_2', 'cannon_fire_3'] as const
const woodCues = ['ship_wood_hit_1', 'ship_wood_hit_2'] as const
const waterCues = ['cannonball_water_hit_1', 'cannonball_water_hit_2'] as const
const explosionCues = ['ship_explosion_1', 'ship_explosion_2'] as const

export type Cue =
  | (typeof fireCues)[number]
  | (typeof woodCues)[number]
  | (typeof waterCues)[number]
  | (typeof explosionCues)[number]
  | 'cannon_broadside'
  | 'ship_collision'
  | 'score_point'
  | 'ship_sinking'
  | 'game_complete'
  | 'time_warning'
  | 'health_low'

export type World = {
  config: GameConfig
  time: number
  score: number
  status: MatchStatus
  endReason: EndReason | null
  colliders: Collider[]
  player: Ship
  enemies: Enemy[]
  balls: Ball[]
  frontCooldown: number
  leftCooldown: number
  rightCooldown: number
  spawnTimer: number
  rng: Rng
  cueRng: Rng
  cues: Cue[]
}

export function createWorld(
  config: GameConfig,
  colliders: Collider[],
  rng: Rng,
  cueRng: Rng,
  playerAt: SpawnPoint,
): World {
  const player: Ship = {
    x: playerAt.x,
    y: playerAt.y,
    heading: headingUp,
    radius: config.ships.player.radius,
    hullOffset: config.ships.player.hullOffset,
    hp: config.ships.player.hp,
  }
  const field: World = {
    config,
    time: 0,
    score: 0,
    status: 'running',
    endReason: null,
    colliders,
    player,
    enemies: [],
    balls: [],
    frontCooldown: 0,
    leftCooldown: 0,
    rightCooldown: 0,
    spawnTimer: config.spawnInterval,
    rng,
    cueRng,
    cues: [],
  }
  const chaserAt = pickSpawn(
    field,
    config.ships.chaser.radius,
    config.ships.chaser.hullOffset,
  )
  if (chaserAt) {
    field.enemies.push(createChaser(config, chaserAt.x, chaserAt.y, player))
  }
  const shooterAt = pickSpawn(
    field,
    config.ships.shooter.radius,
    config.ships.shooter.hullOffset,
  )
  if (shooterAt) {
    field.enemies.push(createShooter(config, shooterAt.x, shooterAt.y, player))
  }
  return field
}

export function pauseMatch(world: World): void {
  if (world.status !== 'running') return
  world.status = 'paused'
}

export function resumeMatch(world: World): void {
  if (world.status !== 'paused') return
  world.status = 'running'
}

export function step(world: World, dt: number, actions: Actions): void {
  if (world.status !== 'running') return

  const limit = world.config.sessionDuration
  const remaining = limit - world.time
  if (remaining <= 0) {
    world.time = limit
    endMatch(world, 'time')
    return
  }

  const slice = Math.min(dt, remaining)
  const stats = world.config.ships.player
  const hpBefore = world.player.hp
  const timeBefore = world.time
  move(
    world.player,
    slice,
    stats.moveSpeed,
    stats.turnSpeed,
    actions.turn,
    actions.thrust,
  )
  moveHull(world.player, world.colliders, world.config.arena)
  const ball = world.config.ball
  const cannon = world.config.cannon
  world.frontCooldown = tickCannon(
    world.frontCooldown,
    slice,
    actions.fireFront,
    cannon.frontCooldown,
    () => {
      launch(world.balls, world.player, ball, 'player')
      world.cues.push(world.cueRng.pick(fireCues))
    },
  )
  world.leftCooldown = tickCannon(
    world.leftCooldown,
    slice,
    actions.fireLeft,
    cannon.sideCooldown,
    () => {
      launchSide(
        world.balls,
        world.player,
        ball,
        cannon.sideSpacing,
        -1,
        'player',
      )
      world.cues.push('cannon_broadside')
    },
  )
  world.rightCooldown = tickCannon(
    world.rightCooldown,
    slice,
    actions.fireRight,
    cannon.sideCooldown,
    () => {
      launchSide(
        world.balls,
        world.player,
        ball,
        cannon.sideSpacing,
        1,
        'player',
      )
      world.cues.push('cannon_broadside')
    },
  )
  const flying = world.balls.length
  stepBalls(world.balls, slice, ball, world.config.arena, world.colliders)
  if (world.balls.length < flying) world.cues.push(world.cueRng.pick(waterCues))
  const live = world.balls.length
  const scored = strike(world.balls, world.player, world.enemies, ball.radius)
  world.score += scored
  if (world.balls.length < live) world.cues.push(world.cueRng.pick(woodCues))
  for (let kill = 0; kill < scored; kill += 1) {
    world.cues.push(world.cueRng.pick(explosionCues), 'score_point')
  }
  if (world.player.hp > 0) {
    const fleet = world.enemies.length
    const shots = world.balls.length
    stepEnemies(
      world.enemies,
      world.player,
      world.balls,
      slice,
      world.config,
      world.colliders,
    )
    if (world.balls.length > shots) world.cues.push(world.cueRng.pick(fireCues))
    for (let ram = world.enemies.length; ram < fleet; ram += 1) {
      world.cues.push('ship_collision', world.cueRng.pick(explosionCues))
    }
    stepSpawns(world, slice)
  }
  world.time += slice
  if (slice < dt || world.time >= limit) world.time = limit
  alarm(world, hpBefore, timeBefore)
  if (world.player.hp <= 0) {
    endMatch(world, 'death')
    return
  }
  if (world.time >= limit) endMatch(world, 'time')
}

function endMatch(world: World, reason: EndReason): void {
  world.status = 'ended'
  world.endReason = reason
  if (reason === 'death') world.player.hp = 0
  world.cues.push(reason === 'death' ? 'ship_sinking' : 'game_complete')
}

function alarm(world: World, hpBefore: number, timeBefore: number): void {
  const { alerts, sessionDuration, ships } = world.config
  const lowHp = ships.player.hp * alerts.lowHp
  const hp = world.player.hp
  if (hp > 0 && hp < lowHp && hpBefore >= lowHp) {
    world.cues.push('health_low')
  }
  const warnAt = sessionDuration - alerts.timeLeft
  if (timeBefore < warnAt && world.time >= warnAt) {
    world.cues.push('time_warning')
  }
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
