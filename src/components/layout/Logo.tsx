import { Check, Layers } from 'lucide-react'

/** DayMark brand mark + wordmark. Clickable via the wrapper you put it in. */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-9 w-9 rounded-xl'
  const icon = size === 'sm' ? 15 : 18

  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cnSafe(
          'grid place-items-center bg-gradient-to-br from-brand to-[#7c3aed] text-white shadow-sm',
          box,
        )}
      >
        <Check size={icon} strokeWidth={3} />
      </span>
      <span
        className={cnSafe(
          'font-bold tracking-tight text-ink',
          size === 'sm' ? 'text-[15px]' : 'text-[17px]',
        )}
      >
        DayMark
      </span>
    </span>
  )
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cnSafe('grid h-8 w-8 place-items-center rounded-xl bg-brand text-white', className)}>
      <Layers size={16} strokeWidth={2.25} />
    </span>
  )
}

// Local tiny helper to avoid importing cn just for this file's two uses.
function cnSafe(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
