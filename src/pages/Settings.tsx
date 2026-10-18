import {
  AlertTriangle,
  Check,
  Cloud,
  Database,
  Download,
  Flame,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Sun,
  Tag,
  Trash2,
  Upload,
  User,
  UserRound,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { Menu } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { formatMedium, todayKey } from '@/lib/dateUtils'
import { firebaseProjectId, isFirebaseConfigured } from '@/lib/firebase'
import { useStore } from '@/lib/store'
import type { Category, Challenge, ThemePreference } from '@/types'

const COLOR_PRESETS = [
  '#10b981',
  '#14b8a6',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#f59e0b',
  '#84cc16',
  '#64748b',
]

export function SettingsPage() {
  const { ready } = useStore()

  if (!ready) return <SettingsSkeleton />

  return (
    <>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Personalise DayMark and manage where your data is stored."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountCard />
        <ProfileCard />
        <AppearanceCard />
        <CategoriesCard />
        <ChallengesCard />
        <DataCard />
        <AboutCard />
      </div>
    </>
  )
}

/* ----------------------------------------------------------------- account */

function AccountCard() {
  const { user, signOut, busy } = useAuth()
  const { storageKind, repositoryLabel } = useStore()
  const navigate = useNavigate()

  const email = user?.email ?? ''
  const displayName = user?.displayName?.trim()

  return (
    <Card>
      <CardHeader
        title="Account"
        description={
          storageKind === 'cloud'
            ? 'Signed in. Your data syncs to your private Firebase project.'
            : 'Not signed in. Your data stays in this browser only.'
        }
        action={
          storageKind === 'cloud' ? (
            <Badge tone="success" icon={<Cloud size={11} />}>
              Synced
            </Badge>
          ) : (
            <Badge tone="neutral">Local</Badge>
          )
        }
      />

      {user ? (
        <>
          <div className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
              <UserRound size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-semibold text-ink">
                {displayName || email || 'Signed in'}
              </p>
              {displayName && email ? (
                <p className="truncate text-[12px] text-ink-3">{email}</p>
              ) : null}
              <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
                Project {firebaseProjectId()}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-3">
            <span className="min-w-0 truncate">Storage: {repositoryLabel}</span>
            <Button
              size="sm"
              variant="secondary"
              icon={<LogOut size={14} />}
              disabled={busy}
              onClick={() => {
                void signOut().then(() => navigate('/auth', { replace: true }))
              }}
            >
              Sign out
            </Button>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
            Signing out does not delete anything. Your records stay in your cloud account and the
            local browser copy, and the app falls back to local-only mode.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3.5 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3">
              <User size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-ink">
                {isFirebaseConfigured() ? 'Using local storage' : 'Cloud sync not configured'}
              </p>
              <p className="text-[12px] leading-relaxed text-ink-3">
                {isFirebaseConfigured()
                  ? 'Create an account to back up your tasks and habits.'
                  : 'Add your Firebase keys to .env.local to enable sign-in.'}
              </p>
            </div>
          </div>

          {isFirebaseConfigured() ? (
            <Button
              variant="primary"
              className="mt-3 w-full"
              icon={<Cloud size={16} />}
              onClick={() => navigate('/auth')}
            >
              Sign in or create account
            </Button>
          ) : null}
        </>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ profile */

function ProfileCard() {
  const { data, updateSettings } = useStore()
  const name = data?.settings.userName ?? ''

  return (
    <Card>
      <CardHeader
        title="Profile"
        description="Used only to personalise the greeting. No account required."
      />
      <Field label="Your name">
        <Input
          value={name}
          onChange={(event) => updateSettings({ userName: event.target.value })}
          placeholder="e.g. Alex"
          maxLength={40}
        />
      </Field>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-3">
        <User size={14} className="shrink-0" />
        Stored privately on this device only.
      </div>
    </Card>
  )
}

/* --------------------------------------------------------------- appearance */

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun size={14} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={14} /> },
  { value: 'system', label: 'System', icon: <Monitor size={14} /> },
]

function AppearanceCard() {
  const { data, updateSettings } = useStore()

  return (
    <Card>
      <CardHeader
        title="Appearance"
        description="Choose how DayMark looks. System follows your device."
        action={<Palette size={16} className="text-ink-3" />}
      />

      <SegmentedControl
        value={data?.settings.theme ?? 'system'}
        options={THEME_OPTIONS}
        onChange={(value) => updateSettings({ theme: value })}
        ariaLabel="Theme"
      />

      <div className="mt-5 border-t border-line pt-4">
        <Field
          label="Week starts on"
          hint="Affects the calendar layout only — recurring tasks keep their own weekdays."
        >
          <Select
            value={String(data?.settings.weekStartsOn ?? 1)}
            onChange={(event) =>
              updateSettings({ weekStartsOn: Number(event.target.value) === 0 ? 0 : 1 })
            }
          >
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
          </Select>
        </Field>
      </div>
    </Card>
  )
}

/* --------------------------------------------------------------- categories */

function CategoriesCard() {
  const { data, addCategory, updateCategory, deleteCategory } = useStore()
  const categories = data?.categories ?? []
  const tasks = data?.tasks ?? []

  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_PRESETS[0])
  const [editing, setEditing] = useState<Category | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null)
  const [error, setError] = useState('')

  function resetForm() {
    setName('')
    setColor(COLOR_PRESETS[0])
    setEditing(null)
    setError('')
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the category a name.')
      return
    }
    if (editing) {
      updateCategory(editing.id, { name: name.trim(), color })
    } else {
      addCategory(name.trim(), color)
    }
    resetForm()
  }

  const usedCount = (id: string) => tasks.filter((task) => task.categoryId === id).length

  return (
    <Card>
      <CardHeader
        title="Categories"
        description="Group tasks so your stats can break down by area of life."
        action={<Tag size={16} className="text-ink-3" />}
      />

      {categories.length === 0 ? (
        <p className="mb-4 rounded-xl border border-dashed border-line px-4 py-5 text-center text-[13px] text-ink-3">
          No categories yet — add one below.
        </p>
      ) : (
        <ul className="mb-4 space-y-1.5">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">{category.name}</p>
                  <p className="text-[11.5px] text-ink-3">
                    {usedCount(category.id)} {usedCount(category.id) === 1 ? 'task' : 'tasks'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(category)
                    setName(category.name)
                    setColor(category.color)
                    setError('')
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${category.name}`}
                  className="h-8 w-8 hover:text-danger"
                  onClick={() => setPendingDelete(category)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 border-t border-line pt-4">
        <Field label={editing ? 'Edit category' : 'New category'} error={error}>
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
            placeholder="e.g. Fitness"
            maxLength={30}
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Colour</span>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                aria-label={`Use colour ${preset}`}
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-full transition-transform hover:scale-110',
                  color === preset ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : '',
                )}
                style={{ backgroundColor: preset }}
              >
                {color === preset ? <Check size={13} className="text-white" /> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" variant="primary" size="sm">
            {editing ? 'Save category' : 'Add category'}
          </Button>
          {editing ? (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this category?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be removed. Tasks using it will not be deleted — they will simply become uncategorised.`
            : ''
        }
        confirmLabel="Delete category"
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteCategory(pendingDelete.id)
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </Card>
  )
}

/* -------------------------------------------------------------- challenges */

function ChallengesCard() {
  const { data, addChallenge, updateChallenge, deleteChallenge } = useStore()
  const challenges = data?.challenges ?? []
  const tasks = (data?.tasks ?? []).filter((task) => !task.archivedAt)
  const today = todayKey()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Challenge | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Challenge | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [taskIds, setTaskIds] = useState<string[]>([])
  const [error, setError] = useState('')

  function openCreate() {
    setEditing(null)
    setName('')
    setDescription('')
    setStartDate(today)
    setEndDate(today)
    setTaskIds([])
    setError('')
    setOpen(true)
  }

  function openEdit(challenge: Challenge) {
    setEditing(challenge)
    setName(challenge.name)
    setDescription(challenge.description)
    setStartDate(challenge.startDate)
    setEndDate(challenge.endDate)
    setTaskIds(challenge.taskIds)
    setError('')
    setOpen(true)
  }

  function toggleTask(id: string) {
    setTaskIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the challenge a name.')
      return
    }
    if (endDate < startDate) {
      setError('The end date must be on or after the start date.')
      return
    }
    if (taskIds.length === 0) {
      setError('Pick at least one task.')
      return
    }

    const draft = { name, description, startDate, endDate, taskIds }
    if (editing) updateChallenge(editing.id, draft)
    else addChallenge(draft)

    setOpen(false)
    setEditing(null)
  }

  return (
    <Card>
      <CardHeader
        title="Personal challenges"
        description="Bundle tasks under a shared goal with a start and end date."
        action={
          <Button size="sm" variant="soft" icon={<Plus size={14} />} onClick={openCreate}>
            New
          </Button>
        }
      />

      {challenges.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[13px] text-ink-3">
          No challenges yet. Try something like a 30-day fitness push.
        </p>
      ) : (
        <ul className="space-y-2">
          {challenges.map((challenge) => {
            const active = today >= challenge.startDate && today <= challenge.endDate
            return (
              <li
                key={challenge.id}
                className="rounded-xl border border-line px-3.5 py-3 transition-colors hover:border-line-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-semibold text-ink">
                        {challenge.name}
                      </p>
                      <Badge tone={active ? 'success' : 'neutral'}>
                        {active ? 'Active' : today > challenge.endDate ? 'Ended' : 'Upcoming'}
                      </Badge>
                    </div>
                    {challenge.description ? (
                      <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                        {challenge.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11.5px] text-ink-3">
                      {formatMedium(challenge.startDate)} → {formatMedium(challenge.endDate)} ·{' '}
                      {challenge.taskIds.length}{' '}
                      {challenge.taskIds.length === 1 ? 'task' : 'tasks'}
                    </p>
                  </div>

                  <Menu
                    items={[
                      { id: 'edit', label: 'Edit', onClick: () => openEdit(challenge) },
                      {
                        id: 'delete',
                        label: 'Delete',
                        icon: <Trash2 size={14} />,
                        onClick: () => setPendingDelete(challenge),
                        tone: 'danger',
                      },
                    ]}
                    trigger={({ toggle }) => (
                      <Button size="sm" variant="ghost" onClick={toggle}>
                        Manage
                      </Button>
                    )}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit challenge' : 'New challenge'}
        description="Pick the tasks that count toward this goal."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editing ? 'Save changes' : 'Create challenge'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" error={error}>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
              }}
              placeholder="e.g. 30-day fitness push"
              maxLength={60}
              autoFocus
            />
          </Field>

          <Field label="Description (optional)">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Why this matters to you"
              rows={2}
              maxLength={200}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts">
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field label="Ends">
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Tasks included" hint="Only active tasks can join a challenge.">
            {tasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-[13px] text-ink-3">
                Create a task first.
              </p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2 scrollbar-thin">
                {tasks.map((task) => {
                  const checked = taskIds.includes(task.id)
                  return (
                    <label
                      key={task.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                        checked ? 'bg-brand-soft text-brand' : 'text-ink-2 hover:bg-surface-2',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTask(task.id)}
                        className="h-4 w-4 accent-[var(--dm-brand)]"
                      />
                      <span className="truncate">{task.title}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </Field>

          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this challenge?"
        description="The challenge is removed. Your tasks and all completion history stay exactly as they are."
        confirmLabel="Delete challenge"
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteChallenge(pendingDelete.id)
          setPendingDelete(null)
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </Card>
  )
}

/* -------------------------------------------------------------------- data */

function DataCard() {
  const { exportJson, importJson, resetAllData, loadSampleData, repositoryLabel } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSample, setConfirmSample] = useState(false)

  function handleExport() {
    const json = exportJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `daymark-backup-${todayKey()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus({ tone: 'ok', text: 'Backup file downloaded.' })
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      importJson(text)
      setStatus({ tone: 'ok', text: 'Backup restored successfully.' })
    } catch {
      setStatus({
        tone: 'error',
        text: 'That file could not be read as a DayMark backup.',
      })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Data & storage"
        description="Everything lives in this browser for now. Back up regularly."
        action={<Database size={16} className="text-ink-3" />}
      />

      <div className="mb-4 flex items-center gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-[12.5px] text-brand">
        <Flame size={14} className="shrink-0" />
        <span>
          Current storage: <span className="font-semibold">{repositoryLabel}</span>
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" icon={<Download size={15} />} onClick={handleExport}>
          Export backup (.json)
        </Button>
        <Button variant="secondary" icon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>
          Import backup
        </Button>
        <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={() => setConfirmSample(true)}>
          Load sample data
        </Button>
        <Button
          variant="secondary"
          icon={<Trash2 size={15} />}
          className="text-danger hover:border-danger/40"
          onClick={() => setConfirmReset(true)}
        >
          Erase everything
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleImportFile(file)
        }}
      />

      {status ? (
        <p
          className={cn(
            'mt-3 rounded-xl px-3.5 py-2.5 text-[12.5px]',
            status.tone === 'ok' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
          )}
        >
          {status.text}
        </p>
      ) : null}

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-ink-3">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
        <span>
          Clearing your browser data will erase DayMark too. Export a backup first. Cloud sync
          arrives in a later step, once Firebase is configured.
        </span>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Erase all data?"
        description="This removes every task, category, challenge and completion record from this browser. It cannot be undone unless you have a backup file."
        confirmLabel="Erase everything"
        destructive
        onConfirm={() => {
          resetAllData()
          setConfirmReset(false)
          setStatus({ tone: 'ok', text: 'All data erased.' })
        }}
        onCancel={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={confirmSample}
        title="Replace with sample data?"
        description="Your current tasks, categories and history will be replaced by the built-in starter set. Export a backup first if you want to keep them."
        confirmLabel="Load samples"
        destructive
        onConfirm={() => {
          loadSampleData()
          setConfirmSample(false)
          setStatus({ tone: 'ok', text: 'Sample data loaded.' })
        }}
        onCancel={() => setConfirmSample(false)}
      />
    </Card>
  )
}

/* ------------------------------------------------------------------- about */

function AboutCard() {
  const { storageKind, repositoryLabel } = useStore()

  return (
    <Card>
      <CardHeader title="About DayMark" />
      <dl className="space-y-2.5 text-[13px]">
        <InfoRow label="Version" value="0.2.0" />
        <InfoRow label="Storage" value={repositoryLabel} />
        <InfoRow
          label="Backend"
          value={storageKind === 'cloud' ? 'Firebase (signed in)' : 'Local browser only'}
        />
        <InfoRow
          label="Project"
          value={isFirebaseConfigured() ? firebaseProjectId() : 'Not configured'}
        />
        <InfoRow label="Plan" value="Spark (free tier)" />
      </dl>
      <p className="mt-4 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-3">
        DayMark keeps one completion record per date, so editing or deleting a task never rewrites
        the past. When signed in, every document is locked to your account by Firestore security
        rules — no other user can read your data.
      </p>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0 last:pb-0">
      <dt className="text-ink-3">{label}</dt>
      <dd className="truncate font-medium text-ink">{value}</dd>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-52 rounded-xl bg-surface-2" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card h-56" />
        <div className="card h-56" />
      </div>
    </div>
  )
}
