import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { PlateSearch } from '../components/PlateSearch'
import { Sidebar } from '../components/Sidebar'
import { getSession } from '../lib/auth'

const COLLAPSE_KEY = 'deepcar.sidebar.collapsed'

export default function AppLayout() {
  const loc = useLocation()
  const session = getSession()
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed])

  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />

  return (
    <div className="flex h-full min-h-0">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* barra superior */}
        <header className="flex h-[68px] flex-none items-center gap-3 border-b seam px-4 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="grid h-10 w-10 place-items-center rounded-md text-ink-2 hover:bg-bench-3 lg:hidden"
          >
            <Menu size={20} />
          </button>

          <PlateSearch className="flex-1 max-w-md" />

          <div className="ml-auto flex items-center gap-2">
            <span className="code hidden items-center gap-2 rounded-full border seam px-3 py-1 text-[11px] text-ink-3 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Catálogo sincronizado
            </span>
          </div>
        </header>

        <main className="schematic-grid min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
