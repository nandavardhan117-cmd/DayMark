import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getAuthInstance, isFirebaseConfigured } from '@/lib/firebase'

type AuthValue = {
  /** Firebase user, or null when signed out. */
  user: User | null
  /** True once the initial session check has finished. */
  authReady: boolean
  /** True while a sign-in / sign-up request is in flight. */
  busy: boolean
  /** Friendly message for the last failed attempt. */
  error: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string, displayName?: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

/**
 * Translates Firebase error codes into sentences a person can act on.
 * We deliberately do not surface the raw code or the underlying exception.
 */
function friendlyAuthError(code: string | undefined): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.'
    case 'auth/invalid-email':
      return 'That email address does not look valid.'
    case 'auth/missing-password':
      return 'Enter your password.'
    case 'auth/weak-password':
      return 'Use a password of at least 6 characters.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network unavailable. Check your connection and try again.'
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled for this project yet.'
    case 'auth/configuration-not-found':
      return 'This Firebase project has no Email/Password provider enabled.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track the signed-in user for the lifetime of the app.
  useEffect(() => {
    const auth = getAuthInstance()
    if (!auth) {
      // Not configured: stay signed out and skip the session check.
      setAuthReady(true)
      return
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser)
        setAuthReady(true)
      },
      (authError) => {
        console.error('[DayMark] Auth session check failed:', authError)
        setUser(null)
        setAuthReady(true)
      },
    )

    return () => unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getAuthInstance()
    if (!auth) {
      setError('Cloud sign-in is not configured.')
      return false
    }

    setBusy(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      return true
    } catch (authError) {
      const code = (authError as { code?: string }).code
      setError(friendlyAuthError(code))
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const auth = getAuthInstance()
    if (!auth) {
      setError('Cloud sign-up is not configured.')
      return false
    }

    setBusy(true)
    setError(null)
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (displayName?.trim()) {
        // Best effort — a failed profile update must not block account creation.
        await updateProfile(credential.user, { displayName: displayName.trim() })
      }
      return true
    } catch (authError) {
      const code = (authError as { code?: string }).code
      setError(friendlyAuthError(code))
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    const auth = getAuthInstance()
    if (!auth) return
    setBusy(true)
    try {
      await firebaseSignOut(auth)
    } catch (authError) {
      console.error('[DayMark] Sign out failed:', authError)
    } finally {
      setBusy(false)
    }
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      authReady,
      busy,
      error,
      signIn,
      signUp,
      signOut,
      clearError: () => setError(null),
    }),
    [user, authReady, busy, error, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth() must be used inside <AuthProvider>.')
  return context
}

/** The signed-in uid, or null. Handy for repository selection. */
export function useUid(): string | null {
  return useAuth().user?.uid ?? null
}
