import { CloudOff, Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Logo } from '@/components/layout/Logo'
import { useAuth } from '@/lib/auth'
import { isFirebaseConfigured, missingFirebaseKeys } from '@/lib/firebase'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Form'

type Mode = 'signin' | 'signup'

export function AuthPage() {
  const { user, authReady, busy, error, signIn, signUp, clearError } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState('')

  const configured = isFirebaseConfigured()

  // Clear a stale error when the user starts typing or switches mode.
  useEffect(() => {
    setLocalError('')
    clearError()
  }, [mode, clearError])

  // Already signed in — go straight to the app.
  if (authReady && user) return <Navigate to="/" replace />

  if (!configured) {
    const missing = missingFirebaseKeys()
    return (
      <AuthShell>
        <Card>
          <h1 className="text-[19px] font-bold tracking-tight text-ink">
            Cloud sync is not configured
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
            DayMark is running in local-only mode, so everything stays in this browser. To enable
            sign-in, add these variables to <code className="font-mono text-ink">.env.local</code>{' '}
            and restart the dev server:
          </p>
          <ul className="mt-3 space-y-1 rounded-xl bg-surface-2 p-3 font-mono text-[12px] text-ink-2">
            {missing.map((key) => (
              <li key={key}>· {key}</li>
            ))}
          </ul>
          <Link to="/" className="mt-5 block">
            <Button variant="primary" className="w-full" icon={<CloudOff size={16} />}>
              Continue in this browser only
            </Button>
          </Link>
        </Card>
      </AuthShell>
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLocalError('')

    if (!email.trim()) {
      setLocalError('Enter your email address.')
      return
    }
    if (!password) {
      setLocalError('Enter your password.')
      return
    }
    if (mode === 'signup' && password.length < 6) {
      setLocalError('Use a password of at least 6 characters.')
      return
    }

    const ok =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, name)

    if (ok) navigate('/', { replace: true })
  }

  const message = localError || error

  return (
    <AuthShell>
      <Card className="w-full">
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <h1 className="text-[19px] font-bold tracking-tight text-ink">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">
            {mode === 'signin'
              ? 'Sign in to sync your tasks and habits to your private cloud space.'
              : 'Your tasks, habits and history are stored privately — only you can read them.'}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1">
          <TabButton active={mode === 'signin'} onClick={() => setMode('signin')} label="Sign in" />
          <TabButton
            active={mode === 'signup'}
            onClick={() => setMode('signup')}
            label="Create account"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' ? (
            <Field label="Your name (optional)">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Alex"
                autoComplete="name"
                maxLength={40}
              />
            </Field>
          ) : null}

          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              required
            />
          </Field>

          <Field
            label="Password"
            hint={mode === 'signup' ? 'At least 6 characters.' : undefined}
          >
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
            />
          </Field>

          {message ? (
            <p
              role="alert"
              className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[12.5px] font-medium text-danger"
            >
              {message}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            size="lg"
            disabled={busy}
            icon={
              busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'signin' ? (
                <LogIn size={16} />
              ) : (
                <UserPlus size={16} />
              )
            }
          >
            {busy
              ? mode === 'signin'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 flex items-start justify-center gap-1.5 text-center text-[12px] leading-relaxed text-ink-3">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-success" />
          <span>
            Stored in your own Firebase project. Nobody else — including us — can read your data.
          </span>
        </p>

        <p className="mt-3 text-center text-[12.5px] text-ink-3">
          Prefer not to create an account?{' '}
          <Link to="/" className="font-medium text-brand hover:underline">
            Use local storage instead
          </Link>
        </p>
      </Card>
    </AuthShell>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[10px] px-3 py-2 text-[13px] font-medium transition-all duration-150',
        active ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-ink-3 hover:text-ink-2',
      )}
    >
      {label}
    </button>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up">{children}</div>
    </div>
  )
}
