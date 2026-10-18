import type { DateKey, Weekday } from '@/types'

const MS_PER_DAY = 86_400_000

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Convert a local Date into a "YYYY-MM-DD" calendar key. */
export function toKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Parse a "YYYY-MM-DD" key into a local Date at midnight. */
export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/**
 * Day number since the epoch. We do arithmetic in UTC space because local
 * time can be 23 or 25 hours long on daylight-saving switch days, which would
 * otherwise silently add or remove a day.
 */
function toDayNumber(key: DateKey): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, (m ?? 1) - 1, d ?? 1) / MS_PER_DAY)
}

function fromDayNumber(n: number): DateKey {
  const d = new Date(n * MS_PER_DAY)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Today's date in the user's local timezone. */
export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now)
}

export function addDays(key: DateKey, amount: number): DateKey {
  return fromDayNumber(toDayNumber(key) + amount)
}

/** Signed distance: positive when `b` is after `a`. */
export function diffInDays(a: DateKey, b: DateKey): number {
  return toDayNumber(b) - toDayNumber(a)
}

export function compareDates(a: DateKey, b: DateKey): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

export function isBefore(a: DateKey, b: DateKey): boolean {
  return a < b
}

export function isAfter(a: DateKey, b: DateKey): boolean {
  return a > b
}

export function minDate(a: DateKey, b: DateKey): DateKey {
  return a < b ? a : b
}

export function maxDate(a: DateKey, b: DateKey): DateKey {
  return a > b ? a : b
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(key: DateKey): Weekday {
  return fromKey(key).getDay() as Weekday
}

/** The date of the start of the week that contains `key`. */
export function startOfWeek(key: DateKey, weekStartsOn: Weekday = 0): DateKey {
  const offset = (weekdayOf(key) - weekStartsOn + 7) % 7
  return addDays(key, -offset)
}

export function addWeeks(key: DateKey, amount: number): DateKey {
  return addDays(key, amount * 7)
}

/** Whole weeks between two week-start dates (positive when `to` is later). */
export function weeksBetween(from: DateKey, to: DateKey): number {
  return Math.round(diffInDays(from, to) / 7)
}

/** Build a 6x7 grid of DateKeys covering the given month, padded to whole weeks. */
export function monthGrid(
  year: number,
  monthIndex: number,
  weekStartsOn: Weekday = 0,
): DateKey[][] {
  const first = toKey(new Date(year, monthIndex, 1))
  const gridStart = startOfWeek(first, weekStartsOn)
  const weeks: DateKey[][] = []
  let cursor = gridStart
  for (let w = 0; w < 6; w++) {
    const row: DateKey[] = []
    for (let d = 0; d < 7; d++) {
      row.push(cursor)
      cursor = addDays(cursor, 1)
    }
    weeks.push(row)
  }
  return weeks
}

/** Number of days in a month (monthIndex is 0-based). */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const MONTH_LABELS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "Oct 17, 2026" */
export function formatMedium(key: DateKey): string {
  const d = fromKey(key)
  return `${MONTH_LABELS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** "Friday, October 17" */
export function formatLongDay(key: DateKey): string {
  const d = fromKey(key)
  const weekday = WEEKDAYS[d.getDay()]
  return `${weekday}, ${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`
}

/** "October 17, 2026" */
export function formatFull(key: DateKey): string {
  const d = fromKey(key)
  return `${MONTH_LABELS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** "17 Oct" — compact form for tight UI. */
export function formatCompact(key: DateKey): string {
  const d = fromKey(key)
  return `${d.getDate()} ${MONTH_LABELS_SHORT[d.getMonth()]}`
}

export function relativeDayLabel(key: DateKey, today: DateKey = todayKey()): string {
  const delta = diffInDays(today, key)
  if (delta === 0) return 'Today'
  if (delta === -1) return 'Yesterday'
  if (delta === 1) return 'Tomorrow'
  if (delta < 0 && delta > -7) return `${Math.abs(delta)} days ago`
  if (delta > 0 && delta < 7) return `In ${delta} days`
  return formatMedium(key)
}

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

/** Inclusive list of every date from `from` to `to`. */
export function dateRange(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  const length = diffInDays(from, to)
  for (let i = 0; i <= length; i++) out.push(addDays(from, i))
  return out
}

/** Clamp a value into an inclusive range. */
export function clampDate(key: DateKey, min: DateKey, max: DateKey): DateKey {
  return minDate(maxDate(key, min), max)
}
