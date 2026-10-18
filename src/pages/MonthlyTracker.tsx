import {
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  Pencil,
  Plus,
  Printer,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/stats/StatCard'
import { useTaskDialogs } from '@/components/tasks/useTaskDialogs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/cn'
import { MONTH_LABELS, formatMedium, todayKey, weekdayOf } from '@/lib/dateUtils'
import {
  cellKey,
  currentMonthCursor,
  habitsForMonth,
  isCurrentMonth,
  monthDayStats,
  monthOverall,
  shiftMonth,
} from '@/lib/monthly'
import { useStore } from '@/lib/store'

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function MonthlyTrackerPage() {
  const { data, ready, toggleCompletion } = useStore()
  const { openCreate, openEdit, requestDelete, dialog, confirm } = useTaskDialogs()

  const [cursor, setCursor] = useState(() => currentMonthCursor())

  const habits = useMemo(
    () => (data ? habitsForMonth(data, cursor.year, cursor.monthIndex) : []),
    [data, cursor],
  )
  const dayStats = useMemo(
    () => (data ? monthDayStats(data, cursor.year, cursor.monthIndex) : []),
    [data, cursor],
  )
  const overall = useMemo(
    () =>
      data
        ? monthOverall(data, cursor.year, cursor.monthIndex)
        : {
            scheduled: 0,
            completed: 0,
            ratio: 0,
            perfectDays: 0,
            activeDays: 0,
            habitCount: 0,
            dayCount: 31,
          },
    [data, cursor],
  )

  if (!ready || !data) return <MonthlySkeleton />

  const monthLabel = `${MONTH_LABELS[cursor.monthIndex]} ${cursor.year}`
  const today = todayKey()
  const categoriesById = new Map(data.categories.map((c) => [c.id, c]))
  const showThisMonthButton = !isCurrentMonth(cursor)

  return (
    <>
      <PageHeader
        eyebrow="Habits"
        title="Monthly tracker"
        description="One row per habit, one column per day. Tick a square to record that day — the same record the rest of DayMark uses."
        actions={
          <Button
            variant="secondary"
            icon={<Printer size={15} />}
            onClick={() => window.print()}
            className="no-print"
          >
            Print
          </Button>
        }
      />

      {/* ---- month navigation ---- */}
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3 no-print">
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Previous month"
            onClick={() => setCursor((c) => shiftMonth(c, -1))}
            className="h-8 w-8"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="min-w-40 px-1 text-center text-[14px] font-semibold tracking-tight text-ink">
            {monthLabel}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Next month"
            onClick={() => setCursor((c) => shiftMonth(c, 1))}
            className="h-8 w-8"
          >
            <ChevronRight size={16} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showThisMonthButton ? (
            <Button size="sm" variant="ghost" onClick={() => setCursor(currentMonthCursor())}>
              This month
            </Button>
          ) : null}
          <Badge tone="brand">{overall.dayCount} days</Badge>
          <Button variant="primary" size="sm" icon={<Plus size={15} />} onClick={openCreate}>
            Add habit
          </Button>
        </div>
      </Card>

      {/* ---- summary ---- */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Month completion"
          value={`${Math.round(overall.ratio * 100)}%`}
          caption={`${overall.completed} of ${overall.scheduled} marks`}
          icon={TrendingUp}
          tone={overall.ratio >= 0.8 ? 'success' : 'brand'}
        />
        <StatCard
          label="Perfect days"
          value={overall.perfectDays}
          caption={`of ${overall.activeDays} active days`}
          icon={Target}
          tone={overall.perfectDays > 0 ? 'success' : 'neutral'}
        />
        <StatCard
          label="Habits"
          value={overall.habitCount}
          caption="rows in this grid"
          icon={Grid3x3}
          tone="neutral"
        />
        <StatCard
          label="Days shown"
          value={overall.dayCount}
          caption={monthLabel}
          icon={CalendarRange}
          tone="brand"
        />
      </div>

      {/* ---- the grid ---- */}
      <Card flush className="overflow-hidden">
        {habits.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Grid3x3}
              title="No habits yet"
              description="Add your first habit and it will appear as a row here. Every tick is saved per date, so past months stay untouched."
              action={
                <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>
                  Add habit
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3 text-[12px] text-ink-3 no-print">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-[4px] border border-line-strong bg-surface" />
                Not done
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="grid h-3.5 w-3.5 place-items-center rounded-[4px] bg-brand text-white">
                  <Check size={9} strokeWidth={4} />
                </span>
                Done
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-[4px] border border-dashed border-line" />
                Not scheduled
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-[4px] bg-surface-2" />
                Weekend
              </span>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  Monthly habit completion grid for {monthLabel}
                </caption>

                <thead>
                  <tr className="border-b border-line">
                    <th
                      scope="col"
                      className="sticky left-0 z-20 bg-surface px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3"
                    >
                      Habit
                    </th>

                    {dayStats.map((stat) => (
                      <th
                        key={stat.date}
                        scope="col"
                        title={`${formatMedium(stat.date)} — ${stat.completed}/${stat.scheduled} done`}
                        className={cn(
                          'px-0.5 py-1.5 text-center align-bottom',
                          stat.isWeekend && 'bg-surface-2/70',
                        )}
                      >
                        <span className="block text-[11.5px] font-semibold tabular-nums text-ink">
                          {stat.day}
                        </span>
                        <span
                          className={cn(
                            'block text-[9.5px] font-medium',
                            stat.isWeekend ? 'text-ink-3' : 'text-ink-3/70',
                          )}
                        >
                          {DAY_LETTERS[stat.weekday]}
                        </span>
                      </th>
                    ))}

                    <th
                      scope="col"
                      className="sticky right-0 z-20 bg-surface px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3"
                    >
                      %
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {habits.map((row) => {
                    const category = row.task.categoryId
                      ? categoriesById.get(row.task.categoryId)
                      : null

                    return (
                      <tr
                        key={row.task.id}
                        className="group border-b border-line last:border-0"
                      >
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-surface px-4 py-1.5 text-left font-normal"
                        >
                          <div className="flex w-[172px] items-center gap-2 sm:w-[212px]">
                            {category ? (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                            ) : null}

                            <span
                              className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink"
                              title={row.task.title}
                            >
                              {row.task.title}
                            </span>

                            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => openEdit(row.task)}
                                aria-label={`Rename ${row.task.title}`}
                                title="Rename habit"
                                className="grid h-6 w-6 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDelete(row.task)}
                                aria-label={`Delete ${row.task.title}`}
                                title="Delete habit (history is kept)"
                                className="grid h-6 w-6 place-items-center rounded-md text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
                              >
                                <Trash2 size={12} />
                              </button>
                            </span>
                          </div>
                        </th>

                        {row.cells.map((cell) => {
                          const isToday = cell.date === today
                          const isFuture = cell.date > today
                          const weekday = weekdayOf(cell.date)
                          const isWeekend = weekday === 0 || weekday === 6

                          return (
                            <td
                              key={cellKey(row.task.id, cell.date)}
                              className={cn('px-0.5 py-1.5 text-center', isWeekend && 'bg-surface-2/40')}
                            >
                              {cell.scheduled ? (
                                <button
                                  type="button"
                                  disabled={isFuture}
                                  onClick={() => toggleCompletion(cell.date, row.task.id)}
                                  aria-pressed={cell.completed}
                                  aria-label={`${row.task.title} on ${formatMedium(cell.date)}, ${
                                    cell.completed ? 'done' : 'not done'
                                  }`}
                                  title={`${row.task.title} — ${formatMedium(cell.date)}`}
                                  className={cn(
                                    'mx-auto grid h-6 w-6 place-items-center rounded-[5px] border transition-all duration-150',
                                    isFuture && 'cursor-not-allowed opacity-45',
                                    cell.completed
                                      ? 'border-brand bg-brand text-white hover:bg-brand-hover'
                                      : 'border-line-strong bg-surface text-transparent hover:border-brand hover:bg-brand-soft',
                                    isToday && !cell.completed && 'ring-1 ring-brand/50',
                                    isToday && cell.completed && 'ring-1 ring-brand/60',
                                  )}
                                >
                                  <Check
                                    size={12}
                                    strokeWidth={3.5}
                                    className={cn(
                                      'transition-transform duration-150',
                                      cell.completed ? 'scale-100' : 'scale-50',
                                    )}
                                  />
                                </button>
                              ) : (
                                <span
                                  aria-label={`${row.task.title} not scheduled on ${formatMedium(
                                    cell.date,
                                  )}`}
                                  title="Not scheduled"
                                  className="mx-auto block h-6 w-6 rounded-[5px] border border-dashed border-line"
                                />
                              )}
                            </td>
                          )
                        })}

                        <td className="sticky right-0 z-10 bg-surface px-3 py-1.5 text-center">
                          <span
                            className={cn(
                              'text-[12.5px] font-semibold tabular-nums',
                              row.ratio >= 0.8
                                ? 'text-success'
                                : row.ratio >= 0.5
                                  ? 'text-ink-2'
                                  : 'text-warning',
                            )}
                            title={`${row.completed}/${row.scheduled} days completed`}
                          >
                            {Math.round(row.ratio * 100)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>

                <tfoot>
                  <tr className="border-t border-line bg-surface-2/50">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-surface px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3"
                    >
                      Daily total
                    </th>

                    {dayStats.map((stat) => (
                      <td
                        key={stat.date}
                        title={`${formatMedium(stat.date)} — ${stat.completed}/${stat.scheduled} done`}
                        className={cn('px-0.5 py-2 text-center', stat.isWeekend && 'bg-surface-2/60')}
                      >
                        <span
                          className="mx-auto block h-5 w-full max-w-5 rounded-[4px] bg-brand"
                          style={{ opacity: stat.scheduled === 0 ? 0.06 : 0.12 + stat.ratio * 0.78 }}
                        />
                      </td>
                    ))}

                    <td className="sticky right-0 z-10 bg-surface px-3 py-2 text-center">
                      <span className="text-[12.5px] font-bold tabular-nums text-ink">
                        {Math.round(overall.ratio * 100)}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="border-t border-line px-5 py-4 no-print">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="font-medium text-ink-2">Overall progress</span>
                    <span className="tabular-nums text-ink-3">
                      {overall.completed}/{overall.scheduled} marks
                    </span>
                  </div>
                  <ProgressBar
                    value={overall.ratio}
                    tone={overall.ratio >= 0.8 ? 'success' : 'brand'}
                  />
                </div>
                <Badge tone="neutral">
                  {overall.perfectDays} perfect{' '}
                  {overall.perfectDays === 1 ? 'day' : 'days'}
                </Badge>
              </div>
            </div>
          </>
        )}
      </Card>

      {dialog}
      {confirm}
    </>
  )
}

function MonthlySkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-60 rounded-xl bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card h-[420px]" />
    </div>
  )
}
