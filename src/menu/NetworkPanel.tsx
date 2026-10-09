import { useState } from 'react'
import {
  getNetworkSettings,
  networkScenarios,
  resetNetworkSettings,
  setNetworkSettings,
  type NetworkScenario,
  type NetworkSettings,
} from '../mocks/scenarios.ts'
import { resetStoredMatches } from '../mocks/store.ts'
import { Button } from '../ui/Button.tsx'

export function NetworkPanel() {
  const initial = getNetworkSettings()
  const [settings, setSettings] = useState(initial)
  const [seed, setSeed] = useState(String(initial.seed))
  const [status, setStatus] = useState('')

  const selectScenario = (scenario: NetworkScenario) => {
    const next = { ...settings, scenario }
    setNetworkSettings(next)
    setSettings(next)
    setStatus('')
  }

  const changeSeed = (text: string) => {
    setSeed(text)
    if (!/^\d+$/.test(text)) return
    const value = Number(text)
    if (!Number.isSafeInteger(value) || value > 2147483647) return
    const next: NetworkSettings = { ...settings, seed: value }
    setNetworkSettings(next)
    setSettings(next)
    setStatus('')
  }

  const reset = () => {
    resetStoredMatches()
    const next = resetNetworkSettings()
    setSettings(next)
    setSeed(String(next.seed))
    setStatus('Fixtures restored and stored matches cleared.')
  }

  return (
    <details className="network-debug">
      <summary>Network debug</summary>
      <div className="network-fields">
        <label htmlFor="network-scenario">Scenario</label>
        <select
          id="network-scenario"
          value={settings.scenario}
          onChange={(event) =>
            selectScenario(toScenario(event.currentTarget.value))
          }
        >
          {networkScenarios.map((scenario) => (
            <option key={scenario} value={scenario}>
              {scenario}
            </option>
          ))}
        </select>
        <label htmlFor="network-seed">Seed</label>
        <input
          id="network-seed"
          type="number"
          min="0"
          max="2147483647"
          step="1"
          value={seed}
          onChange={(event) => changeSeed(event.currentTarget.value)}
        />
        <Button compact variant="secondary" onClick={reset}>
          Reset
        </Button>
        <output className="network-status" aria-live="polite">
          {status}
        </output>
      </div>
    </details>
  )
}

function toScenario(value: string): NetworkScenario {
  return networkScenarios.find((scenario) => scenario === value) ?? 'success'
}
