import { useState } from 'react'
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
import './ui/ui.css'

type Screen = 'menu' | 'game' | 'result'

function App() {
  const [result, setResult] = useState(loadResult)
  const [screen, setScreen] = useState<Screen>(result ? 'result' : 'menu')
  const [options, setOptions] = useState(loadOptions)
  const [matchConfig, setMatchConfig] = useState(() =>
    configFromOptions(options),
  )

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

  if (screen === 'game') {
    return (
      <GameCanvas
        config={matchConfig}
        onMenu={() => setScreen('menu')}
        onEnd={finish}
      />
    )
  }

  if (screen === 'result' && result) {
    return (
      <Result result={result} onPlay={play} onMenu={() => setScreen('menu')} />
    )
  }

  return <Menu options={options} onPlay={play} onSave={save} />
}

export default App
