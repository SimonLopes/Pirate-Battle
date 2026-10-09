import { useLayoutEffect, useRef } from 'react'

const focusable =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'

export function useDialog(open: boolean, onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const dismissRef = useRef(onDismiss)

  useLayoutEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])

  useLayoutEffect(() => {
    if (!open) return
    const root = ref.current
    if (!root) return
    const previous = document.activeElement
    const items = () => [...root.querySelectorAll<HTMLElement>(focusable)]
    items()[0]?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        dismissRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const list = items()
      const first = list[0]
      const last = list[list.length - 1]
      if (!first || !last) return
      const current = document.activeElement
      if (!(current instanceof Node) || !root.contains(current)) {
        event.preventDefault()
        const edge = event.shiftKey ? last : first
        edge.focus()
        return
      }
      if (event.shiftKey && current === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && current === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (previous instanceof HTMLElement && document.contains(previous)) {
        previous.focus({ preventScroll: true })
      }
    }
  }, [open])

  return ref
}
