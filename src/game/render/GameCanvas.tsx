import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import type { GameConfig } from '../config.ts'
import { GameSession } from '../GameSession.ts'
import { Hud } from '../hud/Hud.tsx'
import { createHudStore } from '../hud/store.ts'
import type { MatchResult } from '../result.ts'
import { TouchControls } from '../input/TouchControls.tsx'
import { useTouchLayout } from '../input/useTouchLayout.ts'
import { stageFit, zeroInsets, type Insets } from '../input/touch.ts'

const background = '#06283d'

function fitStage(
  app: Application,
  viewW: number,
  viewH: number,
  arenaW: number,
  arenaH: number,
  inset: Insets,
) {
  const fit = stageFit(viewW, viewH, arenaW, arenaH, inset)
  if (!fit || !app.renderer) return
  app.stage.scale.set(fit.scale)
  app.stage.position.set(fit.x, fit.y)
}

export function GameCanvas({
  config,
  onMenu,
  onEnd,
}: {
  config: GameConfig
  onMenu: () => void
  onEnd: (result: MatchResult) => void
}) {
  const [snapshot] = useState(config)
  const hostRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<GameSession | null>(null)
  const appRef = useRef<Application | null>(null)
  const insetsRef = useRef(zeroInsets)
  const layout = useTouchLayout(hostRef, barRef, snapshot.arena)
  const [store] = useState(() =>
    createHudStore({
      score: 0,
      hp: snapshot.ships.player.hp,
      secondsLeft: snapshot.sessionDuration,
      status: 'running',
    }),
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    let alive = true
    let session: GameSession | null = null
    let onResize: (() => void) | null = null
    const { width, height } = snapshot.arena
    const fit = () => {
      const host = hostRef.current
      if (!host) return
      fitStage(
        app,
        host.clientWidth,
        host.clientHeight,
        width,
        height,
        insetsRef.current,
      )
    }
    const adopt = (next: GameSession) => {
      session = next
      sessionRef.current = next
    }

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

          appRef.current = app
          const match = new GameSession(app, snapshot, store, adopt)
          adopt(match)
          onResize = fit
          app.renderer.on('resize', onResize)
          fit()
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
      appRef.current = null
      sessionRef.current = null
      release()
    }
  }, [snapshot, store])

  useEffect(() => {
    let reported = false
    const report = () => {
      if (reported) return
      if (store.getView().status !== 'ended') return
      const world = sessionRef.current?.world
      if (!world || !world.endReason) return
      reported = true
      onEnd({
        score: world.score,
        played: world.time,
        reason: world.endReason,
      })
    }
    return store.subscribe(report)
  }, [onEnd, store])

  useLayoutEffect(() => {
    const inset = layout?.insets ?? zeroInsets
    insetsRef.current = inset
    const app = appRef.current
    const host = hostRef.current
    if (!app || !host) return
    const { width, height } = snapshot.arena
    fitStage(app, host.clientWidth, host.clientHeight, width, height, inset)
  }, [layout, snapshot])

  return (
    <div
      ref={hostRef}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background,
      }}
    >
      {layout && (
        <TouchControls layout={layout} sessionRef={sessionRef} store={store} />
      )}
      <Hud
        store={store}
        barRef={barRef}
        onResume={() => {
          sessionRef.current?.resume()
        }}
        onMenu={onMenu}
      />
    </div>
  )
}
