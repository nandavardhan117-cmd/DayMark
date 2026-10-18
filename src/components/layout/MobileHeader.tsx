import { ListTodo } from 'lucide-react'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

/** Sticky top bar shown only on small screens (sidebar takes over at `lg`). */
export function MobileHeader() {
  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur-md lg:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Logo size="sm" />
      <div className="flex items-center gap-2">
        <a
          href="#main"
          aria-label="Jump to content"
          className="grid h-9 w-9 place-items-center rounded-xl border border-line text-ink-2 transition-colors hover:bg-surface-2"
        >
          <ListTodo size={16} />
        </a>
        <ThemeToggle />
      </div>
    </header>
  )
}
