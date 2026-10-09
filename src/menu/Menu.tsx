import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { MatchConfig } from '../api/types.ts'
import type { PlayerOptions } from '../game/options.ts'
import { Button } from '../ui/Button.tsx'
import { Controls } from '../ui/Controls.tsx'
import { Panel } from '../ui/Panel.tsx'
import { useDialog } from '../ui/useDialog.ts'
import { NetworkPanel } from './NetworkPanel.tsx'
import { History } from './History.tsx'
import { Options } from './Options.tsx'
import { Ranking } from './Ranking.tsx'

const titleArt = '/assets/png/default/ui/menu/title_pirate_battle.png'
const shipArt = '/assets/png/default/ships/ship_2.png'

type LogTab = 'ranking' | 'history'

export function Menu({
  options,
  onPlay,
  onSave,
}: {
  options: PlayerOptions
  onPlay: () => void
  onSave: (options: PlayerOptions) => boolean
}) {
  const [view, setView] = useState<'home' | 'options' | LogTab>('home')
  const pendingFocus = useRef<string | null>(null)

  useLayoutEffect(() => {
    const id = pendingFocus.current
    if (!id) return
    pendingFocus.current = null
    document.getElementById(id)?.focus()
  }, [view])

  const show = (next: 'home' | 'options' | LogTab, focus: string) => {
    pendingFocus.current = focus
    setView(next)
  }

  return (
    <main className="menu-scene">
      {view === 'home' && (
        <Home
          onPlay={onPlay}
          onOptions={() => show('options', 'session-time')}
          onTab={(tab) => show(tab, tabId(tab))}
        />
      )}
      {view === 'options' && (
        <Options
          saved={options}
          onSave={onSave}
          onBack={() => show('home', 'menu-options')}
        />
      )}
      {view !== 'home' && view !== 'options' && (
        <Log
          tab={view}
          config={{
            sessionTime: options.sessionDuration,
            spawnInterval: options.spawnInterval,
          }}
          onTab={(tab) => show(tab, tabId(tab))}
          onMenu={() => show('home', 'menu-play')}
        />
      )}
    </main>
  )
}

function Home({
  onPlay,
  onOptions,
  onTab,
}: {
  onPlay: () => void
  onOptions: () => void
  onTab: (tab: LogTab) => void
}) {
  const [help, setHelp] = useState(false)

  return (
    <>
      <Panel>
        <h1 className="menu-title">
          <img src={titleArt} alt="Pirate Battle" draggable={false} />
        </h1>
        <p className="menu-tagline">Veleje. Assuma o comando.</p>
        <div className="menu-stack">
          <Button id="menu-play" onClick={onPlay}>
            Jogar
          </Button>
          <Button id="menu-options" variant="secondary" onClick={onOptions}>
            Opções
          </Button>
        </div>
        <img className="menu-mark" src={shipArt} alt="" draggable={false} />
        <p className="menu-tagline">
          Navegue pelas ilhas. Sobreviva à batalha.
        </p>
        <Tabs tab={null} onTab={onTab} />
        <div className="menu-stack menu-help">
          <Button
            id="menu-help"
            compact
            variant="secondary"
            onClick={() => setHelp(true)}
          >
            Como jogar
          </Button>
        </div>
        <NetworkPanel />
      </Panel>
      <HowToPlay open={help} onClose={() => setHelp(false)} />
    </>
  )
}

function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useDialog(open, onClose)
  if (!open) return null

  return (
    <div className="dialog-layer">
      <div className="pause-shade" aria-hidden="true" />
      <div
        ref={dialogRef}
        className="dialog-host"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
      >
        <Panel>
          <h2 id="help-title" className="menu-heading" tabIndex={-1}>
            Como jogar
          </h2>
          <Controls />
          <div className="menu-stack">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Log({
  tab,
  config,
  onTab,
  onMenu,
}: {
  tab: LogTab
  config: MatchConfig
  onTab: (tab: LogTab) => void
  onMenu: () => void
}) {
  return (
    <Panel wide>
      <h1 className="menu-heading">Diário do capitão</h1>
      <Tabs tab={tab} onTab={onTab} />
      <div
        role="tabpanel"
        id={tab === 'ranking' ? 'panel-ranking' : 'panel-history'}
        aria-labelledby={tab === 'ranking' ? 'tab-ranking' : 'tab-history'}
      >
        {tab === 'ranking' ? <Ranking config={config} /> : <History />}
      </div>
      <div className="menu-stack">
        <Button onClick={onMenu}>Menu principal</Button>
      </div>
    </Panel>
  )
}

function Tabs({
  tab,
  onTab,
}: {
  tab: LogTab | null
  onTab: (tab: LogTab) => void
}) {
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = siblingTab(tab, event.key)
    onTab(next)
  }

  return (
    <div
      className="menu-tabs"
      role="tablist"
      aria-label="Registros"
      onKeyDown={onKey}
    >
      <Button
        id="tab-ranking"
        compact
        role="tab"
        tabIndex={tabStop(tab, 'ranking')}
        variant={tab === 'ranking' ? 'primary' : 'secondary'}
        aria-selected={tab === 'ranking'}
        aria-controls="panel-ranking"
        onClick={() => onTab('ranking')}
      >
        Classificação
      </Button>
      <Button
        id="tab-history"
        compact
        role="tab"
        tabIndex={tabStop(tab, 'history')}
        variant={tab === 'history' ? 'primary' : 'secondary'}
        aria-selected={tab === 'history'}
        aria-controls="panel-history"
        onClick={() => onTab('history')}
      >
        Histórico
      </Button>
    </div>
  )
}

function tabId(tab: LogTab): string {
  return tab === 'ranking' ? 'tab-ranking' : 'tab-history'
}

function tabStop(tab: LogTab | null, name: LogTab): 0 | -1 {
  if (tab === null) return name === 'ranking' ? 0 : -1
  return tab === name ? 0 : -1
}

function siblingTab(tab: LogTab | null, key: string): LogTab {
  if (key === 'ArrowRight') {
    if (tab === 'history') return 'ranking'
    return 'history'
  }
  if (tab === 'ranking') return 'history'
  return 'ranking'
}
