import { clearActions, type Actions } from '../core/actions.ts'

export type Keyboard = {
  clear(): void
  destroy(): void
}

type Binding =
  | 'forward'
  | 'turnLeft'
  | 'turnRight'
  | 'fireFront'
  | 'fireLeft'
  | 'fireRight'
  | 'pause'

const bindings: Record<string, Binding> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyA: 'turnLeft',
  ArrowLeft: 'turnLeft',
  KeyD: 'turnRight',
  ArrowRight: 'turnRight',
  Space: 'fireFront',
  KeyQ: 'fireLeft',
  KeyE: 'fireRight',
  Escape: 'pause',
  KeyP: 'pause',
}

export function createKeyboard(actions: Actions, onPause: () => void): Keyboard {
  const held = new Set<string>()
  let destroyed = false

  const onKeyDown = (event: KeyboardEvent) => {
    if (destroyed) return
    const binding = bindings[event.code]
    if (!binding) return
    event.preventDefault()
    if (event.repeat) return
    if (binding === 'pause') {
      onPause()
      return
    }
    held.add(event.code)
    apply(actions, held)
  }

  const onKeyUp = (event: KeyboardEvent) => {
    if (destroyed) return
    const binding = bindings[event.code]
    if (!binding) return
    event.preventDefault()
    if (binding === 'pause') return
    held.delete(event.code)
    apply(actions, held)
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  return {
    clear() {
      held.clear()
      clearActions(actions)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      held.clear()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },
  }
}

function apply(actions: Actions, held: ReadonlySet<string>): void {
  actions.forward = held.has('KeyW') || held.has('ArrowUp')
  actions.fireFront = held.has('Space')
  actions.fireLeft = held.has('KeyQ')
  actions.fireRight = held.has('KeyE')
  const left = held.has('KeyA') || held.has('ArrowLeft')
  const right = held.has('KeyD') || held.has('ArrowRight')
  if (left === right) actions.turn = 0
  else if (left) actions.turn = -1
  else actions.turn = 1
}
