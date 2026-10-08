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

export function clearActions(actions: Actions): void {
  actions.thrust = 0
  actions.turn = 0
  actions.fireFront = false
  actions.fireLeft = false
  actions.fireRight = false
}
