import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react'
import { listenFullscreen } from '../fullscreen.ts'
import { touchLayout, type Insets, type TouchLayout } from './touch.ts'

type Frame = {
  w: number
  h: number
  hud: number
  safeTop: number
  safeRight: number
  safeBottom: number
  safeLeft: number
}

const emptyFrame: Frame = {
  w: 0,
  h: 0,
  hud: 0,
  safeTop: 0,
  safeRight: 0,
  safeBottom: 0,
  safeLeft: 0,
}

export function useTouchLayout(
  hostRef: RefObject<HTMLElement | null>,
  barRef: RefObject<HTMLElement | null>,
): TouchLayout | null {
  const coarse = useCoarsePointer()
  const [frame, setFrame] = useState(emptyFrame)

  useEffect(() => {
    const host = hostRef.current
    const bar = barRef.current
    if (!host || !bar) return

    const update = () => {
      const safe = readSafe()
      const next: Frame = {
        w: host.clientWidth,
        h: host.clientHeight,
        hud: bar.offsetHeight,
        safeTop: safe.top,
        safeRight: safe.right,
        safeBottom: safe.bottom,
        safeLeft: safe.left,
      }
      setFrame((prev) => (sameFrame(prev, next) ? prev : next))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    observer.observe(bar)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    const stopFullscreen = listenFullscreen(update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      stopFullscreen()
    }
  }, [hostRef, barRef])

  return useMemo(() => {
    if (!coarse) return null
    return touchLayout(frame.w, frame.h, frame.hud, safeOf(frame))
  }, [coarse, frame])
}

export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribeCoarse, coarseNow, () => false)
}

function subscribeCoarse(onChange: () => void) {
  const query = window.matchMedia('(pointer: coarse)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function coarseNow() {
  return window.matchMedia('(pointer: coarse)').matches
}

function readSafe(): Insets {
  const probe = document.createElement('div')
  probe.style.position = 'fixed'
  probe.style.visibility = 'hidden'
  probe.style.pointerEvents = 'none'
  probe.style.paddingTop = 'env(safe-area-inset-top)'
  probe.style.paddingRight = 'env(safe-area-inset-right)'
  probe.style.paddingBottom = 'env(safe-area-inset-bottom)'
  probe.style.paddingLeft = 'env(safe-area-inset-left)'
  document.body.append(probe)
  const style = getComputedStyle(probe)
  const safe = {
    top: Number.parseFloat(style.paddingTop) || 0,
    right: Number.parseFloat(style.paddingRight) || 0,
    bottom: Number.parseFloat(style.paddingBottom) || 0,
    left: Number.parseFloat(style.paddingLeft) || 0,
  }
  probe.remove()
  return safe
}

function safeOf(frame: Frame): Insets {
  return {
    top: frame.safeTop,
    right: frame.safeRight,
    bottom: frame.safeBottom,
    left: frame.safeLeft,
  }
}

function sameFrame(a: Frame, b: Frame): boolean {
  return (
    a.w === b.w &&
    a.h === b.h &&
    a.hud === b.hud &&
    a.safeTop === b.safeTop &&
    a.safeRight === b.safeRight &&
    a.safeBottom === b.safeBottom &&
    a.safeLeft === b.safeLeft
  )
}
