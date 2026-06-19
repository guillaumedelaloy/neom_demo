import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const isLanding = useLocation().pathname === '/'

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-start bg-ma-bg font-sans text-ma-ink">
      {!isLanding && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      )}
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        {!isLanding && <TopBar />}
        <main
          className={
            isLanding
              ? 'flex-1'
              : 'mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto px-6 py-6'
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
