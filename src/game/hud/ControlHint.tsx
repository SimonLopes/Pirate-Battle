import { useEffect, useState } from 'react'
import { Controls } from '../../ui/Controls.tsx'
import { isGameKey } from '../input/keyboard.ts'
import { useCoarsePointer } from '../input/useTouchLayout.ts'

const holdMs = 4000
const fadeMs = 350

export function ControlHint() {
  const coarse = useCoarsePointer()
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show')

  useEffect(() => {
    if (phase !== 'show') return
    const dismiss = () => setPhase('fade')
    const hold = window.setTimeout(dismiss, holdMs)
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || !isGameKey(event.code)) return
      dismiss()
    }
    const onPointer = (event: PointerEvent) => {
      if (coarse || event.pointerType !== 'mouse') dismiss()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.clearTimeout(hold)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [coarse, phase])

  useEffect(() => {
    if (phase !== 'fade') return
    const timer = window.setTimeout(() => setPhase('gone'), fadeMs)
    return () => window.clearTimeout(timer)
  }, [phase])

  if (phase === 'gone') return null

  const name =
    phase === 'fade' ? 'control-hint control-hint-out' : 'control-hint'

  return (
    <div className={name} role="status">
      <Controls
        mode={coarse ? 'touch' : 'keyboard'}
        headingId="hint-controls"
      />
    </div>
  )
}
