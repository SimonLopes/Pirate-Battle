import { useSyncExternalStore } from 'react'

const portraitQuery = '(orientation: portrait) and (pointer: coarse)'

export function useCoarsePortrait(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(portraitQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function snapshot() {
  return window.matchMedia(portraitQuery).matches
}
