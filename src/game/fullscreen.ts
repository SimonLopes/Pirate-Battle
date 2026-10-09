const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange'] as const

type VendorElement = HTMLElement & {
  webkitRequestFullscreen: () => Promise<void> | void
}

type VendorDocument = Document & {
  webkitExitFullscreen: () => Promise<void> | void
}

export function canFullscreen(): boolean {
  const root = appRoot()
  if (!root) return false
  if (typeof root.requestFullscreen === 'function') {
    return document.fullscreenEnabled
  }
  return hasWebkitRequest(root)
}

export function isFullscreen(): boolean {
  return document.fullscreenElement !== null || webkitElement() !== null
}

export function enterFullscreen(): void {
  if (isFullscreen()) return
  const root = appRoot()
  if (!root) return
  if (typeof root.requestFullscreen === 'function') {
    if (!document.fullscreenEnabled) return
    try {
      void root.requestFullscreen().catch(() => undefined)
    } catch {
      return
    }
    return
  }
  if (!hasWebkitRequest(root)) return
  try {
    settle(root.webkitRequestFullscreen())
  } catch {
    return
  }
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
  for (const name of fullscreenEvents) {
    document.addEventListener(name, onChange)
  }
  return () => {
    for (const name of fullscreenEvents) {
      document.removeEventListener(name, onChange)
    }
  }
}

function exitFullscreen(): void {
  if (document.fullscreenElement) {
    try {
      void document.exitFullscreen().catch(() => undefined)
    } catch {
      return
    }
    return
  }
  if (!hasWebkitExit(document)) return
  try {
    settle(document.webkitExitFullscreen())
  } catch {
    return
  }
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

function hasWebkitRequest(element: HTMLElement): element is VendorElement {
  if (!('webkitRequestFullscreen' in element)) return false
  return typeof element.webkitRequestFullscreen === 'function'
}

function hasWebkitExit(doc: Document): doc is VendorDocument {
  if (!('webkitExitFullscreen' in doc)) return false
  return typeof doc.webkitExitFullscreen === 'function'
}

function settle(result: Promise<void> | void): void {
  if (result instanceof Promise) void result.catch(() => undefined)
}
