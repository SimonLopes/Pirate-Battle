import type { Actions } from '../core/actions.ts'
import type { TouchBindings } from './touch.ts'

export type Keyboard = {
  clear(): void
  sync(): void
  destroy(): void
}

type Binding =
  | 'forward'
  | 'reverse'
  | 'turnLeft'
  | 'turnRight'
  | 'fireFront'
  | 'fireLeft'
  | 'fireRight'
  | 'pause'

const bindings: Record<string, Binding> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'reverse',
  ArrowDown: 'reverse',
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

export function createKeyboard(
  actions: Actions,
  touch: TouchBindings,
  onPause: () => void,
  onPlay: () => void,
  isActive: () => boolean,
): Keyboard {
  const held = new Set<string>()
  let destroyed = false

  const sync = () => {
    apply(actions, held, touch)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (destroyed || !isActive()) return
    const binding = bindings[event.code]
    if (!binding) return
    event.preventDefault()
    if (event.repeat) return
    if (binding === 'pause') {
      onPause()
      return
    }
    onPlay()
    held.add(event.code)
    sync()
  }

  const onKeyUp = (event: KeyboardEvent) => {
    if (destroyed || !isActive()) return
    const binding = bindings[event.code]
    if (!binding) return
    event.preventDefault()
    if (binding === 'pause') return
    held.delete(event.code)
    sync()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  return {
    clear() {
      held.clear()
      sync()
    },
    sync,
    destroy() {
      if (destroyed) return
      destroyed = true
      held.clear()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },
  }
}

function apply(
  actions: Actions,
  held: ReadonlySet<string>,
  touch: TouchBindings,
): void {
  const forward = held.has('KeyW') || held.has('ArrowUp') || touch.forward
  const reverse = held.has('KeyS') || held.has('ArrowDown')
  if (forward === reverse) actions.thrust = 0
  else if (forward) actions.thrust = 1
  else actions.thrust = -1
  actions.fireFront = held.has('Space') || touch.fireFront
  actions.fireLeft = held.has('KeyQ') || touch.fireLeft
  actions.fireRight = held.has('KeyE') || touch.fireRight
  const left = held.has('KeyA') || held.has('ArrowLeft') || touch.turnLeft
  const right = held.has('KeyD') || held.has('ArrowRight') || touch.turnRight
  if (left === right) actions.turn = 0
  else if (left) actions.turn = -1
  else actions.turn = 1
}
