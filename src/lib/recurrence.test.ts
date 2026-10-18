import { describe, expect, it } from 'vitest'

import { describeRecurrence, isTaskScheduledOn, taskDaysInWeek } from '@/lib/recurrence'
import type { Recurrence, Task } from '@/types'

function makeTask(partial: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Test task',
    notes: '',
    categoryId: null,
    recurrence: { type: 'daily', weekdays: [], intervalWeeks: 1, endDate: null },
    order: 0,
    startDate: '2026-01-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
    ...partial,
  }
}

function withRecurrence(recurrence: Partial<Recurrence>, startDate = '2026-01-01'): Task {
  return makeTask({
    startDate,
    recurrence: {
      type: 'daily',
      weekdays: [],
      intervalWeeks: 1,
      endDate: null,
      ...recurrence,
    },
  })
}

describe('once tasks', () => {
  const task = withRecurrence({ type: 'once' }, '2026-01-15')

  it('appears only on its start date', () => {
    expect(isTaskScheduledOn(task, '2026-01-15')).toBe(true)
    expect(isTaskScheduledOn(task, '2026-01-14')).toBe(false)
    expect(isTaskScheduledOn(task, '2026-01-16')).toBe(false)
  })
})

describe('daily tasks', () => {
  const task = withRecurrence({ type: 'daily' }, '2026-01-15')

  it('never appears before its start date', () => {
    expect(isTaskScheduledOn(task, '2026-01-14')).toBe(false)
    expect(isTaskScheduledOn(task, '2026-01-15')).toBe(true)
  })

  it('appears on every day after that', () => {
    expect(isTaskScheduledOn(task, '2026-01-16')).toBe(true)
    expect(isTaskScheduledOn(task, '2027-06-01')).toBe(true)
  })

  it('stops after an end date', () => {
    const ending = withRecurrence({ type: 'daily', endDate: '2026-01-20' }, '2026-01-15')
    expect(isTaskScheduledOn(ending, '2026-01-20')).toBe(true)
    expect(isTaskScheduledOn(ending, '2026-01-21')).toBe(false)
  })
})

describe('weekly tasks', () => {
  // 2026-01-05 is a Monday.
  const task = withRecurrence({ type: 'weekly', weekdays: [1, 3, 5] }, '2026-01-05')

  it('appears only on the selected weekdays', () => {
    expect(isTaskScheduledOn(task, '2026-01-05')).toBe(true) // Monday
    expect(isTaskScheduledOn(task, '2026-01-06')).toBe(false) // Tuesday
    expect(isTaskScheduledOn(task, '2026-01-07')).toBe(true) // Wednesday
    expect(isTaskScheduledOn(task, '2026-01-09')).toBe(true) // Friday
    expect(isTaskScheduledOn(task, '2026-01-10')).toBe(false) // Saturday
  })

  it('applies on later weeks too', () => {
    expect(isTaskScheduledOn(task, '2026-01-12')).toBe(true) // next Monday
    expect(isTaskScheduledOn(task, '2026-02-02')).toBe(true)
  })
})

describe('custom tasks (every N weeks)', () => {
  // 2026-01-05 is a Monday; week starting Monday.
  const everyTwoWeeks = withRecurrence(
    { type: 'custom', weekdays: [1], intervalWeeks: 2 },
    '2026-01-05',
  )

  it('fires on the anchor week', () => {
    expect(isTaskScheduledOn(everyTwoWeeks, '2026-01-05')).toBe(true)
  })

  it('skips the in-between week', () => {
    expect(isTaskScheduledOn(everyTwoWeeks, '2026-01-12')).toBe(false)
  })

  it('fires again two weeks later', () => {
    expect(isTaskScheduledOn(everyTwoWeeks, '2026-01-19')).toBe(true)
    expect(isTaskScheduledOn(everyTwoWeeks, '2026-02-02')).toBe(true)
  })

  it('treats interval 1 as weekly', () => {
    const weekly = withRecurrence(
      { type: 'custom', weekdays: [1], intervalWeeks: 1 },
      '2026-01-05',
    )
    expect(isTaskScheduledOn(weekly, '2026-01-12')).toBe(true)
    expect(isTaskScheduledOn(weekly, '2026-01-19')).toBe(true)
  })

  it('respects the week start setting for interval maths', () => {
    // Week starts Sunday. 2026-01-05 (Mon) belongs to the week of Jan 4.
    const sundayWeeks = withRecurrence(
      { type: 'custom', weekdays: [1], intervalWeeks: 2 },
      '2026-01-05',
    )
    // With weekStartsOn = 0 the anchor week starts 2026-01-04.
    expect(isTaskScheduledOn(sundayWeeks, '2026-01-05', 0)).toBe(true)
    expect(isTaskScheduledOn(sundayWeeks, '2026-01-12', 0)).toBe(false)
    expect(isTaskScheduledOn(sundayWeeks, '2026-01-19', 0)).toBe(true)
  })
})

describe('deleted tasks keep their history', () => {
  const deletedOn = '2026-01-20'
  const task = makeTask({
    startDate: '2026-01-01',
    archivedAt: deletedOn,
    recurrence: { type: 'daily', weekdays: [], intervalWeeks: 1, endDate: null },
  })

  it('still appears on days before the deletion date', () => {
    expect(isTaskScheduledOn(task, '2026-01-10')).toBe(true)
    expect(isTaskScheduledOn(task, '2026-01-19')).toBe(true)
  })

  it('stops appearing from the deletion date onward', () => {
    expect(isTaskScheduledOn(task, '2026-01-20')).toBe(false)
    expect(isTaskScheduledOn(task, '2026-01-21')).toBe(false)
  })

  it('can be restored by clearing archivedAt', () => {
    const restored = { ...task, archivedAt: null }
    expect(isTaskScheduledOn(restored, '2026-01-25')).toBe(true)
  })
})

describe('taskDaysInWeek', () => {
  it('lists the matching days inside a week', () => {
    const task = withRecurrence({ type: 'weekly', weekdays: [1, 3] }, '2026-01-05')
    // Week starting Monday 2026-01-05.
    expect(taskDaysInWeek(task, '2026-01-05', 1)).toEqual(['2026-01-05', '2026-01-07'])
  })
})

describe('describeRecurrence', () => {
  it('renders human-readable labels', () => {
    expect(describeRecurrence({ type: 'once', weekdays: [], intervalWeeks: 1, endDate: null })).toBe(
      'One time',
    )
    expect(
      describeRecurrence({ type: 'daily', weekdays: [], intervalWeeks: 1, endDate: null }),
    ).toBe('Every day')
    expect(
      describeRecurrence({ type: 'weekly', weekdays: [1, 3, 5], intervalWeeks: 1, endDate: null }),
    ).toBe('Mon, Wed, Fri')
    expect(
      describeRecurrence({
        type: 'custom',
        weekdays: [2],
        intervalWeeks: 2,
        endDate: null,
      }),
    ).toBe('Every 2 weeks on Tue')
  })
})
