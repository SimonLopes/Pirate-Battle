import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPendingMatch } from './api/pending.ts'
import { useMatchSave } from './api/useMatchSave.ts'
import type { MatchRecord } from './api/types.ts'
import { enterFullscreenOnTouch } from './game/fullscreen.ts'
import {
  configFromOptions,
  loadOptions,
  saveOptions,
  type PlayerOptions,
} from './game/options.ts'
import { loadResult, saveResult, type MatchResult } from './game/result.ts'
import { GameCanvas } from './game/render/GameCanvas.tsx'
import { Menu } from './menu/Menu.tsx'
import { Result } from './menu/Result.tsx'
import { RotateNotice } from './ui/RotateNotice.tsx'
import { useCoarsePortrait } from './ui/useCoarsePortrait.ts'
import './ui/ui.css'

type Screen = 'menu' | 'game' | 'result'

function App() {
  const [result, setResult] = useState<MatchResult | null>(loadResult)
  const [matchRecord, setMatchRecord] = useState<MatchRecord | null>(null)
  const [screen, setScreen] = useState<Screen>('menu')
  const [options, setOptions] = useState(loadOptions)
  const [isOptionsUnsaved, setIsOptionsUnsaved] = useState(false)
  const [matchConfig, setMatchConfig] = useState(() =>
    configFromOptions(options),
  )
  const matchSave = useMatchSave()
  const locked = useCoarsePortrait()
  const screenRef = useRef(screen)

  useLayoutEffect(() => {
    if (screenRef.current === screen) return
    screenRef.current = screen
    if (screen !== 'menu') return
    document.getElementById('menu-play')?.focus()
  }, [screen])

  const play = () => {
    enterFullscreenOnTouch(options.fullscreenOnMobile)
    setMatchConfig(configFromOptions(options))
    setScreen('game')
  }

  const finish = (next: MatchResult) => {
    const record = createPendingMatch({
      score: next.score,
      played: next.played,
      reason: next.reason,
      sessionTime: matchConfig.sessionDuration,
      spawnInterval: matchConfig.spawnInterval,
    })
    matchSave.submit(record)
    saveResult(next)
    setMatchRecord(record)
    setResult(next)
    setScreen('result')
  }

  const save = (next: PlayerOptions) => {
    setOptions(next)
    setIsOptionsUnsaved(!saveOptions(next))
  }

  let view: ReactNode
  if (screen === 'game') {
    view = (
      <GameCanvas
        config={matchConfig}
        onMenu={() => setScreen('menu')}
        onEnd={finish}
      />
    )
  } else if (screen === 'result' && result && matchRecord) {
    view = (
      <Result
        result={result}
        status={matchSave.statusFor(matchRecord)}
        onRetry={() => matchSave.retry(matchRecord)}
        onPlay={play}
        onMenu={() => setScreen('menu')}
      />
    )
  } else {
    view = (
      <Menu
        options={options}
        isOptionsUnsaved={isOptionsUnsaved}
        last={result}
        onPlay={play}
        onSave={save}
      />
    )
  }

  return (
    <>
      <div inert={locked ? true : undefined}>{view}</div>
      {locked && <RotateNotice />}
    </>
  )
}

export default App
