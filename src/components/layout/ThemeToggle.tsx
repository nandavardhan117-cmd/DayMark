import { Monitor, Moon, Sun } from 'lucide-react'
import { useStore, useThemeEffect } from '@/lib/store'
import type { ThemePreference } from '@/types'
import { cn } from '@/lib/cn'

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

/** Cycles light → dark → system. Shows the current mode in the tooltip. */
export function ThemeToggle({ className }: { className?: string }) {
  const { data } = useStore()
  const { updateSettings } = useThemeEffect()
  const current: ThemePreference = data?.settings.theme ?? 'system'
  const index = OPTIONS.findIndex((option) => option.value === current)
  const next = OPTIONS[(index + 1) % OPTIONS.length] ?? OPTIONS[0]
  const CurrentIcon = OPTIONS[index]?.icon ?? Sun

  return (
    <button
      type="button"
      onClick={() => updateSettings({ theme: next?.value ?? 'system' })}
      title={`Theme: ${OPTIONS[index]?.label ?? 'System'} — click for ${next?.label ?? 'light'}`}
      aria-label={`Change theme, currently ${OPTIONS[index]?.label ?? 'System'}`}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-ink-2',
        'transition-all duration-150 hover:border-line-strong hover:bg-surface-2 hover:text-ink active:translate-y-px',
        className,
      )}
    >
      <CurrentIcon size={16} strokeWidth={2} />
    </button>
  )
}
