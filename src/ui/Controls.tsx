type ControlMode = 'all' | 'keyboard' | 'touch'

function controlHeading(mode: ControlMode): string {
  if (mode === 'keyboard') return 'Keyboard'
  if (mode === 'touch') return 'Touch'
  return 'Controls'
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
            {mode === 'all' && <h3>Keyboard</h3>}
            <ul>
              <li>
                <kbd>W</kbd> <kbd>↑</kbd> Forward
              </li>
              <li>
                <kbd>S</kbd> <kbd>↓</kbd> Reverse
              </li>
              <li>
                <kbd>A</kbd> <kbd>←</kbd> Turn left
              </li>
              <li>
                <kbd>D</kbd> <kbd>→</kbd> Turn right
              </li>
              <li>
                <kbd>Space</kbd> Fire forward
              </li>
              <li>
                <kbd>Q</kbd> <kbd>E</kbd> Fire left and right
              </li>
              <li>
                <kbd>Esc</kbd> <kbd>P</kbd> Pause
              </li>
            </ul>
          </div>
        )}
        {mode !== 'keyboard' && (
          <div>
            {mode === 'all' && <h3>Touch</h3>}
            <ul>
              <li>Joystick — sail and turn</li>
              <li>Fire buttons — forward, left and right</li>
              <li>Pause — stops the match</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
