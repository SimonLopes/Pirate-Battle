import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { play, type SoundName } from '../audio.ts'

type Variant = 'primary' | 'secondary'

export function Button({
  variant = 'primary',
  compact = false,
  sound = 'ui_click',
  children,
  type = 'button',
  onClick,
  ...rest
}: {
  variant?: Variant
  compact?: boolean
  sound?: SoundName | null
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  const variantClass =
    variant === 'primary' ? 'menu-button-primary' : 'menu-button-secondary'
  const compactClass = compact ? 'menu-button-compact' : ''
  return (
    <button
      type={type}
      className={`menu-button ${variantClass} ${compactClass}`.trim()}
      onClick={(event) => {
        if (sound) play(sound)
        onClick?.(event)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
