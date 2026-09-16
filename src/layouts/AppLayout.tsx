import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { PlateSearch } from '../components/PlateSearch'
import { Sidebar } from '../components/Sidebar'
import { BloqueioFree, ContadorFree } from '../components/LimiteFree'
import { useSessao } from '../lib/auth'
import { useLimiteFree } from '../lib/plano'

const COLLAPSE_KEY = 'deepcar.sidebar.collapsed'

export default function AppLayout() {
  const loc = useLocation()
  const naoEInicio = loc.pathname.replace(/\/$/, '') !== '/app'
  const { session, conferindo } = useSessao()
  const limite = useLimiteFree(session)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed])

  // primeira visita (sem perfil guardado): espera o servidor dizer quem é, para não
  // piscar a tela de login para quem já está conectado
  if (!session) {
    if (conferindo) return <div aria-busy="true" className="min-h-full" />
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }

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
            data-tip="Abrir menu"
            data-tip-side="bottom"
            className="grid h-10 w-10 place-items-center rounded-md text-ink-2 hover:bg-bench-3 lg:hidden"
          >
            <Menu size={20} />
          </button>

          {/* no início a placa já é o campo principal da tela; aqui seria repetido */}
          {naoEInicio ? <PlateSearch className="flex-1 max-w-md" /> : <div className="flex-1" />}

          <ContadorFree restante={limite.restante} />
        </header>

        <main className="schematic-grid min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {limite.bloqueado && <BloqueioFree />}
    </div>
  )
}
