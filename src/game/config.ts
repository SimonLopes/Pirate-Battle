type ShipStats = {
  hp: number
  moveSpeed: number
  turnSpeed: number
  radius: number
  hullOffset: number
}

export type GameConfig = {
  sessionDuration: number
  fixedDt: number
  maxSteps: number
  spawnInterval: number
  spawnRamp: {
    enabled: boolean
    minInterval: number
  }
  spawnDistribution: {
    chaser: number
    shooter: number
  }
  minSpawnDistance: number
  ships: {
    player: ShipStats
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
    radius: number
  }
  cannon: {
    frontCooldown: number
    sideCooldown: number
    sideSpacing: number
  }
  fx: {
    trailLife: number
    trailGap: number
    trailPool: number
    splashLife: number
    splashRadius: number
    splashPool: number
    wreckHold: number
    wreckPool: number
    debrisLife: number
    debrisSpeed: number
    woodCount: number
    crewCount: number
  }
  arena: {
    width: number
    height: number
  }
  islands: {
    margin: number
    gap: number
    plantDensity: number
    beachMax: number
    rockMin: number
    rockMax: number
  }
}

export const sessionDurationLimits = { min: 60, max: 180 } as const

export const spawnIntervalLimits = { min: 1, max: 10 } as const

export const defaultConfig: GameConfig = {
  sessionDuration: 120,
  fixedDt: 1 / 60,
  maxSteps: 5,
  spawnInterval: 3,
  spawnRamp: {
    enabled: true,
    minInterval: spawnIntervalLimits.min,
  },
  spawnDistribution: {
    chaser: 0.5,
    shooter: 0.5,
  },
  minSpawnDistance: 520,
  ships: {
    player: {
      hp: 100,
      moveSpeed: 180,
      turnSpeed: 2,
      radius: 21,
      hullOffset: 34,
    },
    chaser: {
      hp: 30,
      moveSpeed: 150,
      turnSpeed: 2.4,
      radius: 21,
      hullOffset: 34,
      collisionDamage: 25,
    },
    shooter: {
      hp: 40,
      moveSpeed: 110,
      turnSpeed: 1.6,
      radius: 21,
      hullOffset: 34,
      attackRange: 360,
      attackCooldown: 1.5,
    },
  },
  ball: {
    speed: 400,
    damage: 10,
    lifetime: 1.2,
    range: 480,
    radius: 5,
  },
  cannon: {
    frontCooldown: 0.45,
    sideCooldown: 1.2,
    sideSpacing: 18,
  },
  fx: {
    trailLife: 0.18,
    trailGap: 14,
    trailPool: 40,
    splashLife: 0.4,
    splashRadius: 18,
    splashPool: 12,
    wreckHold: 0.9,
    wreckPool: 6,
    debrisLife: 0.85,
    debrisSpeed: 62,
    woodCount: 4,
    crewCount: 4,
  },
  arena: {
    width: 2048,
    height: 1152,
  },
  islands: {
    margin: 2,
    gap: 3,
    plantDensity: 0.28,
    beachMax: 2,
    rockMin: 1,
    rockMax: 3,
  },
}
