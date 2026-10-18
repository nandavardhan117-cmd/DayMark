import { Archive, ArchiveRestore, ListTodo, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { TaskList } from '@/components/tasks/TaskList'
import { useTaskDialogs } from '@/components/tasks/useTaskDialogs'
import { Badge, CategoryDot } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Form'
import { formatMedium, todayKey } from '@/lib/dateUtils'
import { describeRecurrence } from '@/lib/recurrence'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/cn'
import type { Task } from '@/types'

type StatusFilter = 'active' | 'archived' | 'all'

export function TasksPage() {
  const { data, ready, restoreTask } = useStore()
  const { openCreate, openEdit, requestDelete, dialog, confirm } = useTaskDialogs()

  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('active')

  const today = todayKey()

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()

    return data.tasks
      .filter((task) => {
        if (status === 'active' && task.archivedAt) return false
        if (status === 'archived' && !task.archivedAt) return false
        if (categoryId !== 'all' && task.categoryId !== categoryId) return false
        if (needle) {
          const haystack = `${task.title} ${task.notes}`.toLowerCase()
          if (!haystack.includes(needle)) return false
        }
        return true
      })
      .sort((a, b) => a.order - b.order)
  }, [data, query, categoryId, status])

  if (!ready || !data) return <TasksSkeleton />

  const categoriesById = new Map(data.categories.map((c) => [c.id, c]))
  const activeCount = data.tasks.filter((t) => !t.archivedAt).length
  const archivedCount = data.tasks.filter((t) => t.archivedAt).length

  // Archived tasks are shown read-only so their history stays visible.
  const showArchived = status !== 'active'

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="All tasks"
        description="Every task definition you have created. Reorder with the grip handle or the arrows."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>
            New task
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or notes…"
              className="pl-9"
              aria-label="Search tasks"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="sm:w-48"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-0.5">
            {(
              [
                { value: 'active', label: `Active (${activeCount})` },
                { value: 'archived', label: `Deleted (${archivedCount})` },
                { value: 'all', label: 'All' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={cn(
                  'rounded-[10px] px-3 py-1.5 text-[12.5px] font-medium transition-all',
                  status === option.value
                    ? 'bg-surface text-ink shadow-sm ring-1 ring-line'
                    : 'text-ink-3 hover:text-ink-2',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {data.categories.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="text-[12px] text-ink-3">Quick filters:</span>
            <button
              type="button"
              onClick={() => setCategoryId('all')}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                categoryId === 'all'
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line text-ink-2 hover:border-line-strong',
              )}
            >
              All
            </button>
            {data.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                  categoryId === category.id
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-line text-ink-2 hover:border-line-strong',
                )}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </button>
            ))}
          </div>
        ) : null}
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={query ? 'No matching tasks' : 'No tasks here'}
          description={
            query
              ? 'Try a different search term or clear the filters.'
              : status === 'archived'
                ? 'Deleted tasks will appear here, with their past records intact.'
                : 'Create a task and choose how often it should repeat.'
          }
          action={
            status === 'archived' ? null : (
              <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>
                New task
              </Button>
            )
          }
        />
      ) : (
        <>
          {showArchived ? (
            <section className="mb-6">
              <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                <Archive size={13} />
                Deleted — history preserved
              </h2>
              <TaskList
                tasks={filtered.filter((task) => task.archivedAt)}
                date={today}
                allowToggle={false}
                label="Deleted tasks"
                empty={
                  <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-3">
                    Nothing deleted.
                  </p>
                }
              />
            </section>
          ) : null}

          {status !== 'archived' ? (
            <TaskList
              tasks={filtered.filter((task) => !task.archivedAt)}
              date={today}
              reorderable={status === 'active' && !query && categoryId === 'all'}
              showScheduledDate
              onEdit={openEdit}
              onDelete={requestDelete}
              label="Active tasks"
            />
          ) : null}
        </>
      )}

      {archivedCount > 0 && status !== 'archived' ? (
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-surface-2 p-4">
          <div>
            <p className="text-[13.5px] font-medium text-ink">
              {archivedCount} deleted {archivedCount === 1 ? 'task' : 'tasks'}
            </p>
            <p className="text-[12.5px] text-ink-3">
              Their past completion records are still counted in your history and streaks.
            </p>
          </div>
          <Button
            variant="secondary"
            icon={<Archive size={15} />}
            onClick={() => setStatus('archived')}
          >
            Review deleted
          </Button>
        </Card>
      ) : null}

      {dialog}
      {confirm}
      <RestoreBar tasks={filtered} onRestore={restoreTask} categoriesById={categoriesById} />
    </>
  )
}

function RestoreBar({
  tasks,
  onRestore,
  categoriesById,
}: {
  tasks: Task[]
  onRestore: (id: string) => void
  categoriesById: Map<string, { name: string; color: string }>
}) {
  const archived = tasks.filter((task) => task.archivedAt)
  if (archived.length === 0) return null

  return (
    <div className="mt-4 space-y-2">
      {archived.map((task) => {
        const category = task.categoryId ? categoriesById.get(task.categoryId) : null
        return (
          <div
            key={task.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-ink-2 line-through">{task.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                {category ? <CategoryDot color={category.color} name={category.name} /> : null}
                <span>{describeRecurrence(task.recurrence)}</span>
                <span>·</span>
                <span>Deleted {task.archivedAt ? formatMedium(task.archivedAt) : ''}</span>
              </div>
            </div>
            <Badge tone="neutral" icon={<ArchiveRestore size={11} />}>
              <button
                type="button"
                onClick={() => onRestore(task.id)}
                className="font-medium text-brand hover:underline"
              >
                Restore
              </button>
            </Badge>
          </div>
        )
      })}
    </div>
  )
}

function TasksSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-48 rounded-xl bg-surface-2" />
      <div className="card h-20" />
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-16" />
        ))}
      </div>
    </div>
  )
}
