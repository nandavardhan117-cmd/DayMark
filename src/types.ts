/**
 * DayMark domain types.
 *
 * Design notes
 * ------------
 * - Dates are stored as local calendar-day strings: "YYYY-MM-DD".
 *   They are NOT timestamps. "2026-10-17" means "October 17 wherever the
 *   user is", which is what you want for a daily habit tracker.
 * - Tasks are definitions ("Drink water every day"). Completions are stored
 *   separately, per date. That is why editing or deleting a task never
 *   destroys past history.
 */

/** A local calendar day, e.g. "2026-10-17". */
export type DateKey = string

/** 0 = Sunday … 6 = Saturday (matches Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'custom'

export type Recurrence = {
  type: RecurrenceType
  /**
   * Which weekdays the task appears on.
   * Used by `weekly` and `custom`. Ignored by `once` and `daily`.
   */
  weekdays: Weekday[]
  /**
   * Used by `custom` only: appear on the selected weekdays, but only every
   * Nth week, measured from the task's start date.
   */
  intervalWeeks: number
  /** Optional last day the task appears on (inclusive). */
  endDate: DateKey | null
}

export type Task = {
  id: string
  title: string
  notes: string
  categoryId: string | null
  recurrence: Recurrence
  /** Lower numbers sort first in lists. */
  order: number
  /** First day the task can appear on. For `once` tasks this is THE day. */
  startDate: DateKey
  createdAt: string
  /**
   * Soft delete. When set the task disappears from live lists, but stays in
   * the store so past dates keep showing it. Never hard-delete a task if you
   * want its history to survive.
   */
  archivedAt: DateKey | null
}

export type Category = {
  id: string
  name: string
  /** Any CSS colour the UI can render (hex, rgb, var(...)). */
  color: string
  createdAt: string
}

export type Challenge = {
  id: string
  name: string
  description: string
  startDate: DateKey
  endDate: DateKey
  /** Which tasks count toward this challenge. */
  taskIds: string[]
  createdAt: string
}

/** One day's completion record. Keys are task ids. */
export type DayLog = {
  date: DateKey
  /** Set of completed task ids for this date. */
  completions: Record<string, true>
  updatedAt: string
}

export type ThemePreference = 'light' | 'dark' | 'system'

export type Settings = {
  theme: ThemePreference
  /** 0 = Sunday, 1 = Monday. Used by the calendar and week-based recurrence. */
  weekStartsOn: 0 | 1
  userName: string
}

export type AppData = {
  /** Bump when the shape changes, so migrations can run later. */
  version: number
  tasks: Task[]
  categories: Category[]
  challenges: Challenge[]
  /** Keyed by DateKey. */
  days: Record<DateKey, DayLog>
  settings: Settings
}

/** What "scheduled" means for a task on a given day. */
export type DaySchedule = {
  date: DateKey
  scheduled: Task[]
  completed: Task[]
  /** completed / scheduled, 0–1. `0` when nothing is scheduled. */
  ratio: number
}

export const DATA_VERSION = 1

export const WEEKDAY_LABELS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_LABELS_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
