import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  Settings,
  SquareDashedBottom,
  SunMoon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'

type Item = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

const ITEMS: Item[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/today', label: 'Today', icon: SunMoon },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/monthly', label: 'Month', icon: SquareDashedBottom },
  { to: '/calendar', label: 'Cal', icon: CalendarDays },
  { to: '/statistics', label: 'Stats', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

/** Bottom tab bar for phones and tablets. Hidden from `lg` upwards. */
export function MobileNav() {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-7">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-0.5 py-2 text-[9.5px] font-medium transition-colors',
                isActive ? 'text-brand' : 'text-ink-3',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'grid h-6 w-9 place-items-center rounded-full transition-colors',
                    isActive ? 'bg-brand-soft' : '',
                  )}
                >
                  <item.icon size={16} strokeWidth={2} />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
