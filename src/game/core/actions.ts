export type Actions = {
  forward: boolean
  turn: -1 | 0 | 1
  fireFront: boolean
  fireLeft: boolean
  fireRight: boolean
}

export function idleActions(): Actions {
  return {
    forward: false,
    turn: 0,
    fireFront: false,
    fireLeft: false,
    fireRight: false,
  }
}

export function clearActions(actions: Actions): void {
  actions.forward = false
  actions.turn = 0
  actions.fireFront = false
  actions.fireLeft = false
  actions.fireRight = false
}
