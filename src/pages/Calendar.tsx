import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Flame } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressRing } from '@/components/stats/ProgressRing'
import { TaskList } from '@/components/tasks/TaskList'
import { useTaskDialogs } from '@/components/tasks/useTaskDialogs'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/cn'
import {
  MONTH_LABELS,
  addDays,
  formatLongDay,
  formatMedium,
  monthGrid,
  relativeDayLabel,
  todayKey,
} from '@/lib/dateUtils'
import { tasksForDate } from '@/lib/recurrence'
import { formatPercent, series, statForDate } from '@/lib/stats'
import { useStore } from '@/lib/store'

export function CalendarPage() {
  const { data, ready } = useStore()
  const navigate = useNavigate()
  const { openEdit, requestDelete, dialog, confirm, openCreate } = useTaskDialogs()

  const today = todayKey()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState<string>(today)

  if (!ready || !data) return <CalendarSkeleton />

  const weekStartsOn = data.settings.weekStartsOn
  const grid = monthGrid(cursor.year, cursor.month, weekStartsOn)

  // Weekday header labels, rotated to match the week start setting.
  const base = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const labels = base.slice(weekStartsOn).concat(base.slice(0, weekStartsOn))

  const selectedStat = statForDate(data, selected)
  const selectedTasks = tasksForDate(data.tasks, selected, weekStartsOn)
  const isFuture = selected > today

  // Month-level summary.
  const flat = grid.flat().filter((day) => {
    const [y, m] = day.split('-').map(Number)
    return y === cursor.year && m === cursor.month + 1
  })
  const monthStats = series(data, flat[0] ?? today, flat[flat.length - 1] ?? today).filter((s) =>
    flat.includes(s.date),
  )
  const daysWithData = monthStats.filter((s) => s.hasTasks)
  const perfectDays = monthStats.filter((s) => s.perfect).length
  const monthScheduled = monthStats.reduce((sum, s) => sum + s.scheduled, 0)
  const monthCompleted = monthStats.reduce((sum, s) => sum + s.completed, 0)
  const monthRatio = monthScheduled === 0 ? 0 : monthCompleted / monthScheduled

  const firstWeekday = weekStartsOn === 1 ? 1 : 0

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="History"
        title="Calendar"
        description="Every day keeps its own completion record. Click any day to review or correct it."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                const now = new Date()
                setCursor({ year: now.getFullYear(), month: now.getMonth() })
                setSelected(today)
              }}
            >
              This month
            </Button>
            <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
                className="h-8 w-8"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="min-w-36 text-center text-[13.5px] font-semibold text-ink">
                {MONTH_LABELS[cursor.month]} {cursor.year}
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
                className="h-8 w-8"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-4">
            <Legend color="bg-success-soft" text="All done" />
            <Legend color="bg-brand-soft" text="Partly done" />
            <Legend color="bg-surface" text="Nothing done" border />
            <Legend color="bg-surface-2" text="Nothing scheduled" border dashed />
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {labels.map((label) => (
              <div
                key={label}
                className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-3"
              >
                {label}
              </div>
            ))}

            {grid.flat().map((day) => {
              const [y, m] = day.split('-').map(Number)
              const inMonth = y === cursor.year && m === cursor.month + 1
              const stat = statForDate(data, day)
              const isToday = day === today
              const isFuture = day > today
              const dayNumber = Number(day.slice(8, 10))

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelected(day)}
                  aria-label={`${formatMedium(day)}, ${stat.completed} of ${stat.scheduled} done`}
                  className={cn(
                    'group relative flex aspect-square flex-col items-center justify-center rounded-xl border transition-all duration-150',
                    'hover:-translate-y-0.5 hover:shadow-sm',
                    !inMonth && 'opacity-35',
                    isFuture && 'opacity-50',
                    selected === day
                      ? 'border-brand ring-2 ring-brand/30'
                      : isToday
                        ? 'border-brand'
                        : 'border-transparent',
                    !stat.hasTasks
                      ? 'border-dashed border-line bg-surface-2/60 text-ink-3'
                      : stat.perfect
                        ? 'bg-success-soft text-success'
                        : stat.ratio > 0
                          ? 'bg-brand-soft text-brand'
                          : 'bg-surface-2 text-ink-2',
                  )}
                >
                  <span
                    className={cn(
                      'text-[13px] font-semibold tabular-nums sm:text-[14px]',
                      stat.hasTasks && !stat.perfect && 'text-ink',
                    )}
                  >
                    {dayNumber}
                  </span>
                  {stat.hasTasks ? (
                    <span className="mt-0.5 hidden text-[10px] font-medium tabular-nums opacity-80 sm:block">
                      {stat.completed}/{stat.scheduled}
                    </span>
                  ) : (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-ink-3/40" />
                  )}

                  {isToday ? (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-brand" />
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
            <MiniStat label="Days with tasks" value={daysWithData.length} />
            <MiniStat label="Perfect days" value={perfectDays} tone="success" />
            <MiniStat
              label="Completions"
              value={`${monthCompleted}/${monthScheduled}`}
            />
            <MiniStat label="Month rate" value={formatPercent(monthRatio)} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title={formatLongDay(selected)}
              description={relativeDayLabel(selected, today)}
              action={
                isFuture ? null : (
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => navigate(`/today?date=${selected}`)}
                  >
                    Full view
                  </Button>
                )
              }
            />

            <div className="mb-4 flex items-center gap-4">
              <ProgressRing
                value={selectedStat.ratio}
                label={formatPercent(selectedStat.ratio)}
                sublabel="complete"
                tone={selectedStat.perfect ? 'success' : 'brand'}
                size={84}
                strokeWidth={7}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-ink">
                  {selectedStat.completed} of {selectedStat.scheduled} done
                </p>
                {selectedStat.perfect ? (
                  <Badge tone="success" icon={<Flame size={11} />} className="mt-1.5">
                    Perfect day
                  </Badge>
                ) : null}
                <ProgressBar
                  value={selectedStat.ratio}
                  className="mt-3"
                  tone={selectedStat.perfect ? 'success' : 'brand'}
                />
              </div>
            </div>

            <TaskList
              tasks={selectedTasks}
              date={selected}
              allowToggle={!isFuture}
              onEdit={openEdit}
              onDelete={requestDelete}
              label={`Tasks on ${selected}`}
              empty={
                <EmptyState
                  icon={CalendarDays}
                  title={isFuture ? 'Nothing planned' : 'No tasks on this day'}
                  description={
                    isFuture
                      ? 'Future days fill up automatically as your repeating tasks match.'
                      : 'This day had no tasks on the schedule.'
                  }
                  action={
                    isFuture ? null : (
                      <Button size="sm" variant="secondary" onClick={openCreate}>
                        Add a task
                      </Button>
                    )
                  }
                  className="py-8"
                />
              }
            />
          </Card>

          <Card>
            <CardHeader title="Legend & tips" />
            <ul className="space-y-2 text-[12.5px] leading-relaxed text-ink-3">
              <li>· Future days are dimmed and cannot be ticked off.</li>
              <li>· Deleting a task keeps every record on days before today.</li>
              <li>· Use the arrows on the Today page to jump day by day.</li>
              <li>
                · Week starts on{' '}
                <span className="font-medium text-ink-2">
                  {firstWeekday === 1 ? 'Monday' : 'Sunday'}
                </span>
                . Change it in Settings.
              </li>
            </ul>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2.5 text-[12.5px] text-brand">
              <CalendarCheck size={15} className="shrink-0" />
              <span>
                {perfectDays} perfect {perfectDays === 1 ? 'day' : 'days'} this month.
              </span>
            </div>
            <p className="mt-3 text-[12px] text-ink-3">
              Next day:{' '}
              <button
                type="button"
                onClick={() => setSelected(addDays(selected, 1))}
                className="font-medium text-brand hover:underline"
              >
                {formatMedium(addDays(selected, 1))}
              </button>
            </p>
          </Card>
        </div>
      </div>

      {dialog}
      {confirm}
    </>
  )
}

function Legend({
  color,
  text,
  border = false,
  dashed = false,
}: {
  color: string
  text: string
  border?: boolean
  dashed?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
      <span
        className={cn(
          'h-3 w-3 rounded',
          color,
          border && 'border border-line',
          dashed && 'border-dashed',
        )}
      />
      {text}
    </span>
  )
}

function MiniStat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: React.ReactNode
  tone?: 'default' | 'success'
}) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-[17px] font-bold tracking-tight',
          tone === 'success' ? 'text-success' : 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-56 rounded-xl bg-surface-2" />
      <div className="card h-[460px]" />
    </div>
  )
}
