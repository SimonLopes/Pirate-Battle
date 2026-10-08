import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { defaultConfig } from '../config.ts'
import { GameSession } from '../GameSession.ts'

const background = '#06283d'

function fitStage(app: Application, width: number, height: number) {
  const viewWidth = app.screen.width
  const viewHeight = app.screen.height
  if (viewWidth === 0 || viewHeight === 0) return

  const scale = Math.min(viewWidth / width, viewHeight / height)
  app.stage.scale.set(scale)
  app.stage.position.set(
    (viewWidth - width * scale) / 2,
    (viewHeight - height * scale) / 2,
  )
}

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    let alive = true
    let session: GameSession | null = null
    let onResize: (() => void) | null = null

    const release = () => {
      session?.destroy()
      session = null
      if (!app.renderer) return
      if (onResize) {
        app.renderer.off('resize', onResize)
        onResize = null
      }
      app.destroy({ removeView: true }, { children: true })
    }

    void app
      .init({
        resizeTo: host,
        resolution: window.devicePixelRatio,
        autoDensity: true,
        background,
        sharedTicker: false,
      })
      .then(
        () => {
          if (!alive) {
            release()
            return
          }

          const match = new GameSession(app, defaultConfig)
          session = match
          const { width, height } = match.config.arena
          onResize = () => fitStage(app, width, height)
          app.renderer.on('resize', onResize)
          fitStage(app, width, height)
          app.canvas.style.display = 'block'
          host.appendChild(app.canvas)
          match.start()
        },
        () => {
          release()
        },
      )

    return () => {
      alive = false
      release()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background,
      }}
    />
  )
}
