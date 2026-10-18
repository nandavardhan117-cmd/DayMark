import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type MenuItem = {
  /** Stable React key. */
  id: string
  label: ReactNode
  icon?: ReactNode
  onClick: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
}

/**
 * Minimal dropdown menu. Closes on outside click, Escape, or after an item is
 * chosen. No external dependency so it stays easy to reason about.
 */
export function Menu({
  trigger,
  items,
  align = 'end',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  items: MenuItem[]
  align?: 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}

      {open ? (
        <div
          role="menu"
          className={cn(
            'absolute z-30 mt-1 min-w-44 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium',
                'transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-40',
                item.tone === 'danger'
                  ? 'text-danger hover:bg-danger-soft'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
