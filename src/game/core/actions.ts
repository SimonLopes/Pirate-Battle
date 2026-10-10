export type Actions = {
  thrust: -1 | 0 | 1
  turn: -1 | 0 | 1
  fireFront: boolean
  fireLeft: boolean
  fireRight: boolean
}

export function idleActions(): Actions {
  return {
    thrust: 0,
    turn: 0,
    fireFront: false,
    fireLeft: false,
    fireRight: false,
  }
}
