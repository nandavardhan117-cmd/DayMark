import { useEffect, useMemo, useState } from 'react'

import { todayKey } from '@/lib/dateUtils'
import { describeRecurrence } from '@/lib/recurrence'
import { useStore, type TaskDraft } from '@/lib/store'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { Recurrence, RecurrenceType, Task, Weekday } from '@/types'
import { WEEKDAY_LABELS_SHORT } from '@/types'

const TYPE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
]

type TaskDialogProps = {
  open: boolean
  /** Passing a task switches the dialog into edit mode. */
  task?: Task | null
  onClose: () => void
  /** Called after a successful create/edit. */
  onSaved?: (task: Task) => void
}

export function TaskDialog({ open, task, onClose, onSaved }: TaskDialogProps) {
  const { addTask, updateTask, data } = useStore()
  const categories = data?.categories ?? []

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [startDate, setStartDate] = useState(todayKey())
  const [type, setType] = useState<RecurrenceType>('daily')
  const [weekdays, setWeekdays] = useState<Weekday[]>([])
  const [intervalWeeks, setIntervalWeeks] = useState(1)
  const [useEndDate, setUseEndDate] = useState(false)
  const [endDate, setEndDate] = useState(todayKey())
  const [error, setError] = useState('')

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (!open) return
    setError('')

    if (task) {
      setTitle(task.title)
      setNotes(task.notes)
      setCategoryId(task.categoryId ?? '')
      setStartDate(task.startDate)
      setType(task.recurrence.type)
      setWeekdays(task.recurrence.weekdays)
      setIntervalWeeks(task.recurrence.intervalWeeks)
      setUseEndDate(Boolean(task.recurrence.endDate))
      setEndDate(task.recurrence.endDate ?? todayKey())
    } else {
      setTitle('')
      setNotes('')
      setCategoryId('')
      setStartDate(todayKey())
      setType('daily')
      setWeekdays([])
      setIntervalWeeks(1)
      setUseEndDate(false)
      setEndDate(todayKey())
    }
  }, [open, task])

  const needsWeekdays = type === 'weekly' || type === 'custom'

  const preview = useMemo<Recurrence>(() => {
    return {
      type,
      weekdays: needsWeekdays ? weekdays : [],
      intervalWeeks: type === 'custom' ? Math.max(1, intervalWeeks) : 1,
      endDate: useEndDate ? endDate : null,
    }
  }, [type, needsWeekdays, weekdays, intervalWeeks, useEndDate, endDate])

  function toggleWeekday(day: Weekday) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b),
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!title.trim()) {
      setError('Give the task a name.')
      return
    }
    if (needsWeekdays && weekdays.length === 0) {
      setError('Pick at least one weekday.')
      return
    }
    if (useEndDate && endDate < startDate) {
      setError('The end date must be on or after the start date.')
      return
    }

    const draft: TaskDraft = {
      title: title.trim(),
      notes: notes.trim(),
      categoryId: categoryId || null,
      recurrence: preview,
      startDate,
    }

    if (task) {
      updateTask(task.id, {
        title: draft.title,
        notes: draft.notes,
        categoryId: draft.categoryId,
        recurrence: draft.recurrence,
        startDate: draft.startDate,
      })
      onSaved?.(task)
    } else {
      const created = addTask(draft)
      onSaved?.(created)
    }

    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      description={
        task
          ? 'Changes apply going forward — past days keep their original records.'
          : 'Tasks appear automatically on every day their schedule matches.'
      }
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {task ? 'Save changes' : 'Create task'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Task name" error={error}>
          <Input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setError('')
            }}
            placeholder="e.g. Drink water"
            maxLength={120}
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Starts on" hint="The first day this task can appear.">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Repeats">
          <SegmentedControl
            value={type}
            options={TYPE_OPTIONS}
            onChange={(value) => {
              setType(value)
              setError('')
            }}
            ariaLabel="Repeat frequency"
          />
        </Field>

        {needsWeekdays ? (
          <Field
            label={type === 'custom' ? 'Repeat on' : 'On which days?'}
            hint={
              type === 'custom'
                ? 'These weekdays repeat every N weeks, measured from the start date.'
                : undefined
            }
          >
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS_SHORT.map((label, day) => {
                const active = weekdays.includes(day as Weekday)
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleWeekday(day as Weekday)}
                    aria-pressed={active}
                    className={
                      'h-9 min-w-11 rounded-lg border px-2 text-[12.5px] font-medium transition-all duration-150 ' +
                      (active
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2')
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </Field>
        ) : null}

        {type === 'custom' ? (
          <Field
            label="Every N weeks"
            hint="1 = every week, 2 = every other week, and so on."
         >
            <Input
              type="number"
              min={1}
              max={52}
              value={intervalWeeks}
              onChange={(event) => setIntervalWeeks(Math.max(1, Number(event.target.value) || 1))}
              className="max-w-32"
            />
          </Field>
        ) : null}

        <div className="rounded-xl border border-line bg-surface-2 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-ink">Stop repeating on a date</p>
              <p className="text-[12px] text-ink-3">Optional. Leave off to repeat forever.</p>
            </div>
            <input
              type="checkbox"
              checked={useEndDate}
              onChange={(event) => setUseEndDate(event.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[var(--dm-brand)]"
              aria-label="Set an end date"
            />
          </div>
          {useEndDate ? (
            <div className="mt-3">
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          ) : null}
        </div>

        <p className="rounded-xl bg-brand-soft px-3.5 py-2.5 text-[13px] text-brand">
          Will repeat: <span className="font-semibold">{describeRecurrence(preview)}</span>
        </p>

        {/* Hidden submit so Enter works inside the form. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
