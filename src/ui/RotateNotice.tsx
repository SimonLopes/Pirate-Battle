import { useLayoutEffect, useRef } from 'react'
import { Panel } from './Panel.tsx'

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
      <Panel>
        <svg
          className="rotate-icon"
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="10" y="16" width="24" height="40" rx="4" />
          <path d="M19 50h6" />
          <path d="M38 10a16 16 0 0 1 16 16" />
          <path d="M49 22l5 5 5-5" />
        </svg>
        <h1 id="rotate-title" className="menu-heading">
          Rotate your device
        </h1>
        <p className="menu-copy">The game is played in landscape.</p>
      </Panel>
    </div>
  )
}
