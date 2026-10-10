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
  spawnArea: {
    playerDistance: number
    islandMargin: number
    edgeMargin: number
    attempts: number
  }
  spawnDistribution: {
    chaser: number
    shooter: number
  }
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
  alerts: {
    timeLeft: number
    lowHp: number
  }
  fx: {
    ballPool: number
    flashPool: number
    boomPool: number
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
}

export const sessionDurationLimits = { min: 60, max: 180 } as const

export const spawnIntervalLimits = { min: 2, max: 10 } as const

export const audioConfig = {
  oceanVolume: 0.25,
  sailVolume: 0.2,
  fade: 0.08,
} as const

export const apiConfig = {
  timeout: 8000,
  pageSize: 5,
} as const

export const latencyConfig = {
  slow: 1500,
  outOfOrderSlow: 1600,
  outOfOrderFast: 100,
  jitterMin: 250,
  jitterMax: 1500,
} as const

export const defaultConfig: GameConfig = {
  sessionDuration: 90,
  fixedDt: 1 / 60,
  maxSteps: 5,
  spawnInterval: 5,
  spawnArea: {
    playerDistance: 520,
    islandMargin: 24,
    edgeMargin: 48,
    attempts: 30,
  },
  spawnDistribution: {
    chaser: 0.5,
    shooter: 0.5,
  },
  ships: {
    player: {
      hp: 140,
      moveSpeed: 180,
      turnSpeed: 2,
      radius: 21,
      hullOffset: 34,
    },
    chaser: {
      hp: 20,
      moveSpeed: 120,
      turnSpeed: 2.4,
      radius: 21,
      hullOffset: 34,
      collisionDamage: 20,
    },
    shooter: {
      hp: 30,
      moveSpeed: 90,
      turnSpeed: 1.6,
      radius: 21,
      hullOffset: 34,
      attackRange: 320,
      attackCooldown: 2.2,
    },
  },
  ball: {
    speed: 400,
    damage: 10,
    lifetime: 1.4,
    range: 560,
    radius: 5,
  },
  cannon: {
    frontCooldown: 0.3,
    sideCooldown: 0.8,
    sideSpacing: 18,
  },
  alerts: {
    timeLeft: 10,
    lowHp: 0.25,
  },
  fx: {
    ballPool: 24,
    flashPool: 8,
    boomPool: 6,
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
}
