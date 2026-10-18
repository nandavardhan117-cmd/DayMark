import { addDays, startOfWeek, weekdayOf, weeksBetween } from '@/lib/dateUtils'
import type { DateKey, Recurrence, Task, Weekday } from '@/types'
import { WEEKDAY_LABELS_LONG, WEEKDAY_LABELS_SHORT } from '@/types'

/**
 * The single source of truth for "does this task belong on this day?".
 *
 * Order of checks matters:
 *   1. archived (deleted)  -> never appears again after the delete date
 *   2. before start        -> not yet born
 *   3. after end           -> explicitly finished
 *   4. recurrence pattern
 *
 * Because we only stop tasks at `archivedAt`, past dates still resolve to
 * "scheduled" for deleted tasks — which is exactly what keeps history intact.
 */
export function isTaskScheduledOn(
  task: Task,
  date: DateKey,
  weekStartsOn: Weekday = 0,
): boolean {
  // Soft-deleted tasks vanish going forward but remain in the past.
  if (task.archivedAt && date >= task.archivedAt) return false
  if (date < task.startDate) return false
  if (task.recurrence.endDate && date > task.recurrence.endDate) return false

  switch (task.recurrence.type) {
    case 'once':
      // A one-off task lives on exactly one day: its start date.
      return date === task.startDate

    case 'daily':
      return true

    case 'weekly':
      return task.recurrence.weekdays.includes(weekdayOf(date))

    case 'custom': {
      if (!task.recurrence.weekdays.includes(weekdayOf(date))) return false
      const interval = Math.max(1, Math.floor(task.recurrence.intervalWeeks || 1))
      if (interval === 1) return true
      const anchor = startOfWeek(task.startDate, weekStartsOn)
      const target = startOfWeek(date, weekStartsOn)
      return weeksBetween(anchor, target) % interval === 0
    }

    default:
      return false
  }
}

/** All active (non-deleted) tasks that apply on a given date. */
export function tasksForDate(
  tasks: Task[],
  date: DateKey,
  weekStartsOn: Weekday = 0,
): Task[] {
  return tasks.filter((task) => isTaskScheduledOn(task, date, weekStartsOn))
}

/**
 * Human-readable description of a recurrence, e.g.
 * "Every day", "Mon, Wed, Fri", "Every 2 weeks on Tue".
 */
export function describeRecurrence(recurrence: Recurrence): string {
  const days = [...recurrence.weekdays].sort((a, b) => a - b)
  const dayNames = days.map((d) => WEEKDAY_LABELS_SHORT[d])

  switch (recurrence.type) {
    case 'once':
      return 'One time'

    case 'daily':
      return 'Every day'

    case 'weekly':
      if (days.length === 0) return 'Weekly'
      if (days.length === 7) return 'Every day'
      return dayNames.join(', ')

    case 'custom': {
      const interval = Math.max(1, Math.floor(recurrence.intervalWeeks || 1))
      const every = interval === 1 ? 'Every week' : `Every ${interval} weeks`
      if (days.length === 0) return every
      if (days.length === 7) return `${every}`
      return `${every} on ${dayNames.join(', ')}`
    }

    default:
      return 'Repeat'
  }
}

/** Short badge-friendly version, e.g. "Daily", "3×/week", "2-wk". */
export function recurrenceBadge(recurrence: Recurrence): string {
  switch (recurrence.type) {
    case 'once':
      return 'Once'
    case 'daily':
      return 'Daily'
    case 'weekly':
      return recurrence.weekdays.length > 1
        ? `${recurrence.weekdays.length}×/week`
        : 'Weekly'
    case 'custom':
      return recurrence.intervalWeeks > 1
        ? `${recurrence.intervalWeeks}-week`
        : 'Custom'
    default:
      return 'Repeat'
  }
}

/** The days a task will appear on during a given week. */
export function taskDaysInWeek(
  task: Task,
  weekStart: DateKey,
  weekStartsOn: Weekday = 0,
): DateKey[] {
  const out: DateKey[] = []
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i)
    if (isTaskScheduledOn(task, day, weekStartsOn)) out.push(day)
  }
  return out
}

/** Default empty recurrence used by the task form. */
export function defaultRecurrence(): Recurrence {
  return {
    type: 'daily',
    weekdays: [],
    intervalWeeks: 1,
    endDate: null,
  }
}

/** Ordered weekdays with Sunday first — handy for form controls. */
export const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

export function weekdayLongName(day: Weekday): string {
  return WEEKDAY_LABELS_LONG[day]
}
