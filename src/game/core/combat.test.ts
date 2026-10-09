import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultConfig } from '../config.ts'
import { stepBalls, type Ball } from './ball.ts'
import { strike } from './combat.ts'
import type { Ship } from './ship.ts'

test('fast enemy projectile aimed at the player reduces hp', () => {
  const config = defaultConfig
  const player: Ship = {
    x: config.arena.width / 2,
    y: config.arena.height / 2,
    heading: 0,
    radius: config.ships.player.radius,
    hullOffset: config.ships.player.hullOffset,
    hp: config.ships.player.hp,
  }
  const from = {
    x: player.x,
    y: player.y + config.ships.shooter.attackRange,
  }
  const dx = player.x - from.x
  const dy = player.y - from.y
  const span = Math.hypot(dx, dy)
  const ball: Ball = {
    x: from.x,
    y: from.y,
    vx: (dx / span) * config.ball.speed,
    vy: (dy / span) * config.ball.speed,
    damage: config.ball.damage,
    owner: 'enemy',
    lifetime: config.ball.lifetime,
    traveled: 0,
  }
  const balls = [ball]
  const steps = Math.ceil(config.ball.lifetime / config.fixedDt)
  for (let i = 0; i < steps && balls.length > 0; i += 1) {
    stepBalls(balls, config.fixedDt, config.ball, config.arena, [])
    strike(balls, player, [], config.ball.radius)
  }
  assert.equal(player.hp, config.ships.player.hp - config.ball.damage)
})
