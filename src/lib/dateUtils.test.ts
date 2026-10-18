import { describe, expect, it } from 'vitest'

import {
  addDays,
  dateRange,
  diffInDays,
  formatMedium,
  fromKey,
  monthGrid,
  startOfWeek,
  toKey,
  weekdayOf,
  weeksBetween,
} from '@/lib/dateUtils'

describe('date key conversion', () => {
  it('round-trips a key through a local Date', () => {
    expect(toKey(fromKey('2026-10-17'))).toBe('2026-10-17')
    expect(toKey(fromKey('2026-01-01'))).toBe('2026-01-01')
    expect(toKey(fromKey('2026-12-31'))).toBe('2026-12-31')
  })

  it('zero-pads single digit months and days', () => {
    expect(toKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(formatMedium('2026-01-05')).toBe('Jan 5, 2026')
  })

  it('reports the correct weekday', () => {
    // 2026-10-17 is a Saturday.
    expect(weekdayOf('2026-10-17')).toBe(6)
    // 2026-10-18 is a Sunday.
    expect(weekdayOf('2026-10-18')).toBe(0)
  })
})

describe('addDays', () => {
  it('handles month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('handles leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('stays correct across daylight-saving transitions', () => {
    // Northern-hemisphere DST switches: last Sunday of March and October.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')

    // Walking 30 days across both transitions must land exactly 30 later.
    expect(addDays('2026-03-01', 30)).toBe('2026-03-31')
    expect(addDays('2026-10-01', 30)).toBe('2026-10-31')
  })

  it('is the inverse of a negative shift', () => {
    for (const key of ['2026-01-01', '2026-06-15', '2026-12-31']) {
      expect(addDays(addDays(key, 12), -12)).toBe(key)
    }
  })
})

describe('diffInDays', () => {
  it('counts signed whole days', () => {
    expect(diffInDays('2026-01-01', '2026-01-01')).toBe(0)
    expect(diffInDays('2026-01-01', '2026-01-08')).toBe(7)
    expect(diffInDays('2026-01-08', '2026-01-01')).toBe(-7)
    expect(diffInDays('2025-12-31', '2026-01-01')).toBe(1)
  })

  it('ignores time-of-day by construction', () => {
    // Both keys are midnight-local, so DST cannot create a 23h/25h day here.
    expect(diffInDays('2026-03-28', '2026-03-30')).toBe(2)
  })
})

describe('startOfWeek / weeksBetween', () => {
  it('rolls back to a Monday when the week starts on Monday', () => {
    expect(startOfWeek('2026-10-17', 1)).toBe('2026-10-12')
  })

  it('rolls back to a Sunday when the week starts on Sunday', () => {
    expect(startOfWeek('2026-10-17', 0)).toBe('2026-10-11')
  })

  it('leaves a week-start date untouched', () => {
    expect(startOfWeek('2026-10-12', 1)).toBe('2026-10-12')
    expect(startOfWeek('2026-10-11', 0)).toBe('2026-10-11')
  })

  it('measures whole weeks between week starts', () => {
    expect(weeksBetween('2026-10-12', '2026-10-19')).toBe(1)
    expect(weeksBetween('2026-10-12', '2026-10-26')).toBe(2)
    expect(weeksBetween('2026-10-26', '2026-10-12')).toBe(-2)
  })
})

describe('monthGrid', () => {
  it('always returns 6 weeks of 7 days', () => {
    const grid = monthGrid(2026, 9, 1)
    expect(grid).toHaveLength(6)
    for (const week of grid) expect(week).toHaveLength(7)
  })

  it('starts on the configured weekday', () => {
    // October 2026 starts on a Thursday.
    const mondayFirst = monthGrid(2026, 9, 1)
    expect(mondayFirst[0]?.[0]).toBe('2026-09-28')

    const sundayFirst = monthGrid(2026, 9, 0)
    expect(sundayFirst[0]?.[0]).toBe('2026-09-27')
  })

  it('covers every day of the month', () => {
    const days = monthGrid(2026, 9, 1).flat()
    const inMonth = days.filter((day) => day.startsWith('2026-10'))
    expect(inMonth).toHaveLength(31)
    expect(inMonth[0]).toBe('2026-10-01')
    expect(inMonth[30]).toBe('2026-10-31')
  })
})

describe('dateRange', () => {
  it('is inclusive on both ends', () => {
    expect(dateRange('2026-01-01', '2026-01-03')).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ])
  })

  it('returns a single day when both ends match', () => {
    expect(dateRange('2026-01-01', '2026-01-01')).toEqual(['2026-01-01'])
  })
})
