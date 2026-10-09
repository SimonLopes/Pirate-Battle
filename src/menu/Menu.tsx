import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { PlayerOptions } from '../game/options.ts'
import { Button } from '../ui/Button.tsx'
import { Panel } from '../ui/Panel.tsx'
import { Options } from './Options.tsx'

const titleArt = '/assets/png/default/ui/menu/title_pirate_battle.png'

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
  return (
    <Panel>
      <h1 className="menu-title">
        <img src={titleArt} alt="Pirate Battle" draggable={false} />
      </h1>
      <p className="menu-tagline">Zarpe. Assuma o comando.</p>
      <div className="menu-stack">
        <Button id="menu-play" onClick={onPlay}>
          Jogar
        </Button>
        <Button id="menu-options" variant="secondary" onClick={onOptions}>
          Opções
        </Button>
      </div>
      <Controls />
      <Tabs tab={null} onTab={onTab} />
    </Panel>
  )
}

function Log({
  tab,
  onTab,
  onMenu,
}: {
  tab: LogTab
  onTab: (tab: LogTab) => void
  onMenu: () => void
}) {
  const title = tab === 'ranking' ? 'Classificação' : 'Histórico'
  const copy =
    tab === 'ranking'
      ? 'A classificação aparece aqui.'
      : 'O histórico aparece aqui.'

  return (
    <Panel wide>
      <h1 className="menu-heading">Diário do capitão</h1>
      <Tabs tab={tab} onTab={onTab} />
      <div
        role="tabpanel"
        id={tab === 'ranking' ? 'panel-ranking' : 'panel-history'}
        aria-labelledby={tab === 'ranking' ? 'tab-ranking' : 'tab-history'}
      >
        <h2 className="menu-heading">{title}</h2>
        <p className="menu-copy">{copy}</p>
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

function Controls() {
  return (
    <section className="controls" aria-labelledby="controls-heading">
      <h2 id="controls-heading">Controles</h2>
      <div className="controls-grid">
        <div>
          <h3>Teclado</h3>
          <ul>
            <li>
              <kbd>W</kbd> <kbd>↑</kbd> Avançar
            </li>
            <li>
              <kbd>S</kbd> <kbd>↓</kbd> Ré
            </li>
            <li>
              <kbd>A</kbd> <kbd>←</kbd> Virar à esquerda
            </li>
            <li>
              <kbd>D</kbd> <kbd>→</kbd> Virar à direita
            </li>
            <li>
              <kbd>Espaço</kbd> Tiro frontal
            </li>
            <li>
              <kbd>Q</kbd> <kbd>E</kbd> Tiro à esquerda e à direita
            </li>
            <li>
              <kbd>Esc</kbd> <kbd>P</kbd> Pausar
            </li>
          </ul>
        </div>
        <div>
          <h3>Toque</h3>
          <ul>
            <li>Direcional — navegar e virar</li>
            <li>Botões de tiro — frente, esquerda e direita</li>
            <li>Pausar — interrompe a partida</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
