import { useState, type ReactNode } from 'react'
import { useStore } from '@/lib/store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { Task } from '@/types'
import { TaskDialog } from './TaskDialog'

/**
 * Shared create / edit / delete plumbing for every page that lists tasks.
 *
 * "Delete" here is always a SOFT delete: the task stops appearing on today and
 * future dates, while every past completion record is preserved. The dialog
 * copy says so explicitly so the user is never surprised.
 */
export function useTaskDialogs() {
  const { deleteTask } = useStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(task: Task) {
    setEditing(task)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
  }

  function confirmDelete() {
    if (pendingDelete) deleteTask(pendingDelete.id)
    setPendingDelete(null)
  }

  const dialog = (
    <TaskDialog open={dialogOpen} task={editing} onClose={closeDialog} />
  )

  const confirm: ReactNode = (
    <ConfirmDialog
      open={pendingDelete !== null}
      title="Delete this task?"
      description={
        pendingDelete
          ? `"${pendingDelete.title}" will stop appearing from today onwards. ` +
            'Everything you already recorded on past days is kept, so your history and streaks stay intact.'
          : ''
      }
      confirmLabel="Delete task"
      destructive
      onConfirm={confirmDelete}
      onCancel={() => setPendingDelete(null)}
    />
  )

  return {
    openCreate,
    openEdit,
    requestDelete: setPendingDelete,
    dialog,
    confirm,
  }
}
