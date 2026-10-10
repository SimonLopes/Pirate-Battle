import type { MatchStatus } from '../core/world.ts'

type HudView = {
  score: number
  hp: number
  secondsLeft: number
  status: MatchStatus
  onStick: boolean
  onHud: boolean
}

export type HudStore = {
  subscribe: (listener: () => void) => () => void
  getView: () => HudView
  getNotice: () => string
  publish: (
    score: number,
    hp: number,
    secondsLeft: number,
    status: MatchStatus,
  ) => void
  setOnStick: (onStick: boolean) => void
  setOnHud: (onHud: boolean) => void
  announce: (text: string) => void
}

export function createHudStore(view: HudView): HudStore {
  let current = view
  let notice = ''
  const listeners = new Set<() => void>()

  const emit = () => {
    for (const listener of listeners) listener()
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getView: () => current,
    getNotice: () => notice,
    publish(score, hp, secondsLeft, status) {
      if (
        current.score === score &&
        current.hp === hp &&
        current.secondsLeft === secondsLeft &&
        current.status === status
      ) {
        return
      }
      current = { ...current, score, hp, secondsLeft, status }
      emit()
    },
    setOnStick(onStick) {
      if (current.onStick === onStick) return
      current = { ...current, onStick }
      emit()
    },
    setOnHud(onHud) {
      if (current.onHud === onHud) return
      current = { ...current, onHud }
      emit()
    },
    announce(text) {
      if (notice === text) return
      notice = text
      emit()
    },
  }
}
