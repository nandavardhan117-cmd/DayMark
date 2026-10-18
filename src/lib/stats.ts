import { addDays, minDate, todayKey } from '@/lib/dateUtils'
import { tasksForDate } from '@/lib/recurrence'
import type { AppData, Challenge, DateKey, DaySchedule } from '@/types'

/** Everything the UI needs to render one calendar day. */
export type DailyStat = {
  date: DateKey
  scheduled: number
  completed: number
  /** completed / scheduled, or 0 when nothing was scheduled. */
  ratio: number
  hasTasks: boolean
  /** Scheduled > 0 and every scheduled task was completed. */
  perfect: boolean
}

/**
 * Work out what was scheduled and what was completed on a given date.
 *
 * NOTE: we only count completions whose task is still scheduled on that date.
 * A completion left over from a task definition that no longer applies to that
 * day is ignored so numbers stay honest.
 */
export function buildDaySchedule(data: AppData, date: DateKey): DaySchedule {
  const weekStartsOn = data.settings.weekStartsOn
  const scheduled = tasksForDate(data.tasks, date, weekStartsOn)
  const log = data.days[date]
  const completedSet = new Set(Object.keys(log?.completions ?? {}))
  const completed = scheduled.filter((task) => completedSet.has(task.id))
  const ratio = scheduled.length === 0 ? 0 : completed.length / scheduled.length
  return { date, scheduled, completed, ratio }
}

export function statForDate(data: AppData, date: DateKey): DailyStat {
  const { scheduled, completed, ratio } = buildDaySchedule(data, date)
  return {
    date,
    scheduled: scheduled.length,
    completed: completed.length,
    ratio,
    hasTasks: scheduled.length > 0,
    perfect: scheduled.length > 0 && completed.length === scheduled.length,
  }
}

/** The earliest date that could possibly contain data. */
export function earliestKnownDate(data: AppData): DateKey | null {
  let min: DateKey | null = null
  for (const task of data.tasks) {
    min = min === null ? task.startDate : minDate(min, task.startDate)
  }
  for (const key of Object.keys(data.days)) {
    min = min === null ? key : minDate(min, key)
  }
  return min
}

/** A dense series of daily stats, useful for charts and calendars. */
export function series(data: AppData, from: DateKey, to: DateKey): DailyStat[] {
  const out: DailyStat[] = []
  let cursor = from
  // Hard cap so a bogus date range can never lock up the UI.
  for (let i = 0; i < 3700 && cursor <= to; i++) {
    out.push(statForDate(data, cursor))
    cursor = addDays(cursor, 1)
  }
  return out
}

export type StreakInfo = {
  current: number
  longest: number
  /** True when today is already a completed (perfect) day. */
  todayComplete: boolean
  /** True when today still has unfinished scheduled work. */
  todayPending: boolean
}

/**
 * Streak rule (stated openly in the UI):
 *   A day "counts" when every task scheduled that day was completed.
 *   Days with nothing scheduled are skipped — they neither add nor break.
 *   Today only counts once it is actually finished; until then the running
 *   streak is measured from yesterday and stays alive.
 */
export function streaks(data: AppData, today: DateKey = todayKey()): StreakInfo {
  const earliest = earliestKnownDate(data)

  const todayStat = statForDate(data, today)
  const todayComplete = todayStat.perfect
  const todayPending = todayStat.hasTasks && !todayStat.perfect

  if (!earliest) {
    return { current: 0, longest: 0, todayComplete, todayPending }
  }

  // --- current streak -------------------------------------------------
  let current = 0
  let cursor = todayComplete ? today : addDays(today, -1)
  let guard = 0
  while (guard++ < 4000 && cursor >= earliest) {
    const stat = statForDate(data, cursor)
    if (!stat.hasTasks) {
      cursor = addDays(cursor, -1)
      continue
    }
    if (!stat.perfect) break
    current += 1
    cursor = addDays(cursor, -1)
  }

  // --- longest streak -------------------------------------------------
  let longest = 0
  let run = 0
  cursor = earliest
  guard = 0
  while (guard++ < 4000 && cursor <= today) {
    const stat = statForDate(data, cursor)
    if (stat.perfect) {
      run += 1
      longest = Math.max(longest, run)
    } else if (stat.hasTasks) {
      run = 0
    }
    cursor = addDays(cursor, 1)
  }

  return { current, longest, todayComplete, todayPending }
}

/** Aggregate completion over the last `days` days (inclusive of today). */
export function rollingCompletion(
  data: AppData,
  days: number,
  today: DateKey = todayKey(),
): { scheduled: number; completed: number; ratio: number; daysWithData: number } {
  const from = addDays(today, -(days - 1))
  const stats = series(data, from, today)
  let scheduled = 0
  let completed = 0
  let daysWithData = 0
  for (const s of stats) {
    scheduled += s.scheduled
    completed += s.completed
    if (s.hasTasks) daysWithData += 1
  }
  return { scheduled, completed, ratio: scheduled === 0 ? 0 : completed / scheduled, daysWithData }
}

export type CategoryStat = {
  categoryId: string | null
  scheduled: number
  completed: number
  ratio: number
}

/** How each category performed on a given date. */
export function categoryBreakdown(data: AppData, date: DateKey): CategoryStat[] {
  const { scheduled, completed } = buildDaySchedule(data, date)
  const buckets = new Map<string | null, CategoryStat>()

  for (const task of scheduled) {
    const key = task.categoryId
    const bucket = buckets.get(key) ?? { categoryId: key, scheduled: 0, completed: 0, ratio: 0 }
    bucket.scheduled += 1
    buckets.set(key, bucket)
  }
  for (const task of completed) {
    const bucket = buckets.get(task.categoryId)
    if (bucket) bucket.completed += 1
  }
  for (const bucket of buckets.values()) {
    bucket.ratio = bucket.scheduled === 0 ? 0 : bucket.completed / bucket.scheduled
  }
  return [...buckets.values()].sort((a, b) => b.ratio - a.ratio || b.scheduled - a.scheduled)
}

export type ChallengeProgress = {
  challenge: Challenge
  totalDays: number
  perfectDays: number
  scheduled: number
  completed: number
  ratio: number
  /** 0–100, whole number, for progress bars. */
  percent: number
  active: boolean
  ended: boolean
}

/** Progress of a personal challenge over its own date window. */
export function challengeProgress(data: AppData, challenge: Challenge): ChallengeProgress {
  const today = todayKey()
  const from = challenge.startDate
  const to = challenge.endDate < today ? challenge.endDate : today

  const scoped: AppData = {
    ...data,
    tasks: data.tasks.filter((t) => challenge.taskIds.includes(t.id)),
  }

  let perfectDays = 0
  let scheduled = 0
  let completed = 0
  let cursor = from
  let guard = 0
  while (guard++ < 2000 && cursor <= to) {
    const stat = statForDate(scoped, cursor)
    scheduled += stat.scheduled
    completed += stat.completed
    if (stat.perfect) perfectDays += 1
    cursor = addDays(cursor, 1)
  }

  const totalDays = Math.max(1, challengeProgressDays(challenge, today))
  const ratio = scheduled === 0 ? 0 : completed / scheduled
  return {
    challenge,
    totalDays,
    perfectDays,
    scheduled,
    completed,
    ratio,
    percent: Math.round(ratio * 100),
    active: today >= challenge.startDate && today <= challenge.endDate,
    ended: today > challenge.endDate,
  }
}

function challengeProgressDays(challenge: Challenge, today: DateKey): number {
  const from = challenge.startDate
  const to = challenge.endDate < today ? challenge.endDate : today
  const a = new Date(from).getTime()
  const b = new Date(to).getTime()
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 1
  return Math.floor((b - a) / 86_400_000) + 1
}

/** Per-task completion rate over a date window. */
export function taskPerformance(
  data: AppData,
  from: DateKey,
  to: DateKey,
): { taskId: string; scheduled: number; completed: number; ratio: number }[] {
  const stats = series(data, from, to)
  const acc = new Map<string, { scheduled: number; completed: number }>()
  const weekStartsOn = data.settings.weekStartsOn

  for (const stat of stats) {
    const scheduledTasks = tasksForDate(data.tasks, stat.date, weekStartsOn)
    const log = data.days[stat.date]
    const done = new Set(Object.keys(log?.completions ?? {}))
    for (const task of scheduledTasks) {
      const entry = acc.get(task.id) ?? { scheduled: 0, completed: 0 }
      entry.scheduled += 1
      if (done.has(task.id)) entry.completed += 1
      acc.set(task.id, entry)
    }
  }

  return [...acc.entries()]
    .map(([taskId, v]) => ({
      taskId,
      scheduled: v.scheduled,
      completed: v.completed,
      ratio: v.scheduled === 0 ? 0 : v.completed / v.scheduled,
    }))
    .sort((a, b) => a.ratio - b.ratio || b.scheduled - a.scheduled)
}

/** 0–1 rounded fraction. */
export function percentOf(part: number, total: number): number {
  if (total === 0) return 0
  return part / total
}

export function formatPercent(ratio: number, decimals = 0): string {
  return `${(ratio * 100).toFixed(decimals)}%`
}
