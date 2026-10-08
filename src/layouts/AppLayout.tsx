import { BotaoWhatsapp } from '../components/landing/BotaoWhatsapp'
import { registrar as anotar } from '../lib/log'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { PlateSearch } from '../components/PlateSearch'
import { PaletaBusca } from '../components/PaletaBusca'
import { Sidebar } from '../components/Sidebar'
import { AvisoTopo, SeloTeste } from '../components/LimiteFree'
import { BoasVindas, ConviteMomento } from '../components/Funil'
import { useSessao } from '../lib/auth'
import { useLimiteFree } from '../lib/plano'
import { podePlaca, SessaoAtual, TesteAcabou } from '../lib/acesso'

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
  if (limite.perdida) {
    return <Navigate to="/login" replace state={{ from: loc.pathname, aviso: 'Sua sessão foi encerrada: a conta entrou em outro aparelho além do limite do plano, ou foi desconectada pelo suporte. Entre de novo para continuar.' }} />
  }
  // a mais nova que se sabe: a do relógio é reconferida no foco e em intervalos
  const atual = limite.sessao ?? session

  return (
    <SessaoAtual.Provider value={atual}>
    <TesteAcabou.Provider value={limite.acabou}>
    <div className="flex h-full min-h-0">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* plano de teste no celular: o menu lateral fica fechado, então o convite sobe para o topo */}
        <AvisoTopo />
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
          {naoEInicio && podePlaca(atual) ? <PlateSearch className="flex-1 max-w-md" /> : <div className="flex-1" />}
          {naoEInicio && <div className="hidden flex-1 md:block" />}
          <PaletaBusca />

          <SeloTeste />
        </header>

        {/* folga no fim: o botão flutuante do WhatsApp não cobre o último item da lista */}
        <main className={`app-conteudo schematic-grid min-h-0 flex-1 overflow-y-auto ${loc.pathname.startsWith('/app/esquema') ? '' : 'pb-24'}`}>
          <Outlet />
        </main>
        {/* teste gratuito: boas-vindas na primeira entrada e convite depois de achar valor (components/Funil.tsx) */}
        <BoasVindas />
        <ConviteMomento />
        {/* fora do esquema: lá o canto de baixo é do visualizador (minimapa e zoom) */}
        {!loc.pathname.startsWith('/app/esquema') && (
          <BotaoWhatsapp
            mensagem={`Olá! Estou usando a Deepcar e preciso de ajuda. Minha conta é ${atual.email}.`}
            aoClicar={() => anotar('whatsapp', { onde: loc.pathname })}
          />
        )}
      </div>
    </div>
    </TesteAcabou.Provider>
    </SessaoAtual.Provider>
  )
}
