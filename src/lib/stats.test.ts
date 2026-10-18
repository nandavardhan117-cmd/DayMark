import { describe, expect, it } from 'vitest'

import {
  rollingCompletion,
  series,
  statForDate,
  streaks,
  taskPerformance,
} from '@/lib/stats'
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
    title: `Task ${id}`,
    notes: '',
    categoryId: null,
    recurrence: { ...DAILY },
    order: 0,
    startDate: '2026-03-01',
    createdAt: '2026-03-01T00:00:00.000Z',
    archivedAt: null,
    ...partial,
  }
}

/** `completions` maps a date to the list of task ids finished that day. */
function makeData(tasks: Task[], completions: Record<string, string[]> = {}): AppData {
  const days: AppData['days'] = {}
  for (const [date, ids] of Object.entries(completions)) {
    const map: Record<string, true> = {}
    for (const id of ids) map[id] = true
    days[date] = { date, completions: map, updatedAt: '2026-03-01T00:00:00.000Z' }
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

describe('statForDate', () => {
  it('reports scheduled, completed and ratio', () => {
    const data = makeData([makeTask('a'), makeTask('b')], {
      '2026-03-11': ['a'],
    })
    const stat = statForDate(data, '2026-03-11')

    expect(stat.scheduled).toBe(2)
    expect(stat.completed).toBe(1)
    expect(stat.ratio).toBe(0.5)
    expect(stat.perfect).toBe(false)
    expect(stat.hasTasks).toBe(true)
  })

  it('marks a day perfect only when everything is done', () => {
    const data = makeData([makeTask('a'), makeTask('b')], {
      '2026-03-11': ['a', 'b'],
    })
    const stat = statForDate(data, '2026-03-11')

    expect(stat.completed).toBe(2)
    expect(stat.ratio).toBe(1)
    expect(stat.perfect).toBe(true)
  })

  it('treats a day with nothing scheduled as empty', () => {
    // A task that only runs on Mondays cannot make 2026-03-11 (Wednesday) count.
    const mondaysOnly = makeTask('a', {
      startDate: '2026-03-02',
      recurrence: { ...DAILY, type: 'weekly', weekdays: [1] },
    })
    const stat = statForDate(makeData([mondaysOnly]), '2026-03-11')

    expect(stat.hasTasks).toBe(false)
    expect(stat.ratio).toBe(0)
    expect(stat.perfect).toBe(false)
  })

  it('ignores completions left by tasks that no longer apply to that day', () => {
    // A once-task scheduled for 2026-03-05 should not count on 2026-03-11.
    const once = makeTask('once', {
      startDate: '2026-03-05',
      recurrence: { ...DAILY, type: 'once' },
    })
    const data = makeData([once], { '2026-03-11': ['once'] })

    const stat = statForDate(data, '2026-03-11')
    expect(stat.scheduled).toBe(0)
    expect(stat.completed).toBe(0)
  })
})

describe('current streak', () => {
  it('counts consecutive perfect days ending today', () => {
    const data = makeData([makeTask('a')], {
      '2026-03-09': ['a'],
      '2026-03-10': ['a'],
      '2026-03-11': ['a'],
    })

    expect(streaks(data, '2026-03-11').current).toBe(3)
  })

  it('stays alive while today is still in progress', () => {
    const data = makeData([makeTask('a')], {
      '2026-03-09': ['a'],
      '2026-03-10': ['a'],
      '2026-03-11': ['a'],
    })

    // 2026-03-12 is Thursday and nothing is ticked yet.
    expect(streaks(data, '2026-03-12').current).toBe(3)
    expect(streaks(data, '2026-03-12').todayPending).toBe(true)
    expect(streaks(data, '2026-03-12').todayComplete).toBe(false)
  })

  it('breaks when a scheduled day is missed', () => {
    const data = makeData([makeTask('a')], {
      '2026-03-09': ['a'],
      // 2026-03-10 intentionally missed
      '2026-03-11': ['a'],
    })

    expect(streaks(data, '2026-03-11').current).toBe(1)
  })

  it('skips days with nothing scheduled', () => {
    // Mondays only: 2026-03-02 and 2026-03-09 are Mondays.
    const mondays = makeTask('a', {
      startDate: '2026-03-02',
      recurrence: { ...DAILY, type: 'weekly', weekdays: [1] },
    })
    const data = makeData([mondays], {
      '2026-03-02': ['a'],
      '2026-03-09': ['a'],
    })

    // Today is Wednesday 2026-03-11: Mon+Mon both perfect.
    expect(streaks(data, '2026-03-11').current).toBe(2)
  })

  it('does not count a partially finished day', () => {
    const data = makeData([makeTask('a'), makeTask('b')], {
      '2026-03-10': ['a'],
      '2026-03-11': ['a'],
    })

    const info = streaks(data, '2026-03-11')
    expect(info.current).toBe(0)
    expect(info.longest).toBe(0)
  })

  it('returns zeros when there is no data at all', () => {
    const info = streaks(makeData([]), '2026-03-11')
    expect(info.current).toBe(0)
    expect(info.longest).toBe(0)
  })
})

describe('longest streak', () => {
  it('picks the best run even after a later gap', () => {
    const data = makeData([makeTask('a')], {
      '2026-03-01': ['a'],
      '2026-03-02': ['a'],
      '2026-03-03': ['a'],
      // 2026-03-04 missed
      '2026-03-05': ['a'],
      '2026-03-06': ['a'],
    })

    const info = streaks(data, '2026-03-06')
    expect(info.longest).toBe(3)
    expect(info.current).toBe(2)
  })

  it('equals the current streak when the whole history is unbroken', () => {
    const data = makeData([makeTask('a')], {
      '2026-03-09': ['a'],
      '2026-03-10': ['a'],
    })

    const info = streaks(data, '2026-03-10')
    expect(info.longest).toBe(2)
    expect(info.current).toBe(2)
  })
})

describe('history survives a task deletion', () => {
  it('keeps past completions counted after a soft delete', () => {
    const task = makeTask('a', { archivedAt: '2026-03-10' })
    const data = makeData([task], { '2026-03-09': ['a'] })

    // The day before deletion still shows a perfect day.
    expect(statForDate(data, '2026-03-09').perfect).toBe(true)

    // From the deletion date onward the task is gone.
    expect(statForDate(data, '2026-03-10').hasTasks).toBe(false)
    expect(statForDate(data, '2026-03-11').scheduled).toBe(0)

    // The streak still reaches back through the preserved day.
    expect(streaks(data, '2026-03-10').current).toBe(1)
  })

  it('restores scheduling when the delete is undone', () => {
    const task = makeTask('a', { archivedAt: '2026-03-10' })
    const data = makeData([task], { '2026-03-09': ['a'] })
    const restored: AppData = {
      ...data,
      tasks: data.tasks.map((t) => ({ ...t, archivedAt: null })),
    }

    expect(statForDate(restored, '2026-03-11').scheduled).toBe(1)
  })
})

describe('rollingCompletion', () => {
  it('aggregates over the requested window', () => {
    const data = makeData([makeTask('a')], {
      '2026-03-10': ['a'],
      '2026-03-11': ['a'],
    })

    const result = rollingCompletion(data, 2, '2026-03-11')
    expect(result.scheduled).toBe(2)
    expect(result.completed).toBe(2)
    expect(result.ratio).toBe(1)
    expect(result.daysWithData).toBe(2)
  })

  it('returns 0 rather than NaN for an empty window', () => {
    const result = rollingCompletion(makeData([]), 7, '2026-03-11')
    expect(result.ratio).toBe(0)
  })
})

describe('series', () => {
  it('produces one entry per day, inclusive', () => {
    const data = makeData([makeTask('a')], { '2026-03-11': ['a'] })
    const points = series(data, '2026-03-09', '2026-03-11')

    expect(points).toHaveLength(3)
    expect(points[0]?.date).toBe('2026-03-09')
    expect(points[2]?.date).toBe('2026-03-11')
    expect(points[2]?.ratio).toBe(1)
  })
})

describe('taskPerformance', () => {
  it('ranks the weakest task first', () => {
    const data = makeData(
      [makeTask('strong'), makeTask('weak')],
      {
        '2026-03-10': ['strong', 'weak'],
        '2026-03-11': ['strong'],
      },
    )

    const rows = taskPerformance(data, '2026-03-10', '2026-03-11')
    expect(rows[0]?.taskId).toBe('weak')
    expect(rows[0]?.ratio).toBe(0.5)
    expect(rows[1]?.taskId).toBe('strong')
    expect(rows[1]?.ratio).toBe(1)
  })
})
