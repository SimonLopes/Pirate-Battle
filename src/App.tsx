import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
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
  const [result, setResult] = useState(loadResult)
  const [screen, setScreen] = useState<Screen>(result ? 'result' : 'menu')
  const [options, setOptions] = useState(loadOptions)
  const [matchConfig, setMatchConfig] = useState(() =>
    configFromOptions(options),
  )
  const locked = useCoarsePortrait()
  const screenRef = useRef(screen)

  useLayoutEffect(() => {
    if (screenRef.current === screen) return
    screenRef.current = screen
    if (screen !== 'menu') return
    document.getElementById('menu-play')?.focus()
  }, [screen])

  const play = () => {
    setMatchConfig(configFromOptions(options))
    setScreen('game')
  }

  const finish = (next: MatchResult) => {
    saveResult(next)
    setResult(next)
    setScreen('result')
  }

  const save = (next: PlayerOptions) => {
    if (!saveOptions(next)) return false
    setOptions(next)
    return true
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
  } else if (screen === 'result' && result) {
    view = (
      <Result result={result} onPlay={play} onMenu={() => setScreen('menu')} />
    )
  } else {
    view = <Menu options={options} onPlay={play} onSave={save} />
  }

  return (
    <>
      <div inert={locked ? true : undefined}>{view}</div>
      {locked && <RotateNotice />}
    </>
  )
}

export default App
