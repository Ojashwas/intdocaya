import { useEffect, useRef } from 'react'

export function useDialogFocus(onClose: () => void) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const prior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = ref.current
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])',
        ) || [],
      )
    focusable()[0]?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    dialog?.addEventListener('keydown', handleKey)
    return () => {
      dialog?.removeEventListener('keydown', handleKey)
      prior?.focus()
    }
  }, [onClose])
  return ref
}
