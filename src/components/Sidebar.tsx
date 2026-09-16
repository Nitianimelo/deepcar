import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronsLeft, ChevronsRight, LogOut, ShieldCheck, UserRound, X } from 'lucide-react'
import { NAV, SECTION_META, type NavGroup, type NavLeaf } from '../data/nav'
import { TracePad } from './TracePad'
import { getSession, logout } from '../lib/auth'

type Props = {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: Props) {
  const loc = useLocation()
  const nav = useNavigate()
  const session = getSession()

  // grupos abertos: o grupo da rota atual abre sozinho
  const [open, setOpen] = useState<Record<string, boolean>>(() => groupsFor(loc.pathname))
  useEffect(() => {
    setOpen((o) => ({ ...o, ...groupsFor(loc.pathname, true) }))
  }, [loc.pathname])

  // fecha o drawer ao navegar no mobile
  useEffect(() => { onCloseMobile() }, [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sair() {
    await logout()
    nav('/login', { replace: true })
  }

  const contaAtiva = loc.pathname.startsWith('/app/conta')

  return (
    <>
      {/* véu no mobile */}
      <div
        onClick={onCloseMobile}
        className={`fixed inset-0 z-30 bg-black/55 backdrop-blur-[2px] transition-opacity lg:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[288px] flex-col border-r seam bg-bench-1 transition-[transform,width] duration-200 ease-out lg:static lg:translate-x-0 ${collapsed ? 'lg:w-[76px]' : 'lg:w-[268px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* topo: marca */}
        <div className={`flex h-[68px] items-center border-b seam ${collapsed ? 'justify-center px-0' : 'justify-between px-5'}`}>
          {collapsed ? (
            <img src="/brand/mark-light.png" alt="Deepcar" className="h-8 w-8 object-contain" draggable={false} />
          ) : (
            <img src="/brand/logo-h-light.png" alt="Deepcar" className="h-7 object-contain" draggable={false} />
          )}
          <button onClick={onCloseMobile} aria-label="Fechar menu" data-tip="Fechar menu" className="grid h-9 w-9 place-items-center rounded-md text-ink-3 hover:bg-bench-3 hover:text-ink-1 lg:hidden">
            <X size={18} />
          </button>
        </div>

        {/* navegação */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {!collapsed && (
            <p className="code mb-2 px-4 text-[10.5px] uppercase tracking-[0.2em] text-ink-4">Sistemas</p>
          )}
          <ul className="space-y-1">
            {NAV.map((entry) =>
              entry.kind === 'leaf' ? (
                <li key={entry.key}><LeafItem leaf={entry} collapsed={collapsed} /></li>
              ) : (
                <li key={entry.label}>
                  <GroupItem
                    group={entry}
                    collapsed={collapsed}
                    isOpen={!!open[entry.label]}
                    onToggle={() => setOpen((o) => ({ ...o, [entry.label]: !o[entry.label] }))}
                    activePath={loc.pathname}
                  />
                </li>
              ),
            )}
          </ul>
        </nav>

        {/* rodapé: conta */}
        <div className="border-t seam p-3">
          {session?.papel === 'admin' && !collapsed && (
            <Link
              to="/admin"
              data-tip="Usuários e chaves de API"
              className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-ink-3 hover:bg-bench-3 hover:text-ink-1"
            >
              <ShieldCheck size={16} /> Administração
            </Link>
          )}
          <NavLink
            to="/app/conta"
            data-tip="Sua conta e preferências"
            data-tip-side={collapsed ? 'right' : 'top'}
            className={`nav-item h-auto py-2.5 ${collapsed ? 'justify-center px-0' : ''} ${contaAtiva ? 'nav-active' : ''}`}
          >
            {contaAtiva && !collapsed && <TracePad />}
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full border seam-strong bg-bench-3 text-ink-2">
              <UserRound size={17} />
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[14px] text-ink-1">{session?.nome ?? 'Conta'}</span>
                <span className="block truncate text-[12px] text-ink-3">{session?.oficina ?? 'Minha oficina'}</span>
              </span>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); sair() }}
                aria-label="Sair"
                data-tip="Sair da conta neste dispositivo"
                className="grid h-8 w-8 place-items-center rounded-md text-ink-4 hover:bg-bench-3 hover:text-fault"
              >
                <LogOut size={16} />
              </button>
            )}
          </NavLink>

          <button
            onClick={onToggleCollapsed}
            className="mt-2 hidden h-9 w-full items-center justify-center gap-2 rounded-md text-[12px] text-ink-4 hover:bg-bench-3 hover:text-ink-2 lg:flex"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            data-tip={collapsed ? 'Expandir o menu' : 'Recolher o menu para ganhar espaço na tela'}
            data-tip-side={collapsed ? 'right' : 'top'}
          >
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /> Recolher</>}
          </button>
        </div>
      </aside>
    </>
  )
}

function LeafItem({ leaf, collapsed, nested = false }: { leaf: NavLeaf; collapsed: boolean; nested?: boolean }) {
  const Icon = leaf.icon
  return (
    <NavLink
      to={leaf.to}
      aria-label={leaf.label}
      data-tip={collapsed ? `${leaf.label}: ${SECTION_META[leaf.key].descricao}` : SECTION_META[leaf.key].descricao}
      data-tip-side="right"
      className={({ isActive }) =>
        [
          'nav-item',
          isActive ? 'nav-active' : '',
          collapsed ? 'justify-center px-0' : '',
          nested && !collapsed ? 'h-[42px] pl-[46px] text-[14px]' : '',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && <TracePad />}
          <Icon size={nested ? 17 : 19} className="nav-icon" />
          {!collapsed && <span>{leaf.label}</span>}
        </>
      )}
    </NavLink>
  )
}

function GroupItem({
  group, collapsed, isOpen, onToggle, activePath,
}: { group: NavGroup; collapsed: boolean; isOpen: boolean; onToggle: () => void; activePath: string }) {
  const Icon = group.icon
  const childActive = group.children.some((c) => activePath.startsWith(c.to))

  // recolhido: filhos viram ícones diretos, sem cabeçalho
  if (collapsed) {
    return (
      <ul className="space-y-1">
        {group.children.map((c) => <li key={c.key}><LeafItem leaf={c} collapsed /></li>)}
      </ul>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        data-tip={isOpen ? 'Recolher opções de injeção' : 'Injeção leve (Otto e flex) e diesel'}
        data-tip-side="right"
        className={`nav-item w-full ${childActive && !isOpen ? 'nav-active' : ''}`}
      >
        <Icon size={19} className="nav-icon" style={childActive ? { color: 'var(--color-trace)' } : undefined} />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown size={16} className={`text-ink-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <ul className="overflow-hidden space-y-0.5 pt-0.5">
          {group.children.map((c) => <li key={c.key}><LeafItem leaf={c} collapsed={false} nested /></li>)}
        </ul>
      </div>
    </div>
  )
}

function groupsFor(path: string, onlyTrue = false) {
  const out: Record<string, boolean> = {}
  for (const e of NAV) {
    if (e.kind === 'group') {
      const hit = e.children.some((c) => path.startsWith(c.to))
      if (hit || !onlyTrue) out[e.label] = hit
    }
  }
  return out
}
