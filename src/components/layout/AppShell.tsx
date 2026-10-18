import { Outlet } from 'react-router-dom'
import { MobileHeader } from './MobileHeader'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'

/**
 * Application chrome: fixed sidebar on desktop, header + tab bar on mobile.
 * Every page renders inside <main>.
 */
export function AppShell() {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />

      <div className="lg:pl-64">
        <MobileHeader />
        <main
          id="main"
          className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-14 lg:pt-9"
        >
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
