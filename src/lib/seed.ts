import { todayKey } from '@/lib/dateUtils'
import { makeId } from '@/lib/id'
import type { AppData, Category, Task } from '@/types'
import { DATA_VERSION } from '@/types'
import { defaultSettings, emptyAppData } from './repository'

/**
 * A tiny starter set so a brand-new install is not a blank screen.
 * Every seeded item is ordinary user data — delete or edit it freely.
 */
export function buildSeedData(now: Date = new Date()): AppData {
  const today = todayKey(now)
  const createdAt = now.toISOString()

  const categories: Category[] = [
    { id: 'cat_health', name: 'Health', color: '#10b981', createdAt },
    { id: 'cat_mind', name: 'Mind', color: '#8b5cf6', createdAt },
    { id: 'cat_work', name: 'Work', color: '#3b82f6', createdAt },
    { id: 'cat_personal', name: 'Personal', color: '#f59e0b', createdAt },
  ]

  const makeTask = (
    index: number,
    title: string,
    categoryId: string,
    recurrence: Task['recurrence'],
  ): Task => ({
    id: makeId(),
    title,
    notes: '',
    categoryId,
    recurrence,
    order: index,
    startDate: today,
    createdAt,
    archivedAt: null,
  })

  const tasks: Task[] = [
    makeTask(0, 'Drink 8 glasses of water', 'cat_health', {
      type: 'daily',
      weekdays: [],
      intervalWeeks: 1,
      endDate: null,
    }),
    makeTask(1, 'Read for 20 minutes', 'cat_mind', {
      type: 'daily',
      weekdays: [],
      intervalWeeks: 1,
      endDate: null,
    }),
    makeTask(2, 'Move your body', 'cat_health', {
      type: 'weekly',
      weekdays: [1, 3, 5],
      intervalWeeks: 1,
      endDate: null,
    }),
    makeTask(3, 'Plan tomorrow before bed', 'cat_work', {
      type: 'daily',
      weekdays: [],
      intervalWeeks: 1,
      endDate: null,
    }),
    makeTask(4, 'Tidy one small area', 'cat_personal', {
      type: 'custom',
      weekdays: [0, 6],
      intervalWeeks: 1,
      endDate: null,
    }),
  ]

  return {
    ...emptyAppData(),
    version: DATA_VERSION,
    categories,
    tasks,
    days: {},
    settings: { ...defaultSettings() },
  }
}
