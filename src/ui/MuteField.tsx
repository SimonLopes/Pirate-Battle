export function MuteField({
  id,
  muted,
  onChange,
}: {
  id: string
  muted: boolean
  onChange: (muted: boolean) => void
}) {
  return (
    <div className="option-field">
      <label className="option-label" htmlFor={id}>
        Mute sound
      </label>
      <div className="option-row">
        <input
          id={id}
          className="option-check"
          type="checkbox"
          checked={muted}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="step-button option-mark" aria-hidden="true">
          <SpeakerIcon muted={muted} />
        </span>
      </div>
    </div>
  )
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M5 13h5l8-6v18l-8-6H5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {muted ? (
        <path
          d="M21 12l8 8M29 12l-8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M22 12a6 6 0 0 1 0 8M25.5 8.5a11 11 0 0 1 0 15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}
