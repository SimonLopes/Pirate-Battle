const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange'] as const

type VendorElement = HTMLElement & {
  webkitRequestFullscreen: () => Promise<void> | void
}

type VendorDocument = Document & {
  webkitExitFullscreen: () => Promise<void> | void
}

const listeners = new Set<() => void>()
let isRejected = false

export function canFullscreen(): boolean {
  if (isRejected) return false
  const root = appRoot()
  if (!root) return false
  if (hasStandardRequest(root)) return true
  return hasWebkitRequest(root) && webkitEnabled()
}

export function isFullscreen(): boolean {
  return document.fullscreenElement !== null || webkitElement() !== null
}

function enterFullscreen(): void {
  if (isFullscreen() || !canFullscreen()) return
  const root = appRoot()
  if (!root) return
  if (hasStandardRequest(root)) {
    void root.requestFullscreen().catch(reject)
    return
  }
  if (!hasWebkitRequest(root)) return
  const result = root.webkitRequestFullscreen()
  if (result instanceof Promise) void result.catch(reject)
}

export function enterFullscreenOnTouch(enabled: boolean): void {
  if (!enabled) return
  if (!window.matchMedia('(pointer: coarse)').matches) return
  enterFullscreen()
}

export function toggleFullscreen(): void {
  if (isFullscreen()) exitFullscreen()
  else enterFullscreen()
}

export function listenFullscreen(onChange: () => void): () => void {
  listeners.add(onChange)
  for (const name of fullscreenEvents) {
    document.addEventListener(name, onChange)
  }
  return () => {
    listeners.delete(onChange)
    for (const name of fullscreenEvents) {
      document.removeEventListener(name, onChange)
    }
  }
}

function exitFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen()
    return
  }
  if (hasWebkitExit(document)) void document.webkitExitFullscreen()
}

function reject(): void {
  isRejected = true
  for (const listener of listeners) listener()
}

function appRoot(): HTMLElement | null {
  return document.getElementById('root')
}

function webkitElement(): Element | null {
  if (!('webkitFullscreenElement' in document)) return null
  const element = document.webkitFullscreenElement
  if (element instanceof Element) return element
  return null
}

function hasStandardRequest(element: HTMLElement): boolean {
  return (
    typeof element.requestFullscreen === 'function' &&
    document.fullscreenEnabled
  )
}

function webkitEnabled(): boolean {
  if (!('webkitFullscreenEnabled' in document)) return false
  return document.webkitFullscreenEnabled === true
}

function hasWebkitRequest(element: HTMLElement): element is VendorElement {
  if (!('webkitRequestFullscreen' in element)) return false
  return typeof element.webkitRequestFullscreen === 'function'
}

function hasWebkitExit(doc: Document): doc is VendorDocument {
  if (!('webkitExitFullscreen' in doc)) return false
  return typeof doc.webkitExitFullscreen === 'function'
}
