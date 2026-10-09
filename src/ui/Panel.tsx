import type { ReactNode } from 'react'

export function Panel({
  children,
  wide = false,
}: {
  children: ReactNode
  wide?: boolean
}) {
  const name = wide ? 'menu-panel menu-panel-wide' : 'menu-panel'
  return (
    <div className={name}>
      <div className="menu-panel-body">{children}</div>
    </div>
  )
}
