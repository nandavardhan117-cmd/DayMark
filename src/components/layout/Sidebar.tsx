import {
  BarChart3,
  CalendarDays,
  Cloud,
  Database,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Settings,
  SquareDashedBottom,
  SunMoon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { useStore } from '@/lib/store'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/today', label: 'Today', icon: SunMoon },
  { to: '/tasks', label: 'All Tasks', icon: ListTodo },
  { to: '/monthly', label: 'Monthly Tracker', icon: SquareDashedBottom },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/statistics', label: 'Statistics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { storageKind, repositoryLabel } = useStore()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-16 items-center px-5">
        <NavLink to="/" aria-label="DayMark home">
          <Logo />
        </NavLink>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 scrollbar-thin" aria-label="Main">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium',
                'transition-all duration-150',
                isActive
                  ? 'bg-brand-soft text-brand'
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={17}
                  strokeWidth={2}
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-brand' : 'text-ink-3 group-hover:text-ink-2',
                  )}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        {user ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-brand-soft px-3 py-2.5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-brand">
                <Cloud size={12} className="shrink-0" />
                Signed in
              </p>
              <p className="mt-0.5 truncate text-[11px] text-brand/70">
                {user.displayName || user.email || 'Cloud sync'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-brand transition-colors hover:bg-brand/10"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
              <Database size={12} className="shrink-0 text-ink-3" />
              {storageKind === 'cloud' ? 'Synced to cloud' : 'Stored locally'}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-ink-3">{repositoryLabel}</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
