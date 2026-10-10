import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { MatchConfig } from '../api/types.ts'
import { play } from '../audio.ts'
import type { PlayerOptions } from '../game/options.ts'
import type { MatchResult } from '../game/result.ts'
import { Button } from '../ui/Button.tsx'
import { Controls } from '../ui/Controls.tsx'
import { Panel } from '../ui/Panel.tsx'
import { useDialog } from '../ui/useDialog.ts'
import { NetworkPanel } from './NetworkPanel.tsx'
import { History } from './History.tsx'
import { Options } from './Options.tsx'
import { Ranking } from './Ranking.tsx'
import { LastResult } from './Result.tsx'

const titleArt = '/assets/png/default/ui/menu/title_pirate_battle.png'
const shipArt = '/assets/png/default/ships/ship_2.png'
const logoArt = '/assets/logo_jungle_gaming.svg'

type LogTab = 'ranking' | 'history'

export function Menu({
  options,
  isOptionsUnsaved,
  last,
  onPlay,
  onSave,
}: {
  options: PlayerOptions
  isOptionsUnsaved: boolean
  last: MatchResult | null
  onPlay: () => void
  onSave: (options: PlayerOptions) => void
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
          captainName={options.captainName}
          isOptionsUnsaved={isOptionsUnsaved}
          last={last}
          onPlay={onPlay}
          onOptions={() => show('options', 'captain-name')}
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
  captainName,
  isOptionsUnsaved,
  last,
  onPlay,
  onOptions,
  onTab,
}: {
  captainName: string
  isOptionsUnsaved: boolean
  last: MatchResult | null
  onPlay: () => void
  onOptions: () => void
  onTab: (tab: LogTab) => void
}) {
  const [help, setHelp] = useState(false)

  return (
    <>
      <Panel className="menu-panel-home">
        <div className="home">
          <div className="home-lead">
            <h1 className="menu-title">
              <img src={titleArt} alt="Pirate Battle" draggable={false} />
            </h1>
            <p className="menu-captain">
              <span className="sr-only">Captain name: </span>
              {captainName}
            </p>
            <p className="menu-tagline">Set sail. Take command.</p>
            <div className="home-main">
              <Button id="menu-play" onClick={onPlay}>
                Play
              </Button>
              <Button id="menu-options" onClick={onOptions}>
                Options
              </Button>
            </div>
            {isOptionsUnsaved && (
              <p className="option-notice" role="status">
                Options will reset when you reload.
              </p>
            )}
          </div>
          <div className="home-side">
            <img className="menu-mark" src={shipArt} alt="" draggable={false} />
            <p className="menu-tagline menu-tagline-plain">
              Navigate the islands. Survive the battle.
            </p>
            {last && <LastResult result={last} />}
            <div className="home-links">
              <Tabs tab={null} onTab={onTab} />
              <Button
                id="menu-help"
                compact
                variant="secondary"
                sound="ui_open"
                onClick={() => setHelp(true)}
              >
                How to play
              </Button>
            </div>
          </div>
        </div>
      </Panel>
      <NetworkPanel />
      <img
        className="menu-logo"
        src={logoArt}
        alt="Jungle Gaming"
        draggable={false}
      />
      <HowToPlay
        open={help}
        onClose={() => {
          play('ui_close')
          setHelp(false)
        }}
      />
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
            How to play
          </h2>
          <Controls />
          <div className="menu-stack">
            <Button sound={null} onClick={onClose}>
              Close
            </Button>
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
      <div className="log">
        <h1 className="menu-heading log-head">Captain's log</h1>
        <Tabs tab={tab} onTab={onTab} />
        <div
          className="log-data"
          role="tabpanel"
          id={tab === 'ranking' ? 'panel-ranking' : 'panel-history'}
          aria-labelledby={tab === 'ranking' ? 'tab-ranking' : 'tab-history'}
        >
          {tab === 'ranking' ? <Ranking config={config} /> : <History />}
        </div>
        <div className="menu-stack log-back">
          <Button sound="ui_back" onClick={onMenu}>
            Main menu
          </Button>
        </div>
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
      aria-label="Records"
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
        Ranking
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
        Match History
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
