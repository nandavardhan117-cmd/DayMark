import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Firebase bootstrap.
 *
 * Reads the web configuration from Vite environment variables defined in
 * `.env.local`. Nothing here throws when the config is missing — the app must
 * keep running in local-only mode so the dashboard and Monthly Tracker are
 * never blocked by an unfinished Firebase setup.
 *
 * SECURITY NOTE
 * -------------
 * These values are PUBLIC identifiers that ship in the browser bundle. They
 * are not secrets and cannot be treated as such. Access control is enforced
 * entirely by the Firestore security rules in `firestore.rules`, which require
 * `request.auth.uid == userId` on every document.
 *
 * Service-account credentials (the JSON keys used by server code) must NEVER
 * appear here. They are not used by this app at all.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
} as const

/** Every required variable is present in `.env.local`. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId,
  )
}

/** Names of any missing variables — shown in Settings when setup is incomplete. */
export function missingFirebaseKeys(): string[] {
  const required: Record<string, string | undefined> = {
    VITE_FIREBASE_API_KEY: config.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: config.authDomain,
    VITE_FIREBASE_PROJECT_ID: config.projectId,
    VITE_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
    VITE_FIREBASE_APP_ID: config.appId,
  }
  return Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key)
}

type FirebaseHandles = {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let handles: FirebaseHandles | null = null

/**
 * Lazily initialise the SDK once. Returning null (instead of throwing) when
 * unconfigured keeps every caller simple and the app fully usable offline.
 */
export function getFirebase(): FirebaseHandles | null {
  if (!isFirebaseConfigured()) return null
  if (handles) return handles

  try {
    const app = getApps().length > 0 ? (getApps()[0] as FirebaseApp) : initializeApp({ ...config })
    handles = { app, auth: getAuth(app), db: getFirestore(app) }
    return handles
  } catch (error) {
    console.error('[DayMark] Firebase failed to initialise:', error)
    return null
  }
}

/** Convenience accessor for the Firestore instance. */
export function getDb(): Firestore | null {
  return getFirebase()?.db ?? null
}

/** Convenience accessor for the Auth instance. */
export function getAuthInstance(): Auth | null {
  return getFirebase()?.auth ?? null
}

/** The Firebase project id, used in logs and the Settings page. */
export function firebaseProjectId(): string {
  return config.projectId ?? ''
}
