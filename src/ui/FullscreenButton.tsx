import { useSyncExternalStore } from 'react'
import {
  canFullscreen,
  isFullscreen,
  listenFullscreen,
  toggleFullscreen,
} from '../game/fullscreen.ts'

export function FullscreenButton({ className = '' }: { className?: string }) {
  const active = useFullscreen()
  const isAvailable = useSyncExternalStore(
    listenFullscreen,
    canFullscreen,
    () => false,
  )
  if (!isAvailable) return null
  const label = active ? 'Exit fullscreen' : 'Enter fullscreen'
  return (
    <button
      type="button"
      className={className ? `step-button ${className}` : 'step-button'}
      aria-label={label}
      aria-pressed={active}
      onClick={() => toggleFullscreen()}
    >
      <FullscreenMark exit={active} />
    </button>
  )
}

function useFullscreen(): boolean {
  return useSyncExternalStore(listenFullscreen, isFullscreen, () => false)
}

function FullscreenMark({ exit }: { exit: boolean }) {
  const d = exit
    ? 'M13 6v7H6M19 6v7h7M13 26v-7H6M19 26v-7h7'
    : 'M6 13V6h7M26 13V6h-7M6 19v7h7M26 19v7h-7'
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
    </svg>
  )
}
