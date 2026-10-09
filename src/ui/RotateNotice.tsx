import { useLayoutEffect, useRef } from 'react'

export function RotateNotice() {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const previous = document.activeElement
    ref.current?.focus()
    return () => {
      if (previous instanceof HTMLElement && document.contains(previous)) {
        previous.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <div ref={ref} className="rotate-gate" role="status" tabIndex={-1}>
      <h1 id="rotate-title" className="menu-heading">
        Gire o aparelho
      </h1>
      <p className="menu-copy">O jogo é jogado na horizontal.</p>
    </div>
  )
}
