import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { arenaColliders, type ArenaMap } from '../arena.ts'
import { defaultConfig } from '../config.ts'
import { overlaps } from './collider.ts'
import { distance } from './math.ts'
import { createRng } from './rng.ts'
import { hullBody } from './ship.ts'
import { stepSpawns } from './spawn.ts'
import { createWorld, type World } from './world.ts'

const map: ArenaMap = JSON.parse(
  readFileSync(
    new URL('../../../public/assets/maps/arena.json', import.meta.url),
    'utf8',
  ),
)

function spawnAll(seed: number, ticks: number): World {
  const world = createWorld(
    defaultConfig,
    arenaColliders(map),
    createRng(seed),
    map.spawns.player,
  )
  for (let i = 0; i < ticks; i += 1) {
    stepSpawns(world, defaultConfig.spawnInterval)
  }
  return world
}

test('spawned enemies are never inside an island or too close to the player', () => {
  const { spawnArea } = defaultConfig
  let count = 0
  for (let seed = 1; seed <= 50; seed += 1) {
    const world = spawnAll(seed, 20)
    for (const enemy of world.enemies) {
      count += 1
      assert.equal(overlaps(hullBody(enemy), world.colliders), false)
      assert.ok(distance(enemy, world.player) >= spawnArea.playerDistance)
    }
  }
  assert.ok(count > 0)
})

test('the same seed gives the same spawn positions', () => {
  const spots = (world: World) =>
    world.enemies.map((enemy) => ({ type: enemy.type, x: enemy.x, y: enemy.y }))
  const first = spawnAll(42, 15)
  const second = spawnAll(42, 15)
  assert.ok(first.enemies.length > 0)
  assert.deepEqual(spots(first), spots(second))
})
