import { useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { defaultConfig } from '../config.ts'

const background = '#06283d'

function fitStage(app: Application) {
  const { width, height } = defaultConfig.arena
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
    // init resolves after strict mode has already run cleanup
    let alive = true
    let onResize: (() => void) | null = null

    const release = () => {
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
      })
      .then(
        () => {
          if (!alive) {
            release()
            return
          }

          onResize = () => fitStage(app)
          app.renderer.on('resize', onResize)
          fitStage(app)
          app.canvas.style.display = 'block'
          host.appendChild(app.canvas)
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
