import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from '@/lib/auth'
import { todayKey } from '@/lib/dateUtils'
import { makeId } from '@/lib/id'
import {
  createRepository,
  emptyAppData,
  readLocalSnapshot,
  type DataRepository,
} from '@/lib/repository'
import { buildSeedData } from '@/lib/seed'
import type {
  AppData,
  Category,
  Challenge,
  DateKey,
  Recurrence,
  Settings,
  Task,
  ThemePreference,
  Weekday,
} from '@/types'

/** What the task form collects before a Task object exists. */
export type TaskDraft = {
  title: string
  notes: string
  categoryId: string | null
  recurrence: Recurrence
  startDate: DateKey
}

export type ChallengeDraft = {
  name: string
  description: string
  startDate: DateKey
  endDate: DateKey
  taskIds: string[]
}

type StoreValue = {
  /** Null until the first load finishes — lets the UI show a loading state. */
  data: AppData | null
  ready: boolean
  repositoryLabel: string
  /** 'cloud' when the signed-in user is stored in Firestore. */
  storageKind: 'local' | 'cloud'
  /** The signed-in Firebase uid, or null when working locally. */
  uid: string | null
  /**
   * Set once when a brand-new cloud account already has a browser-only copy.
   * Resolved by <MigrationPrompt>; local data is never deleted either way.
   */
  pendingMigration: AppData | null
  resolveMigration: (choice: 'upload' | 'fresh') => Promise<void>
  dismissMigration: () => void

  addTask: (draft: TaskDraft) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  restoreTask: (id: string) => void
  reorderTasks: (orderedIds: string[]) => void
  moveTask: (id: string, direction: -1 | 1) => void

  toggleCompletion: (date: DateKey, taskId: string) => void
  setCompletion: (date: DateKey, taskId: string, done: boolean) => void
  clearCompletion: (date: DateKey, taskId: string) => void

  addCategory: (name: string, color: string) => Category
  updateCategory: (id: string, patch: Partial<Category>) => void
  deleteCategory: (id: string) => void

  addChallenge: (draft: ChallengeDraft) => Challenge
  updateChallenge: (id: string, patch: Partial<Challenge>) => void
  deleteChallenge: (id: string) => void

  updateSettings: (patch: Partial<Settings>) => void

  resetAllData: () => void
  loadSampleData: () => void
  exportJson: () => string
  importJson: (text: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

/** Debounce so rapid toggles do not hammer localStorage. */
const SAVE_DELAY_MS = 200

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth()

  const repoRef = useRef<DataRepository | null>(null)
  if (!repoRef.current) repoRef.current = createRepository(user?.uid ?? null)

  const [data, setData] = useState<AppData | null>(null)
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState<string | null>(user?.uid ?? null)
  const [pendingMigration, setPendingMigration] = useState<AppData | null>(null)
  const dataRef = useRef<AppData | null>(null)

  // Keep a ref in sync so the save effect can read the latest value.
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // ---- pick the backend whenever the signed-in user changes ---------------
  useEffect(() => {
    if (!authReady) return
    const nextUid = user?.uid ?? null

    repoRef.current = createRepository(nextUid)
    setUid(nextUid)
    // Clear the previous user's state so nothing can leak between accounts.
    setData(null)
    setReady(false)
    setPendingMigration(null)
  }, [authReady, user?.uid])

  // ---- initial load -----------------------------------------------------
  useEffect(() => {
    if (!authReady) return
    let cancelled = false

    async function boot() {
      const repo = repoRef.current as DataRepository

      // A brand-new cloud account may already have a browser-only copy worth
      // carrying over. Offer it rather than silently discarding it.
      const isNewCloudAccount =
        uid !== null && typeof repo.hasRemoteData === 'function'
          ? !(await repo.hasRemoteData())
          : false

      if (isNewCloudAccount) {
        const local = readLocalSnapshot()
        if (local) {
          setPendingMigration(local)
          setReady(true)
          return
        }
      }

      let loaded = await repo.load()

      // First run with nothing stored at all: seed a friendly starter set.
      // Deliberately NOT applied when an account already has data, so syncing
      // can never overwrite real records with samples.
      const isFirstRun = loaded.tasks.length === 0 && loaded.categories.length === 0
      if (isFirstRun) {
        loaded = buildSeedData()
        await repo.save(loaded)
      }

      if (!cancelled) {
        setData(loaded)
        setReady(true)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [uid, authReady])

  // ---- persistence ------------------------------------------------------
  useEffect(() => {
    if (!ready || !data) return
    const handle = window.setTimeout(() => {
      void repoRef.current?.save(data)
    }, SAVE_DELAY_MS)
    return () => window.clearTimeout(handle)
  }, [data, ready])

  // ---- internal helpers -------------------------------------------------
  const patchData = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => (prev ? updater(prev) : prev))
  }, [])

  // ---- tasks ------------------------------------------------------------
  const addTask = useCallback(
    (draft: TaskDraft): Task => {
      const now = new Date().toISOString()
      const task: Task = {
        id: makeId(),
        title: draft.title.trim(),
        notes: draft.notes.trim(),
        categoryId: draft.categoryId,
        recurrence: draft.recurrence,
        order: 0,
        startDate: draft.startDate,
        createdAt: now,
        archivedAt: null,
      }

      patchData((prev) => ({
        ...prev,
        tasks: [
          // New tasks go to the top of the list.
          { ...task, order: -1 },
          ...prev.tasks.map((t) => ({ ...t, order: t.order + 1 })),
        ],
      }))

      return task
    },
    [patchData],
  )

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      patchData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === id ? { ...task, ...patch, id: task.id } : task,
        ),
      }))
    },
    [patchData],
  )

  /**
   * Soft delete. The task stops appearing on today and future dates, but every
   * completion already recorded on past dates stays readable — that is what
   * "preserve historical records" means in practice.
   */
  const deleteTask = useCallback(
    (id: string) => {
      const today = todayKey()
      patchData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === id ? { ...task, archivedAt: today } : task,
        ),
      }))
    },
    [patchData],
  )

  const restoreTask = useCallback(
    (id: string) => {
      patchData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((task) =>
          task.id === id ? { ...task, archivedAt: null } : task,
        ),
      }))
    },
    [patchData],
  )

  const reorderTasks = useCallback(
    (orderedIds: string[]) => {
      patchData((prev) => {
        const byId = new Map(prev.tasks.map((task) => [task.id, task]))
        const reordered = orderedIds
          .map((id, index) => {
            const task = byId.get(id)
            return task ? { ...task, order: index } : null
          })
          .filter((task): task is Task => task !== null)

        // Keep anything not mentioned in the list, after the reordered part.
        const seen = new Set(orderedIds)
        const rest = prev.tasks
          .filter((task) => !seen.has(task.id))
          .map((task, index) => ({ ...task, order: reordered.length + index }))

        return { ...prev, tasks: [...reordered, ...rest] }
      })
    },
    [patchData],
  )

  const moveTask = useCallback(
    (id: string, direction: -1 | 1) => {
      patchData((prev) => {
        const active = [...prev.tasks].sort((a, b) => a.order - b.order)
        const index = active.findIndex((task) => task.id === id)
        const target = index + direction
        if (index === -1 || target < 0 || target >= active.length) return prev

        const next = [...active]
        const [moved] = next.splice(index, 1)
        if (!moved) return prev
        next.splice(target, 0, moved)

        const orderMap = new Map(next.map((task, i) => [task.id, i]))
        return {
          ...prev,
          tasks: prev.tasks.map((task) => ({
            ...task,
            order: orderMap.get(task.id) ?? task.order,
          })),
        }
      })
    },
    [patchData],
  )

  // ---- completions ------------------------------------------------------
  const setCompletion = useCallback(
    (date: DateKey, taskId: string, done: boolean) => {
      patchData((prev) => {
        const existing = prev.days[date]
        const completions = { ...(existing?.completions ?? {}) }

        if (done) completions[taskId] = true
        else delete completions[taskId]

        // Drop day records that became empty, so storage stays tidy.
        const hasEntries = Object.keys(completions).length > 0
        const days = { ...prev.days }

        if (hasEntries) {
          days[date] = {
            date,
            completions,
            updatedAt: new Date().toISOString(),
          }
        } else {
          delete days[date]
        }

        return { ...prev, days }
      })
    },
    [patchData],
  )

  const toggleCompletion = useCallback(
    (date: DateKey, taskId: string) => {
      patchData((prev) => {
        const isDone = Boolean(prev.days[date]?.completions[taskId])
        return setCompletionIn(prev, date, taskId, !isDone)
      })
    },
    [patchData],
  )

  const clearCompletion = useCallback(
    (date: DateKey, taskId: string) => {
      patchData((prev) => setCompletionIn(prev, date, taskId, false))
    },
    [patchData],
  )

  // ---- categories -------------------------------------------------------
  const addCategory = useCallback(
    (name: string, color: string): Category => {
      const category: Category = {
        id: makeId(),
        name: name.trim(),
        color,
        createdAt: new Date().toISOString(),
      }
      patchData((prev) => ({ ...prev, categories: [...prev.categories, category] }))
      return category
    },
    [patchData],
  )

  const updateCategory = useCallback(
    (id: string, patch: Partial<Category>) => {
      patchData((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }))
    },
    [patchData],
  )

  /** Deleting a category keeps its tasks — they simply become uncategorised. */
  const deleteCategory = useCallback(
    (id: string) => {
      patchData((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        tasks: prev.tasks.map((task) =>
          task.categoryId === id ? { ...task, categoryId: null } : task,
        ),
        challenges: prev.challenges.map((challenge) => challenge),
      }))
    },
    [patchData],
  )

  // ---- challenges -------------------------------------------------------
  const addChallenge = useCallback(
    (draft: ChallengeDraft): Challenge => {
      const challenge: Challenge = {
        id: makeId(),
        name: draft.name.trim(),
        description: draft.description.trim(),
        startDate: draft.startDate,
        endDate: draft.endDate,
        taskIds: draft.taskIds,
        createdAt: new Date().toISOString(),
      }
      patchData((prev) => ({ ...prev, challenges: [...prev.challenges, challenge] }))
      return challenge
    },
    [patchData],
  )

  const updateChallenge = useCallback(
    (id: string, patch: Partial<Challenge>) => {
      patchData((prev) => ({
        ...prev,
        challenges: prev.challenges.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }))
    },
    [patchData],
  )

  const deleteChallenge = useCallback(
    (id: string) => {
      patchData((prev) => ({
        ...prev,
        challenges: prev.challenges.filter((c) => c.id !== id),
      }))
    },
    [patchData],
  )

  // ---- settings ---------------------------------------------------------
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      patchData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
    },
    [patchData],
  )

  // ---- first-run migration ----------------------------------------------
  /**
   * Offer the pre-existing browser copy when a brand-new cloud account is
   * created. Either choice leaves localStorage untouched, so the local copy
   * remains available as a rollback.
   */
  const resolveMigration = useCallback(
    async (choice: 'upload' | 'fresh') => {
      const snapshot = pendingMigration
      setPendingMigration(null)
      if (!snapshot) return

      const next = choice === 'upload' ? snapshot : buildSeedData()
      setData(next)
      setReady(true)
      await repoRef.current?.save(next)
    },
    [pendingMigration],
  )

  const dismissMigration = useCallback(() => {
    // Defer: the boot effect will run again and load a fresh cloud account.
    setPendingMigration(null)
  }, [])

  // ---- data management --------------------------------------------------
  const resetAllData = useCallback(() => {
    patchData(() => emptyAppData())
  }, [patchData])

  const loadSampleData = useCallback(() => {
    patchData(() => buildSeedData())
  }, [patchData])

  const exportJson = useCallback(() => {
    return JSON.stringify(dataRef.current ?? emptyAppData(), null, 2)
  }, [])

  const importJson = useCallback(
    (text: string) => {
      const parsed: unknown = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('That file does not look like a DayMark export.')
      }
      const value = parsed as Partial<AppData>
      const base = emptyAppData()
      const next: AppData = {
        version: base.version,
        tasks: Array.isArray(value.tasks) ? value.tasks : [],
        categories: Array.isArray(value.categories) ? value.categories : [],
        challenges: Array.isArray(value.challenges) ? value.challenges : [],
        days: value.days && typeof value.days === 'object' ? value.days : {},
        settings: { ...base.settings, ...(value.settings ?? {}) },
      }
      patchData(() => next)
    },
    [patchData],
  )

  const value = useMemo<StoreValue>(
    () => ({
      data,
      ready,
      repositoryLabel: repoRef.current?.label ?? 'unknown',
      storageKind: uid ? 'cloud' : 'local',
      uid,
      pendingMigration,
      resolveMigration,
      dismissMigration,
      addTask,
      updateTask,
      deleteTask,
      restoreTask,
      reorderTasks,
      moveTask,
      toggleCompletion,
      setCompletion,
      clearCompletion,
      addCategory,
      updateCategory,
      deleteCategory,
      addChallenge,
      updateChallenge,
      deleteChallenge,
      updateSettings,
      resetAllData,
      loadSampleData,
      exportJson,
      importJson,
    }),
    [
      data,
      ready,
      uid,
      pendingMigration,
      resolveMigration,
      dismissMigration,
      addTask,
      updateTask,
      deleteTask,
      restoreTask,
      reorderTasks,
      moveTask,
      toggleCompletion,
      setCompletion,
      clearCompletion,
      addCategory,
      updateCategory,
      deleteCategory,
      addChallenge,
      updateChallenge,
      deleteChallenge,
      updateSettings,
      resetAllData,
      loadSampleData,
      exportJson,
      importJson,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

/** Pure helper so toggle and set share identical logic. */
function setCompletionIn(
  prev: AppData,
  date: DateKey,
  taskId: string,
  done: boolean,
): AppData {
  const existing = prev.days[date]
  const completions = { ...(existing?.completions ?? {}) }

  if (done) completions[taskId] = true
  else delete completions[taskId]

  const days = { ...prev.days }
  if (Object.keys(completions).length > 0) {
    days[date] = { date, completions, updatedAt: new Date().toISOString() }
  } else {
    delete days[date]
  }

  return { ...prev, days }
}

export function useStore(): StoreValue {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore() must be used inside <StoreProvider>.')
  }
  return context
}

/**
 * Convenience selector for pages that need the data plus a guarantee it is
 * loaded. Throws rather than silently rendering an empty app.
 */
export function useAppData(): AppData {
  const { data } = useStore()
  if (!data) throw new Error('useAppData() used before data finished loading.')
  return data
}

/** Applies the theme preference to <html> and follows the OS when set to system. */
export function useThemeEffect() {
  const { data, updateSettings } = useStore()
  const preference: ThemePreference = data?.settings.theme ?? 'system'

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = preference === 'dark' || (preference === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [preference])

  return { preference, updateSettings }
}

/** Weekday helper re-exported so pages do not need two imports. */
export type { Weekday }
