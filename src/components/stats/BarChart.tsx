import { cn } from '@/lib/cn'

export type BarDatum = {
  key: string
  label: string
  value: number
  /** Optional tooltip text. */
  title?: string
  highlight?: boolean
}

/**
 * A dependency-free horizontal-or-vertical bar chart.
 * Vertical mode is used for the last-N-days completion chart.
 */
export function BarChart({
  data,
  orientation = 'vertical',
  height = 160,
  formatValue = (value) => `${Math.round(value * 100)}%`,
  className,
}: {
  data: BarDatum[]
  orientation?: 'vertical' | 'horizontal'
  height?: number
  formatValue?: (value: number) => string
  className?: string
}) {
  if (data.length === 0) {
    return (
      <p className={cn('py-8 text-center text-[13px] text-ink-3', className)}>No data yet.</p>
    )
  }

  if (orientation === 'horizontal') {
    return (
      <div className={cn('space-y-2.5', className)}>
        {data.map((bar) => (
          <div key={bar.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
              <span className="truncate font-medium text-ink-2">{bar.label}</span>
              <span className="shrink-0 tabular-nums text-ink-3">{formatValue(bar.value)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500',
                  bar.highlight ? 'bg-success' : 'bg-brand',
                )}
                style={{ width: `${Math.max(0, Math.min(1, bar.value)) * 100}%` }}
                title={bar.title}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex items-end gap-1.5', className)} style={{ height }}>
      {data.map((bar) => {
        const clamped = Math.max(0, Math.min(1, bar.value))
        return (
          <div
            key={bar.key}
            title={bar.title ?? `${bar.label}: ${formatValue(bar.value)}`}
            className="group relative flex flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="pointer-events-none absolute -top-7 z-10 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-bg shadow group-hover:block">
              {formatValue(bar.value)}
            </span>
            <div
              className={cn(
                'w-full max-w-8 rounded-t-md transition-all duration-300',
                bar.value === 0 ? 'bg-surface-2' : bar.highlight ? 'bg-success' : 'bg-brand',
              )}
              style={{ height: `${Math.max(clamped * 100, bar.value === 0 ? 2 : 4)}%` }}
            />
            <span className="truncate text-[10px] font-medium text-ink-3">{bar.label}</span>
          </div>
        )
      })}
    </div>
  )
}
