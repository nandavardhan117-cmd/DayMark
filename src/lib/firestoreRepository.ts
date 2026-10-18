import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'

import { getDb } from '@/lib/firebase'
import { emptyAppData, normalize, type DataRepository } from '@/lib/repository'
import type { AppData, DayLog } from '@/types'
import { DATA_VERSION } from '@/types'

/**
 * Cloud storage for one authenticated user.
 *
 * DATA MODEL
 * ----------
 *   users/{uid}                  version, settings, categories, challenges,
 *                                tasks   <- small and bounded by user choice
 *   users/{uid}/days/{YYYY-MM-DD} date, completions, updatedAt
 *
 * Days live in a subcollection because they are the only unbounded part of the
 * data: a user ticking habits for several years would eventually push a single
 * document past Firestore's 1MB limit. Splitting them out removes that ceiling
 * entirely.
 *
 * SECURITY
 * --------
 * Every read/write below goes through the SDK as the signed-in user, so
 * Firestore evaluates `request.auth.uid == userId` from `firestore.rules`.
 * There is no admin/service-account credential anywhere in this file.
 */
export class FirestoreRepository implements DataRepository {
  readonly label = 'Cloud — Firebase Firestore'

  /** Day documents we know exist, so saves do not need a full re-read. */
  private knownDayIds = new Set<string>()

  /** Serialises saves so two rapid changes cannot interleave batches. */
  private queue: Promise<void> = Promise.resolve()

  private readonly uid: string

  constructor(uid: string) {
    this.uid = uid
  }

  private get userRef() {
    const db = this.requireDb()
    return doc(db, 'users', this.uid)
  }

  private get daysRef() {
    const db = this.requireDb()
    return collection(db, 'users', this.uid, 'days')
  }

  private requireDb(): Firestore {
    const db = getDb()
    if (!db) throw new Error('Firestore is not available. Check your .env.local configuration.')
    return db
  }

  /** True when this user has never written to the cloud. */
  async hasRemoteData(): Promise<boolean> {
    const snapshot = await getDoc(this.userRef)
    return snapshot.exists()
  }

  async load(): Promise<AppData> {
    const [userSnapshot, daysSnapshot] = await Promise.all([
      getDoc(this.userRef),
      getDocs(this.daysRef),
    ])

    const known = new Set<string>()
    const days: Record<string, DayLog> = {}

    daysSnapshot.forEach((dayDoc) => {
      const value = dayDoc.data() as Partial<DayLog> | undefined
      if (!value || typeof value.date !== 'string') return
      known.add(dayDoc.id)
      days[value.date] = {
        date: value.date,
        completions: value.completions ?? {},
        updatedAt: value.updatedAt ?? '',
      }
    })

    this.knownDayIds = known

    if (!userSnapshot.exists()) {
      return emptyAppData()
    }

    const raw = userSnapshot.data() as Record<string, unknown>
    return normalize({
      version: typeof raw.version === 'number' ? raw.version : DATA_VERSION,
      tasks: raw.tasks,
      categories: raw.categories,
      challenges: raw.challenges,
      settings: raw.settings,
      days,
    })
  }

  async save(data: AppData): Promise<void> {
    this.queue = this.queue.then(() => this.performSave(data)).catch((error) => {
      console.error('[DayMark] Cloud save failed:', error)
    })
    return this.queue
  }

  private async performSave(data: AppData): Promise<void> {
    const dayLogs = Object.values(data.days)
    const nextDayIds = new Set(dayLogs.map((log) => log.date))

    // 1. The small, bounded part of the account.
    await setDoc(
      this.userRef,
      {
        version: data.version,
        settings: data.settings,
        categories: data.categories,
        challenges: data.challenges,
        tasks: data.tasks,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )

    // 2. Upsert every day record we currently hold.
    // Firestore caps a batch at 500 operations, so large writes are split.
    // They are committed one after another on purpose: sequential batches keep
    // ordering predictable and avoid opening many parallel connections.
    /* oxlint-disable no-await-in-loop */
    for (const chunk of chunked(dayLogs, 400)) {
      const batch = writeBatch(this.requireDb())
      for (const log of chunk) {
        batch.set(doc(this.daysRef, log.date), log)
      }
      await batch.commit()
    }

    // 3. Remove day records that were cleared locally (an emptied checkbox).
    const stale = [...this.knownDayIds].filter((id) => !nextDayIds.has(id))
    for (const chunk of chunked(stale, 400)) {
      const batch = writeBatch(this.requireDb())
      for (const id of chunk) {
        batch.delete(doc(this.daysRef, id))
      }
      await batch.commit()
    }
    /* oxlint-enable no-await-in-loop */

    this.knownDayIds = nextDayIds
  }
}

function chunked<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Exported so the Settings page can offer a full cloud wipe later. */
export async function deleteAllCloudData(uid: string): Promise<void> {
  const db = getDb()
  if (!db) return

  const daysSnapshot = await getDocs(collection(db, 'users', uid, 'days'))
  /* oxlint-disable no-await-in-loop */
  for (const chunk of chunked(daysSnapshot.docs, 400)) {
    const batch = writeBatch(db)
    for (const dayDoc of chunk) batch.delete(dayDoc.ref)
    await batch.commit()
  }
  /* oxlint-enable no-await-in-loop */

  await deleteDoc(doc(db, 'users', uid))
}
