import type { ReactNode } from 'react'

export function Panel({
  children,
  wide = false,
  className = '',
  actions,
}: {
  children: ReactNode
  wide?: boolean
  className?: string
  actions?: ReactNode
}) {
  const size = wide ? 'menu-panel menu-panel-wide' : 'menu-panel'
  const name = className ? `${size} ${className}` : size
  return (
    <div className={name}>
      <div className="menu-panel-body">{children}</div>
      {actions && <div className="menu-panel-actions">{actions}</div>}
    </div>
  )
}
