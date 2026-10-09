import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary'

export function Button({
  variant = 'primary',
  compact = false,
  children,
  type = 'button',
  ...rest
}: {
  variant?: Variant
  compact?: boolean
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  const variantClass =
    variant === 'primary' ? 'menu-button-primary' : 'menu-button-secondary'
  const compactClass = compact ? 'menu-button-compact' : ''
  return (
    <button
      type={type}
      className={`menu-button ${variantClass} ${compactClass}`.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}
