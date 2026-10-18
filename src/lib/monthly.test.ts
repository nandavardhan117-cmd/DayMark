import { describe, expect, it } from 'vitest'

import {
  cellKey,
  currentMonthCursor,
  habitsForMonth,
  isCurrentMonth,
  monthDays,
  monthDayStats,
  monthOverall,
  shiftMonth,
} from '@/lib/monthly'
import type { AppData, Recurrence, Task } from '@/types'
import { DATA_VERSION } from '@/types'

const DAILY: Recurrence = {
  type: 'daily',
  weekdays: [],
  intervalWeeks: 1,
  endDate: null,
}

function makeTask(id: string, partial: Partial<Task> = {}): Task {
  return {
    id,
    title: `Habit ${id}`,
    notes: '',
    categoryId: null,
    recurrence: { ...DAILY },
    order: 0,
    startDate: '2020-01-01',
    createdAt: '2020-01-01T00:00:00.000Z',
    archivedAt: null,
    ...partial,
  }
}

function makeData(tasks: Task[], completions: Record<string, string[]> = {}): AppData {
  const days: AppData['days'] = {}
  for (const [date, ids] of Object.entries(completions)) {
    const map: Record<string, true> = {}
    for (const id of ids) map[id] = true
    days[date] = { date, completions: map, updatedAt: '2020-01-01T00:00:00.000Z' }
  }

  return {
    version: DATA_VERSION,
    tasks,
    categories: [],
    challenges: [],
    days,
    settings: { theme: 'light', weekStartsOn: 1, userName: '' },
  }
}

describe('monthDays handles every month length', () => {
  it('returns 28 days for a common February', () => {
    const days = monthDays(2026, 1)
    expect(days).toHaveLength(28)
    expect(days[0]).toBe('2026-02-01')
    expect(days[27]).toBe('2026-02-28')
  })

  it('returns 29 days for a leap-year February', () => {
    const days = monthDays(2028, 1)
    expect(days).toHaveLength(29)
    expect(days[28]).toBe('2028-02-29')

    // 2024 was a leap year too.
    expect(monthDays(2024, 1)).toHaveLength(29)
  })

  it('does NOT treat a century non-leap year as leap', () => {
    // 2100 is divisible by 100 but not 400, so February has 28 days.
    expect(monthDays(2100, 1)).toHaveLength(28)
    // 2000 was divisible by 400, so it WAS a leap year.
    expect(monthDays(2000, 1)).toHaveLength(29)
  })

  it('returns 30 days for short months', () => {
    expect(monthDays(2026, 3)).toHaveLength(30) // April
    expect(monthDays(2026, 5)).toHaveLength(30) // June
    expect(monthDays(2026, 8)).toHaveLength(30) // September
    expect(monthDays(2026, 10)).toHaveLength(30) // November
  })

  it('returns 31 days for long months', () => {
    for (const monthIndex of [0, 2, 4, 6, 7, 9, 11]) {
      expect(monthDays(2026, monthIndex)).toHaveLength(31)
    }
    expect(monthDays(2026, 9)[30]).toBe('2026-10-31')
  })

  it('produces consecutive, correctly ordered dates', () => {
    const days = monthDays(2026, 9)
    expect(days[0]).toBe('2026-10-01')
    expect(days[1]).toBe('2026-10-02')
    expect(days[15]).toBe('2026-10-16')
    expect(days[30]).toBe('2026-10-31')
    expect(new Set(days).size).toBe(31)
  })

  it('handles December rolling into the next year label correctly', () => {
    const days = monthDays(2026, 11)
    expect(days).toHaveLength(31)
    expect(days[0]).toBe('2026-12-01')
    expect(days[30]).toBe('2026-12-31')
  })
})

describe('shiftMonth', () => {
  it('rolls forward across a year boundary', () => {
    expect(shiftMonth({ year: 2026, monthIndex: 11 }, 1)).toEqual({
      year: 2027,
      monthIndex: 0,
    })
  })

  it('rolls backward across a year boundary', () => {
    expect(shiftMonth({ year: 2026, monthIndex: 0 }, -1)).toEqual({
      year: 2025,
      monthIndex: 11,
    })
  })

  it('stays inside the same year', () => {
    expect(shiftMonth({ year: 2026, monthIndex: 5 }, 2)).toEqual({
      year: 2026,
      monthIndex: 7,
    })
  })
})

describe('isCurrentMonth', () => {
  it('matches the given date', () => {
    const now = new Date(2026, 9, 17)
    expect(isCurrentMonth({ year: 2026, monthIndex: 9 }, now)).toBe(true)
    expect(isCurrentMonth({ year: 2026, monthIndex: 8 }, now)).toBe(false)
    expect(isCurrentMonth({ year: 2025, monthIndex: 9 }, now)).toBe(false)
  })

  it('defaults to today', () => {
    const now = new Date()
    expect(isCurrentMonth(currentMonthCursor(), now)).toBe(true)
  })
})

describe('habitsForMonth', () => {
  it('marks daily habits as scheduled on every day', () => {
    const data = makeData([makeTask('a')])
    const rows = habitsForMonth(data, 2026, 9)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.cells).toHaveLength(31)
    expect(rows[0]?.scheduled).toBe(31)
    expect(rows[0]?.completed).toBe(0)
    expect(rows[0]?.ratio).toBe(0)
  })

  it('leaves gaps for habits that do not repeat daily', () => {
    // Mondays in October 2026: 5, 12, 19, 26.
    const mondays = makeTask('m', {
      recurrence: { ...DAILY, type: 'weekly', weekdays: [1] },
    })
    const rows = habitsForMonth(makeData([mondays]), 2026, 9)

    expect(rows[0]?.scheduled).toBe(4)
    const scheduledDates = rows[0]?.cells.filter((c) => c.scheduled).map((c) => c.date)
    expect(scheduledDates).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'])
  })

  it('counts completions against the right dates', () => {
    const data = makeData([makeTask('a')], {
      '2026-10-01': ['a'],
      '2026-10-02': ['a'],
      // A completion on a different month must not leak in.
      '2026-09-30': ['a'],
    })
    const rows = habitsForMonth(data, 2026, 9)

    expect(rows[0]?.completed).toBe(2)
    expect(rows[0]?.ratio).toBeCloseTo(2 / 31)
  })

  it('excludes deleted habits but keeps their past records elsewhere', () => {
    const deleted = makeTask('gone', { archivedAt: '2026-10-15' })
    const live = makeTask('live')
    const rows = habitsForMonth(makeData([deleted, live]), 2026, 9)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.task.id).toBe('live')
  })

  it('keeps the user task order', () => {
    const data = makeData([
      makeTask('b', { order: 1 }),
      makeTask('a', { order: 0 }),
    ])
    const rows = habitsForMonth(data, 2026, 9)
    expect(rows.map((r) => r.task.id)).toEqual(['a', 'b'])
  })

  it('never marks an unscheduled cell as completed', () => {
    // A completion recorded on a day the habit does not repeat is ignored.
    const mondays = makeTask('m', {
      recurrence: { ...DAILY, type: 'weekly', weekdays: [1] },
    })
    const data = makeData([mondays], { '2026-10-06': ['m'] }) // 2026-10-06 is a Tuesday
    const rows = habitsForMonth(data, 2026, 9)

    expect(rows[0]?.completed).toBe(0)
  })
})

describe('monthDayStats', () => {
  it('produces one stat per day of the month', () => {
    const stats = monthDayStats(makeData([makeTask('a')]), 2026, 9)
    expect(stats).toHaveLength(31)
    expect(stats[0]?.day).toBe(1)
    expect(stats[30]?.day).toBe(31)
  })

  it('flags weekend columns', () => {
    // 2026-10-03 is a Saturday, 2026-10-04 a Sunday, 2026-10-05 a Monday.
    const stats = monthDayStats(makeData([]), 2026, 9)
    expect(stats.find((s) => s.day === 3)?.isWeekend).toBe(true)
    expect(stats.find((s) => s.day === 4)?.isWeekend).toBe(true)
    expect(stats.find((s) => s.day === 5)?.isWeekend).toBe(false)
  })

  it('aggregates all habits for each day', () => {
    const data = makeData([makeTask('a'), makeTask('b')], { '2026-10-10': ['a'] })
    const stat = monthDayStats(data, 2026, 9).find((s) => s.day === 10)

    expect(stat?.scheduled).toBe(2)
    expect(stat?.completed).toBe(1)
    expect(stat?.ratio).toBe(0.5)
  })
})

describe('monthOverall', () => {
  it('rolls up the whole month', () => {
    const data = makeData([makeTask('a')], {
      '2026-10-01': ['a'],
      '2026-10-02': ['a'],
    })
    const overall = monthOverall(data, 2026, 9)

    expect(overall.dayCount).toBe(31)
    expect(overall.habitCount).toBe(1)
    expect(overall.scheduled).toBe(31)
    expect(overall.completed).toBe(2)
    expect(overall.perfectDays).toBe(2)
    expect(overall.activeDays).toBe(31)
  })

  it('returns 0 rather than NaN when there are no habits', () => {
    const overall = monthOverall(makeData([]), 2026, 9)
    expect(overall.ratio).toBe(0)
    expect(overall.perfectDays).toBe(0)
    expect(overall.habitCount).toBe(0)
  })

  it('only counts days that had something scheduled as perfect', () => {
    const mondays = makeTask('m', {
      recurrence: { ...DAILY, type: 'weekly', weekdays: [1] },
    })
    const data = makeData([mondays], { '2026-10-05': ['m'] })
    const overall = monthOverall(data, 2026, 9)

    expect(overall.activeDays).toBe(4)
    expect(overall.perfectDays).toBe(1)
    expect(overall.scheduled).toBe(4)
  })
})

describe('history survives month changes', () => {
  it('keeps a past month intact after viewing another month', () => {
    const data = makeData([makeTask('a')], {
      '2026-09-10': ['a'],
      '2026-09-11': ['a'],
    })

    // Reading October must not alter September's stored records.
    habitsForMonth(data, 2026, 9)
    const september = monthOverall(data, 2026, 8)

    expect(september.completed).toBe(2)
    expect(Object.keys(data.days)).toHaveLength(2)
  })
})

describe('cellKey', () => {
  it('builds a stable unique key', () => {
    expect(cellKey('a', '2026-10-01')).toBe('a::2026-10-01')
    expect(cellKey('a', '2026-10-01')).not.toBe(cellKey('b', '2026-10-01'))
  })
})
