import { FirestoreRepository } from '@/lib/firestoreRepository'
import { isFirebaseConfigured } from '@/lib/firebase'
import type { AppData } from '@/types'
import { DATA_VERSION } from '@/types'

/**
 * The data layer contract.
 *
 * Two implementations exist:
 *
 *   LocalRepository     — everything in this browser's localStorage.
 *                         Used whenever nobody is signed in (and always as a
 *                         safety copy; it is never deleted by the app).
 *   FirestoreRepository — one private document tree per signed-in user.
 *
 * Every page talks to `useStore()`, which talks to this interface. Nothing
 * above the repository knows which backend is active.
 */
export interface DataRepository {
  /** Shown in Settings so the user knows where their data lives. */
  readonly label: string
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
  /**
   * Optional: has this backend ever stored anything for the current user?
   * Used to tell "brand new account" apart from "user deleted everything",
   * so seeding and first-run migration only happen when they should.
   */
  hasRemoteData?(): Promise<boolean>
}

const STORAGE_KEY = 'daymark.data.v1'

/** Default settings used when nothing has been stored yet. */
export function defaultSettings() {
  return {
    theme: 'system' as const,
    weekStartsOn: 1 as const, // Monday — common for habit trackers
    userName: '',
  }
}

/** The empty state every new install starts from. */
export function emptyAppData(): AppData {
  return {
    version: DATA_VERSION,
    tasks: [],
    categories: [],
    challenges: [],
    days: {},
    settings: defaultSettings(),
  }
}

/**
 * Normalises whatever we read off disk into a well-formed AppData object.
 * This is the place to add migrations when the shape changes in future.
 */
export function normalize(raw: unknown): AppData {
  const base = emptyAppData()
  if (!raw || typeof raw !== 'object') return base

  const value = raw as Partial<AppData>
  return {
    version: typeof value.version === 'number' ? value.version : DATA_VERSION,
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    categories: Array.isArray(value.categories) ? value.categories : [],
    challenges: Array.isArray(value.challenges) ? value.challenges : [],
    days: value.days && typeof value.days === 'object' ? value.days : {},
    settings: {
      ...base.settings,
      ...(value.settings && typeof value.settings === 'object' ? value.settings : {}),
    },
  }
}

/** Reads / writes this browser's localStorage, with graceful failure. */
export class LocalRepository implements DataRepository {
  readonly label = 'This browser (local storage)'

  private get storage(): Storage | null {
    try {
      return window.localStorage
    } catch {
      return null
    }
  }

  async load(): Promise<AppData> {
    const storage = this.storage
    if (!storage) return emptyAppData()
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyAppData()
    try {
      return normalize(JSON.parse(raw))
    } catch {
      // Corrupt payload: start clean rather than crash the whole app.
      return emptyAppData()
    }
  }

  async save(data: AppData): Promise<void> {
    const storage = this.storage
    if (!storage) return
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  async hasRemoteData(): Promise<boolean> {
    return this.storage?.getItem(STORAGE_KEY) != null
  }

  /**
   * Removes the local copy. Only ever called if the user explicitly asks to
   * sign out and discard local data — never automatically.
   */
  async clear(): Promise<void> {
    this.storage?.removeItem(STORAGE_KEY)
  }
}

/**
 * Reads the browser copy without modifying it.
 *
 * Used by the first-run migration prompt so signing in can never destroy the
 * data a user built up before they created an account.
 */
export function readLocalSnapshot(): AppData | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    const data = normalize(parsed)
    const isMeaningful =
      data.tasks.length > 0 ||
      data.categories.length > 0 ||
      data.challenges.length > 0 ||
      Object.keys(data.days).length > 0
    return isMeaningful ? data : null
  } catch {
    return null
  }
}

/** True when there is a meaningful browser-only copy worth offering to import. */
export function hasMeaningfulLocalData(): boolean {
  return readLocalSnapshot() !== null
}

/**
 * The single switch point for choosing a backend.
 *
 * With no Firebase config, or nobody signed in, the app stays local-only.
 * With a signed-in user it switches to that user's private cloud tree.
 */
export function createRepository(uid: string | null = null): DataRepository {
  if (uid && isFirebaseConfigured()) {
    return new FirestoreRepository(uid)
  }
  return new LocalRepository()
}

/** Exported for the Settings page ("where is my data stored?"). */
export function currentRepositoryLabel(uid: string | null = null): string {
  return createRepository(uid).label
}
