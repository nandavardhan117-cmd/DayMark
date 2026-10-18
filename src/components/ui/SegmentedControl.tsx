import { cn } from '@/lib/cn'

export type SegmentOption<T extends string> = {
  value: T
  label: React.ReactNode
  icon?: React.ReactNode
  title?: string
}

type SegmentedControlProps<T extends string> = {
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  className?: string
  /** 'pill' is the default rounded group; 'boxed' is for form-style choices. */
  variant?: 'pill' | 'boxed'
  size?: 'sm' | 'md'
  ariaLabel?: string
}

/** A compact radio group — used for recurrence type, theme mode, ranges, etc. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  variant = 'pill',
  size = 'md',
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-full items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] font-medium',
              'transition-all duration-150 whitespace-nowrap',
              size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]',
              variant === 'boxed' && 'rounded-lg',
              active
                ? 'bg-surface text-ink shadow-sm ring-1 ring-line'
                : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
