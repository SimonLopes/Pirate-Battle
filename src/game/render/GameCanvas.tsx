import { useCallback, useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import type { GameConfig } from '../config.ts'
import { GameSession } from '../GameSession.ts'
import { loadAssets, type GameAssets } from './assets.ts'
import { ControlHint } from '../hud/ControlHint.tsx'
import { Hud } from '../hud/Hud.tsx'
import { createHudStore } from '../hud/store.ts'
import type { MatchResult } from '../result.ts'
import { TouchControls } from '../input/TouchControls.tsx'
import { useTouchLayout } from '../input/useTouchLayout.ts'
import { listenFullscreen } from '../fullscreen.ts'
import { stageFit } from '../input/touch.ts'
import { Button } from '../../ui/Button.tsx'
import { Panel } from '../../ui/Panel.tsx'

const background = '#44cbe5'

function fitStage(
  app: Application,
  viewW: number,
  viewH: number,
  arenaW: number,
  arenaH: number,
) {
  const fit = stageFit(viewW, viewH, arenaW, arenaH)
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
  const [attempt, setAttempt] = useState(0)
  const [progress, setProgress] = useState(0)
  const [assets, setAssets] = useState<GameAssets | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const begin = useCallback(() => {
    setPlaying(true)
  }, [])
  const failStart = useCallback(() => {
    setError('Could not start the match.')
  }, [])

  useEffect(() => {
    let alive = true
    void loadAssets((value) => {
      if (alive) setProgress(value)
    }).then(
      (loaded) => {
        if (!alive) return
        setProgress(1)
        setAssets(loaded)
      },
      () => {
        if (!alive) return
        setError('Could not load the game assets.')
      },
    )
    return () => {
      alive = false
    }
  }, [attempt])

  const retry = () => {
    setError(null)
    setProgress(0)
    setAssets(null)
    setPlaying(false)
    setAttempt((value) => value + 1)
  }

  return (
    <>
      {assets && !error && (
        <Match
          config={config}
          arena={assets.arena}
          covered={!playing}
          onMenu={onMenu}
          onEnd={onEnd}
          onReady={begin}
          onFail={failStart}
        />
      )}
      {!playing && (
        <LoadScreen progress={progress} error={error} onRetry={retry} />
      )}
    </>
  )
}

function Match({
  config,
  arena,
  covered,
  onMenu,
  onEnd,
  onReady,
  onFail,
}: {
  config: GameConfig
  arena: GameAssets['arena']
  covered: boolean
  onMenu: () => void
  onEnd: (result: MatchResult) => void
  onReady: () => void
  onFail: () => void
}) {
  const [snapshot] = useState(config)
  const hostRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<GameSession | null>(null)
  const appRef = useRef<Application | null>(null)
  const layout = useTouchLayout(hostRef, barRef)
  const [store] = useState(() =>
    createHudStore({
      score: 0,
      hp: snapshot.ships.player.hp,
      secondsLeft: snapshot.sessionDuration,
      status: 'running',
      onStick: false,
    }),
  )
  const stickRef = useRef(layout?.stick ?? null)

  useEffect(() => {
    stickRef.current = layout?.stick ?? null
    sessionRef.current?.setStick(stickRef.current)
  }, [layout])

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
      fitStage(app, host.clientWidth, host.clientHeight, width, height)
      session?.cover(host.clientWidth, host.clientHeight)
    }
    const adopt = (next: GameSession) => {
      session = next
      sessionRef.current = next
    }
    const stopFullscreen = listenFullscreen(fit)

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
          const match = new GameSession(app, snapshot, store, adopt, arena)
          adopt(match)
          match.setStick(stickRef.current)
          onResize = fit
          app.renderer.on('resize', onResize)
          fit()
          app.canvas.style.display = 'block'
          host.appendChild(app.canvas)
          onReady()
        },
        () => {
          if (alive) onFail()
        },
      )

    return () => {
      alive = false
      stopFullscreen()
      appRef.current = null
      sessionRef.current = null
      release()
    }
  }, [arena, onFail, onReady, snapshot, store])

  useEffect(() => {
    if (covered) return
    sessionRef.current?.start()
  }, [covered])

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

  return (
    <div
      ref={hostRef}
      inert={covered}
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
      {!covered && <ControlHint />}
    </div>
  )
}

function LoadScreen({
  progress,
  error,
  onRetry,
}: {
  progress: number
  error: string | null
  onRetry: () => void
}) {
  const percent = loadPercent(progress)

  useEffect(() => {
    if (!error) return
    document.getElementById('asset-retry')?.focus()
  }, [error])

  return (
    <main
      className="menu-scene load-screen"
      aria-busy={error ? undefined : true}
    >
      <Panel>
        <h1 id="load-title" className="menu-heading">
          {error ? 'Loading failed' : 'Loading'}
        </h1>
        {error ? (
          <div className="menu-stack">
            <p id="asset-error" className="option-error" role="alert">
              {error}
            </p>
            <Button
              id="asset-retry"
              aria-describedby="asset-error"
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div
              className="load-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-valuetext={`${percent}%`}
              aria-labelledby="load-title"
            >
              <div className="load-fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="menu-copy" aria-hidden="true">
              {percent}%
            </p>
          </>
        )}
      </Panel>
    </main>
  )
}

function loadPercent(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  const unit = Math.min(1, Math.max(0, progress))
  return Math.round(unit * 100)
}
