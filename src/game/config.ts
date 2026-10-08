type ShipStats = {
  hp: number
  moveSpeed: number
  turnSpeed: number
}

export type GameConfig = {
  sessionDuration: number
  fixedDt: number
  maxSteps: number
  spawnInterval: number
  spawnDistribution: {
    chaser: number
    shooter: number
  }
  minSpawnDistance: number
  ships: {
    player: ShipStats & { radius: number }
    chaser: ShipStats & {
      collisionDamage: number
    }
    shooter: ShipStats & {
      attackRange: number
      attackCooldown: number
    }
  }
  ball: {
    speed: number
    damage: number
    lifetime: number
    range: number
  }
  cannon: {
    frontCooldown: number
    sideCooldown: number
    sideSpacing: number
  }
  arena: {
    width: number
    height: number
  }
}

export const sessionDurationLimits = { min: 60, max: 180 } as const

export const spawnIntervalLimits = { min: 1, max: 10 } as const

export const defaultConfig: GameConfig = {
  sessionDuration: 120,
  fixedDt: 1 / 60,
  maxSteps: 5,
  spawnInterval: 3,
  spawnDistribution: {
    chaser: 0.5,
    shooter: 0.5,
  },
  minSpawnDistance: 520,
  ships: {
    player: { hp: 100, moveSpeed: 180, turnSpeed: 2, radius: 57 },
    chaser: { hp: 30, moveSpeed: 150, turnSpeed: 2.4, collisionDamage: 25 },
    shooter: {
      hp: 40,
      moveSpeed: 110,
      turnSpeed: 1.6,
      attackRange: 360,
      attackCooldown: 1.5,
    },
  },
  ball: {
    speed: 400,
    damage: 10,
    lifetime: 1.2,
    range: 480,
  },
  cannon: {
    frontCooldown: 0.45,
    sideCooldown: 1.2,
    sideSpacing: 18,
  },
  arena: {
    width: 2048,
    height: 1152,
  },
}
