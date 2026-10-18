import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { todayKey } from '@/lib/dateUtils'
import { useStore } from '@/lib/store'
import type { DateKey, Task } from '@/types'
import { TaskRow, type ReorderHandlers } from './TaskRow'

type TaskListProps = {
  tasks: Task[]
  /** Which date's completion state to display and edit. */
  date: DateKey
  /** Allow ticking the checkbox. Defaults to true for today and past dates. */
  allowToggle?: boolean
  /** Enable drag + arrow reordering. */
  reorderable?: boolean
  /** Show the "Planned <date>" caption on each row. */
  showScheduledDate?: boolean
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
  empty?: ReactNode
  className?: string
  /** Accessible name for the list. */
  label?: string
}

/**
 * Renders a set of tasks for one date.
 *
 * Completion state, categories and reordering all come from the store, so this
 * component stays purely presentational apart from the local drag index.
 */
export function TaskList({
  tasks,
  date,
  allowToggle,
  reorderable = false,
  showScheduledDate = false,
  onEdit,
  onDelete,
  empty,
  className,
  label,
}: TaskListProps) {
  const { data, toggleCompletion, reorderTasks, moveTask } = useStore()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  if (tasks.length === 0) return <>{empty}</>

  const categoriesById = new Map((data?.categories ?? []).map((c) => [c.id, c]))
  const completions = data?.days[date]?.completions ?? {}
  const today = todayKey()
  const canToggle = allowToggle ?? date <= today
  const ordered = [...tasks].sort((a, b) => a.order - b.order)

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const ids = ordered.map((task) => task.id)
    const [moved] = ids.splice(dragIndex, 1)
    if (moved) ids.splice(targetIndex, 0, moved)
    reorderTasks(ids)
    setDragIndex(null)
  }

  return (
    <ul ref={listRef} aria-label={label} className={cn('space-y-2', className)}>
      {ordered.map((task, index) => {
        const reorder: ReorderHandlers | undefined = reorderable
          ? {
              index,
              onDragStart: setDragIndex,
              onDragEnter: () => {},
              onDrop: () => handleDrop(index),
              onMove: (direction) => moveTask(task.id, direction),
              canMoveUp: index > 0,
              canMoveDown: index < ordered.length - 1,
            }
          : undefined

        return (
          <TaskRow
            key={task.id}
            task={task}
            category={task.categoryId ? (categoriesById.get(task.categoryId) ?? null) : null}
            date={date}
            done={Boolean(completions[task.id])}
            allowToggle={canToggle}
            showScheduledDate={showScheduledDate}
            reorder={reorder}
            onToggle={() => toggleCompletion(date, task.id)}
            onEdit={onEdit ? () => onEdit(task) : undefined}
            onDelete={onDelete ? () => onDelete(task) : undefined}
          />
        )
      })}
    </ul>
  )
}
