import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { MigrationPrompt } from '@/components/MigrationPrompt'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider, useAuth } from '@/lib/auth'
import { isFirebaseConfigured } from '@/lib/firebase'
import { StoreProvider, useThemeEffect } from '@/lib/store'
import { AuthPage } from '@/pages/Auth'
import { CalendarPage } from '@/pages/Calendar'
import { DashboardPage } from '@/pages/Dashboard'
import { MonthlyTrackerPage } from '@/pages/MonthlyTracker'
import { NotFoundPage } from '@/pages/NotFound'
import { SettingsPage } from '@/pages/Settings'
import { StatisticsPage } from '@/pages/Statistics'
import { TasksPage } from '@/pages/Tasks'
import { TodayPage } from '@/pages/Today'

/** Applies the saved theme to <html> and keeps it in sync with the OS. */
function ThemeBridge() {
  useThemeEffect()
  return null
}

/**
 * Blocks the app until Firebase reports whether a session exists.
 * With no Firebase config the guard is a no-op, so the app keeps working
 * entirely in local-only mode.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth()

  if (!isFirebaseConfigured()) return <>{children}</>
  if (!authReady) return <FullScreenSpinner />
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function FullScreenSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <div className="flex flex-col items-center gap-3 text-ink-3">
        <Loader2 size={22} className="animate-spin text-brand" />
        <p className="text-[13px]">Checking your session…</p>
      </div>
    </div>
  )
}

function ProtectedShell() {
  return (
    <RequireAuth>
      <AppShell />
      <MigrationPrompt />
    </RequireAuth>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter>
          <ThemeBridge />
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route element={<ProtectedShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/monthly" element={<MonthlyTrackerPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  )
}
