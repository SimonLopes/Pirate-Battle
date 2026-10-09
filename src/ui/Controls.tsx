type ControlMode = 'all' | 'keyboard' | 'touch'

function controlHeading(mode: ControlMode): string {
  if (mode === 'keyboard') return 'Teclado'
  if (mode === 'touch') return 'Toque'
  return 'Controles'
}

export function Controls({
  mode = 'all',
  headingId = 'controls-heading',
}: {
  mode?: ControlMode
  headingId?: string
}) {
  const heading = controlHeading(mode)
  const brief = mode === 'all' ? '' : ' controls-brief'

  return (
    <section className={`controls${brief}`} aria-labelledby={headingId}>
      <h2 id={headingId}>{heading}</h2>
      <div className="controls-grid">
        {mode !== 'touch' && (
          <div>
            {mode === 'all' && <h3>Teclado</h3>}
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
        )}
        {mode !== 'keyboard' && (
          <div>
            {mode === 'all' && <h3>Toque</h3>}
            <ul>
              <li>Direcional — navegar e virar</li>
              <li>Botões de tiro — frente, esquerda e direita</li>
              <li>Pausar — interrompe a partida</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
