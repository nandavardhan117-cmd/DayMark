import { addDays, formatCompact, todayKey, weekdayOf } from '@/lib/dateUtils'
import { cn } from '@/lib/cn'
import type { DailyStat } from '@/lib/stats'

/**
 * A compact 7-day completion strip.
 * Each column is a vertical bar whose fill height matches the completion ratio.
 */
export function WeekStrip({
  stats,
  className,
  onSelectDay,
}: {
  stats: DailyStat[]
  className?: string
  onSelectDay?: (date: string) => void
}) {
  const today = todayKey()

  return (
    <div className={cn('grid grid-cols-7 gap-1.5', className)}>
      {stats.map((stat) => {
        const isToday = stat.date === today
        const isFuture = stat.date > today
        const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][weekdayOf(stat.date)]
        const height = stat.hasTasks ? Math.max(6, stat.ratio * 100) : 0

        return (
          <button
            key={stat.date}
            type="button"
            onClick={() => onSelectDay?.(stat.date)}
            title={`${formatCompact(stat.date)} — ${stat.completed}/${stat.scheduled} done`}
            className={cn(
              'group flex flex-col items-center gap-1.5 rounded-lg p-1 transition-colors',
              onSelectDay && 'hover:bg-surface-2',
              isFuture && 'opacity-40',
            )}
          >
            <span
              className={cn(
                'text-[10.5px] font-semibold',
                isToday ? 'text-brand' : 'text-ink-3',
              )}
            >
              {dayLabel}
            </span>

            <span className="relative flex h-16 w-full items-end overflow-hidden rounded-md bg-surface-2">
              {stat.hasTasks ? (
                <span
                  className={cn(
                    'w-full rounded-md transition-all duration-500',
                    stat.perfect ? 'bg-success' : 'bg-brand',
                  )}
                  style={{ height: `${height}%` }}
                />
              ) : (
                <span className="w-full rounded-md border border-dashed border-line" style={{ height: '22%' }} />
              )}
            </span>

            <span
              className={cn(
                'text-[10px] font-medium tabular-nums',
                isToday ? 'text-brand' : 'text-ink-3',
              )}
            >
              {stat.hasTasks ? `${Math.round(stat.ratio * 100)}%` : '—'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Build the 7 stats ending on `from` (inclusive). */
export function lastSevenDays(
  makeStat: (date: string) => DailyStat,
  from: string = todayKey(),
): DailyStat[] {
  const out: DailyStat[] = []
  for (let i = 6; i >= 0; i--) out.push(makeStat(addDays(from, -i)))
  return out
}
