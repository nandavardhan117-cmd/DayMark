import { ArrowDown, ArrowUp, GripVertical, Pencil, StickyNote, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { formatMedium } from '@/lib/dateUtils'
import { describeRecurrence } from '@/lib/recurrence'
import { Badge, CategoryDot } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import type { Category, DateKey, Task } from '@/types'

export type ReorderHandlers = {
  index: number
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  onDrop: () => void
  onMove: (direction: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
}

type TaskRowProps = {
  task: Task
  category: Category | null
  /** The date whose completion state this row shows. */
  date: DateKey
  done: boolean
  /** Show the "planned for <date>" caption (used in the All Tasks view). */
  showScheduledDate?: boolean
  /** Scheduled on `date`? False for archived/out-of-window tasks. */
  scheduled?: boolean
  /** Allow ticking — false for future dates and read-only history views. */
  allowToggle?: boolean
  onToggle?: () => void
  onEdit?: () => void
  onDelete?: () => void
  reorder?: ReorderHandlers
  /** Renders a subtle "recorded on" line instead of live controls. */
  compact?: boolean
}

export function TaskRow({
  task,
  category,
  date,
  done,
  showScheduledDate = false,
  scheduled = true,
  allowToggle = true,
  onToggle,
  onEdit,
  onDelete,
  reorder,
  compact = false,
}: TaskRowProps) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <li
      onDragOver={(event) => {
        if (!reorder) return
        event.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        if (!reorder) return
        event.preventDefault()
        setDragOver(false)
        reorder.onDrop()
      }}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border bg-surface px-3 py-3 transition-all duration-150',
        dragOver ? 'border-brand ring-1 ring-brand/30' : 'border-line hover:border-line-strong',
        !scheduled && 'opacity-60',
        done && 'bg-success-soft/40',
      )}
    >
      {reorder ? (
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            // Firefox requires data to be set for dragstart to fire.
            event.dataTransfer.setData('text/plain', task.id)
            reorder.onDragStart(reorder.index)
          }}
          aria-label="Drag to reorder"
          title="Drag to reorder"
          className="cursor-grab touch-none text-ink-3 opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={15} />
        </button>
      ) : null}

      <Checkbox
        checked={done}
        label={`Mark "${task.title}" as ${done ? 'not done' : 'done'} on ${formatMedium(date)}`}
        disabled={!allowToggle}
        onClick={onToggle}
        className={cn(!allowToggle && 'cursor-not-allowed opacity-50')}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              'truncate text-[14px] font-medium leading-snug',
              done ? 'text-ink-3 line-through decoration-ink-3/60' : 'text-ink',
            )}
          >
            {task.title}
          </p>
          {task.notes ? (
            <StickyNote
              size={13}
              className="shrink-0 text-ink-3"
              aria-label="Has notes"
            />
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
          {category ? <CategoryDot color={category.color} name={category.name} /> : null}
          <span className={cn(category ? 'hidden sm:inline' : 'hidden')}>·</span>
          <span className="truncate">{describeRecurrence(task.recurrence)}</span>
          {showScheduledDate ? (
            <>
              <span className="hidden sm:inline">·</span>
              <span className="truncate">Planned {formatMedium(date)}</span>
            </>
          ) : null}
        </div>
      </div>

      {!compact ? (
        <div className="flex shrink-0 items-center gap-1">
          {done ? <Badge tone="success">Done</Badge> : null}

          {reorder ? (
            <div className="hidden items-center gap-0.5 sm:flex">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Move up"
                title="Move up"
                disabled={!reorder.canMoveUp}
                onClick={() => reorder.onMove(-1)}
                className="h-7 w-7"
              >
                <ArrowUp size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Move down"
                title="Move down"
                disabled={!reorder.canMoveDown}
                onClick={() => reorder.onMove(1)}
                className="h-7 w-7"
              >
                <ArrowDown size={14} />
              </Button>
            </div>
          ) : null}

          {onEdit ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Edit ${task.title}`}
              title="Edit"
              onClick={onEdit}
              className="h-8 w-8"
            >
              <Pencil size={14} />
            </Button>
          ) : null}

          {onDelete ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Delete ${task.title}`}
              title="Delete (history is kept)"
              onClick={onDelete}
              className="h-8 w-8 hover:text-danger"
            >
              <Trash2 size={14} />
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
