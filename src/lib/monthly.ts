import { daysInMonth, toKey, weekdayOf } from '@/lib/dateUtils'
import { isTaskScheduledOn } from '@/lib/recurrence'
import type { AppData, DateKey, Task } from '@/types'

/**
 * Monthly tracker helpers.
 *
 * The monthly grid is a *view* over the same data the rest of DayMark uses:
 * habits are ordinary tasks, and every tick writes to the existing per-date
 * completion record. That means history, streaks and statistics all stay in
 * sync automatically, and switching months never rewrites anything.
 */

/** Every date in a month, in order. Handles 28, 29, 30 and 31 day months. */
export function monthDays(year: number, monthIndex: number): DateKey[] {
  const total = daysInMonth(year, monthIndex)
  const out: DateKey[] = []
  for (let day = 1; day <= total; day++) {
    out.push(toKey(new Date(year, monthIndex, day)))
  }
  return out
}

export type HabitCell = {
  date: DateKey
  /** Does this habit repeat on this day? False cells are not clickable. */
  scheduled: boolean
  completed: boolean
}

export type HabitRow = {
  task: Task
  cells: HabitCell[]
  scheduled: number
  completed: number
  /** completed / scheduled, 0 when the habit never runs this month. */
  ratio: number
}

export type MonthDayStat = {
  date: DateKey
  day: number
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
  isWeekend: boolean
  scheduled: number
  completed: number
  ratio: number
}

export type MonthOverall = {
  scheduled: number
  completed: number
  ratio: number
  /** Days where every scheduled habit was ticked. */
  perfectDays: number
  /** Days that had at least one habit scheduled. */
  activeDays: number
  habitCount: number
  /** Days shown in the grid — 28, 29, 30 or 31. */
  dayCount: number
}

/** Active habits (non-deleted tasks), in the user's chosen order. */
export function habitsForMonth(data: AppData, year: number, monthIndex: number): HabitRow[] {
  const days = monthDays(year, monthIndex)
  const weekStartsOn = data.settings.weekStartsOn

  const active = data.tasks
    .filter((task) => !task.archivedAt)
    .sort((a, b) => a.order - b.order)

  return active.map((task) => {
    let scheduled = 0
    let completed = 0

    const cells = days.map((date) => {
      const isScheduled = isTaskScheduledOn(task, date, weekStartsOn)
      const isCompleted = isScheduled && Boolean(data.days[date]?.completions[task.id])
      if (isScheduled) scheduled += 1
      if (isCompleted) completed += 1
      return { date, scheduled: isScheduled, completed: isCompleted }
    })

    return {
      task,
      cells,
      scheduled,
      completed,
      ratio: scheduled === 0 ? 0 : completed / scheduled,
    }
  })
}

/** Per-day totals across every habit — used for the footer row. */
export function monthDayStats(data: AppData, year: number, monthIndex: number): MonthDayStat[] {
  const days = monthDays(year, monthIndex)
  const weekStartsOn = data.settings.weekStartsOn
  const active = data.tasks.filter((task) => !task.archivedAt)

  return days.map((date) => {
    let scheduled = 0
    let completed = 0

    for (const task of active) {
      if (!isTaskScheduledOn(task, date, weekStartsOn)) continue
      scheduled += 1
      if (data.days[date]?.completions[task.id]) completed += 1
    }

    const weekday = weekdayOf(date)
    return {
      date,
      day: Number(date.slice(8, 10)),
      weekday,
      isWeekend: weekday === 0 || weekday === 6,
      scheduled,
      completed,
      ratio: scheduled === 0 ? 0 : completed / scheduled,
    }
  })
}

/** Whole-month rollup. Only counts days that actually had habits scheduled. */
export function monthOverall(data: AppData, year: number, monthIndex: number): MonthOverall {
  const dayStats = monthDayStats(data, year, monthIndex)
  const rows = habitsForMonth(data, year, monthIndex)

  let scheduled = 0
  let completed = 0
  let perfectDays = 0
  let activeDays = 0

  for (const stat of dayStats) {
    scheduled += stat.scheduled
    completed += stat.completed
    if (stat.scheduled > 0) activeDays += 1
    if (stat.scheduled > 0 && stat.completed === stat.scheduled) perfectDays += 1
  }

  return {
    scheduled,
    completed,
    ratio: scheduled === 0 ? 0 : completed / scheduled,
    perfectDays,
    activeDays,
    habitCount: rows.length,
    dayCount: dayStats.length,
  }
}

/** Shift a {year, monthIndex} cursor by a number of months, rolling over years. */
export function shiftMonth(
  cursor: { year: number; monthIndex: number },
  delta: number,
): { year: number; monthIndex: number } {
  const next = new Date(cursor.year, cursor.monthIndex + delta, 1)
  return { year: next.getFullYear(), monthIndex: next.getMonth() }
}

export function currentMonthCursor(): { year: number; monthIndex: number } {
  const now = new Date()
  return { year: now.getFullYear(), monthIndex: now.getMonth() }
}

export function isCurrentMonth(
  cursor: { year: number; monthIndex: number },
  now: Date = new Date(),
): boolean {
  return cursor.year === now.getFullYear() && cursor.monthIndex === now.getMonth()
}

/** Stable key for a (habit, date) cell, useful for React lists and tests. */
export function cellKey(taskId: string, date: DateKey): string {
  return `${taskId}::${date}`
}
