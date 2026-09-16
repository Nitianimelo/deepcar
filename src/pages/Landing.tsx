import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ScanLine } from 'lucide-react'
import { Phone, Tablet } from '../components/DeviceMockups'
import { AppStoreBadge, PlayStoreBadge } from '../components/StoreBadges'
import { CarBlueprint } from '../components/CarBlueprint'
import { MarcasStrip } from '../components/MarcasStrip'
import { formatarPlaca, placaValida } from '../lib/placa'
import { linkSuporte, MINUTOS_FREE } from '../lib/plano'

export default function Landing() {
  return (
    <div className="min-h-full bg-pit text-ink-1">
      <Header />
      <Hero />
      <Cobertura />
      <Planos />
      <Footer />
    </div>
  )
}

/* ── Cabeçalho ─────────────────────────────────────────────────────── */
function Header() {
  return (
    <header className="sticky top-0 z-30 border-b seam bg-pit/85 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-8 px-5 sm:px-8">
        <a href="#topo" className="flex items-center"><img src="/brand/logo-h-light.png" alt="Deepcar" className="h-7" draggable={false} /></a>
        <nav className="ml-6 hidden items-center gap-7 text-[14px] text-ink-2 md:flex">
          <a href="#plataforma" className="hover:text-ink-1">Plataforma</a>
          <a href="#cobertura" className="hover:text-ink-1">Cobertura</a>
          <a href="#planos" className="hover:text-ink-1">Planos</a>
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <Link to="/login" className="btn-ghost hidden items-center sm:inline-flex">Entrar</Link>
          <Link to="/cadastro" className="btn-primary inline-flex h-10 items-center px-4 text-[14px]">Criar conta grátis</Link>
        </div>
      </div>
    </header>
  )
}

/* ── Primeira dobra ────────────────────────────────────────────────── */
function Hero() {
  return (
    <section id="topo" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 700px at 18% 10%, rgba(14,58,118,0.55) 0%, transparent 60%), radial-gradient(800px 600px at 90% 80%, rgba(74,141,255,0.12) 0%, transparent 60%)',
        }}
      />
      <div className="schematic-grid pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:gap-4 lg:pb-24 lg:pt-24">
        <div id="plataforma" className="max-w-[560px]">
          <p className="code text-[12px] uppercase tracking-[0.24em] text-trace-hi">Plataforma Deepcar</p>
          <h1 className="mt-4 text-[clamp(2.4rem,5.2vw,4.2rem)] font-semibold leading-[1.02] tracking-[-0.025em]">
            Inteligência automotiva para a sua oficina.
          </h1>
          <p className="mt-6 max-w-[48ch] text-[17px] leading-relaxed text-ink-2">
            Informações técnicas de mais de 15 mil modelos de veículos: só precisa digitar a placa do carro.
            Injeção eletrônica, elétrica, ABS e câmbio. No celular, no tablet ou no computador da sua oficina.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/cadastro" className="btn-primary inline-flex items-center gap-2 px-6">
              Criar conta grátis <ArrowRight size={17} />
            </Link>
            <a href="#cobertura" className="btn-ghost inline-flex h-12 items-center px-5">Ver cobertura</a>
          </div>

          <div className="mt-12">
            <p className="text-[14px] text-ink-3">Baixe nosso app</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <AppStoreBadge />
              <PlayStoreBadge />
            </div>
          </div>
        </div>

        {/* dispositivos: tablet ao fundo sangrando pela direita, celular na frente */}
        <div className="relative mx-auto h-[540px] w-full max-w-[420px] sm:h-[600px] sm:max-w-none lg:-mr-24 lg:h-[640px] lg:w-[820px] lg:max-w-none">
          <Tablet scale={0.52} className="absolute right-0 top-2 hidden sm:block lg:right-0 lg:top-4" />
          <Phone scale={0.55} className="absolute bottom-0 left-1/2 -translate-x-1/2 drop-shadow-2xl sm:left-4 sm:translate-x-0 lg:left-0" />
        </div>
      </div>
    </section>
  )
}

/* ── Segunda dobra ─────────────────────────────────────────────────── */
function Cobertura() {
  const nav = useNavigate()
  const [placa, setPlaca] = useState('')
  const ok = placaValida(placa)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ok) return
    // quem chega pela placa ainda não tem conta: cria e cai direto no veículo
    nav('/cadastro', { state: { from: `/app/veiculo/${placa.replace('-', '')}` } })
  }

  return (
    <section id="cobertura" className="relative border-t seam">
      <div className="mx-auto max-w-[1200px] px-5 pb-12 pt-20 sm:px-8 lg:pt-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
              Toda a informação que você precisa.
            </h2>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
              Uma base construída para a realidade da oficina brasileira: carros populares,
              picapes, utilitários, caminhões e importados.
            </p>

            <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-8 border-t seam pt-8">
              <Numero valor="60" rotulo="montadoras" />
              <Numero valor="98%" rotulo="da frota nacional" />
            </dl>
          </div>

          <div className="relative rounded-2xl border seam bg-bench-1 p-6 sm:p-8">
            <CarBlueprint className="pointer-events-none absolute inset-x-6 top-4 opacity-[0.28]" />
            <div className="relative pt-40 sm:pt-48">
              <h3 className="text-[22px] font-semibold tracking-tight">Busque o que você precisa pela placa do veículo.</h3>
              <p className="mt-2 text-[15px] text-ink-3">Marca, modelo, ano e os sistemas disponíveis em segundos.</p>
              <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
                <label className="relative flex-1">
                  <ScanLine size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input
                    className="field code pl-12 text-[17px] uppercase tracking-[0.14em]"
                    placeholder="ABC-1D23"
                    value={placa}
                    onChange={(e) => setPlaca(formatarPlaca(e.target.value))}
                    autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={8}
                    aria-label="Placa do veículo"
                  />
                </label>
                <button type="submit" className="btn-primary px-6" disabled={!ok}>Testar gratuitamente</button>
              </form>
              <p className="code mt-3 text-[11.5px] text-ink-4">Placas Mercosul e padrão antigo. Sem cartão de crédito.</p>
            </div>
          </div>
        </div>
      </div>

      {/* montadoras */}
      <div className="pb-20 pt-8 lg:pb-28">
        <p className="code mb-8 text-center text-[11px] uppercase tracking-[0.24em] text-ink-4">Montadoras no catálogo</p>
        <MarcasStrip />
      </div>
    </section>
  )
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div>
      <dd className="code whitespace-nowrap text-[clamp(2rem,4vw,3.4rem)] font-medium leading-none tracking-tight text-ink-1">{valor}</dd>
      <dt className="mt-3 text-[14px] text-ink-2 sm:text-[15px]">{rotulo}</dt>
    </div>
  )
}

/* ── Planos (sem valores por enquanto) ─────────────────────────────── */
function Planos() {
  const planos = [
    {
      nome: 'Oficina',
      para: 'Para quem está começando a consultar esquemas digitalmente.',
      itens: ['1 usuário', 'Consulta por placa', 'Injeção leve e elétrica', 'Acesso pelo app'],
      cta: 'Criar conta grátis',
      destino: '/cadastro',
      destaque: false,
    },
    {
      nome: 'Profissional',
      para: 'Para a oficina que atende de tudo, do popular ao diesel.',
      itens: ['Até 5 usuários', 'Todos os sistemas', 'Injeção diesel e câmbio', 'Navegação por componente e minimapa', 'Modo leitura e impressão'],
      cta: 'Criar conta grátis',
      destino: '/cadastro',
      destaque: true,
    },
    {
      nome: 'Rede',
      para: 'Para redes, concessionárias e centros de formação.',
      itens: ['Usuários ilimitados', 'Várias unidades', 'Gestão centralizada', 'Suporte dedicado'],
      cta: 'Falar com a equipe',
      destino: linkSuporte('Olá! Quero falar sobre o plano Rede do Deepcar.'),
      destaque: false,
    },
  ]
  return (
    <section id="planos" className="border-t seam">
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.02em]">Planos</h2>
          <p className="max-w-[46ch] text-[15px] text-ink-3">
            Valores em breve. A conta gratuita abre na hora e dá {MINUTOS_FREE} minutos de acesso para você
            conhecer o acervo por dentro.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {planos.map((p) => (
            <div
              key={p.nome}
              className={`flex flex-col rounded-2xl border p-7 ${p.destaque ? 'border-trace/50 bg-bench-2' : 'seam bg-bench-1'}`}
              style={p.destaque ? { boxShadow: '0 0 0 1px rgba(74,141,255,.25), 0 24px 60px rgba(29,85,199,.18)' } : undefined}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[22px] font-semibold tracking-tight">{p.nome}</h3>
                {p.destaque && <span className="code rounded-full bg-trace/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-trace-hi">Mais usado</span>}
              </div>
              <p className="mt-2 min-h-[48px] text-[14px] leading-relaxed text-ink-3">{p.para}</p>
              <ul className="mt-6 space-y-2.5 text-[14.5px]">
                {p.itens.map((i) => (
                  <li key={i} className="flex items-start gap-2.5 text-ink-2"><Check size={16} className="mt-[3px] flex-none text-trace" /> {i}</li>
                ))}
              </ul>
              {p.destino.startsWith('/') ? (
                <Link
                  to={p.destino}
                  className={`mt-8 inline-flex h-12 items-center justify-center rounded-[10px] text-[15px] font-medium ${p.destaque ? 'btn-primary' : 'btn-ghost !h-12'}`}
                >
                  {p.cta}
                </Link>
              ) : (
                <a
                  href={p.destino}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-8 inline-flex h-12 items-center justify-center rounded-[10px] text-[15px] font-medium ${p.destaque ? 'btn-primary' : 'btn-ghost !h-12'}`}
                >
                  {p.cta}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Rodapé ────────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t seam">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-4">
          <img src="/brand/logo-h-light.png" alt="Deepcar" className="h-6 opacity-80" draggable={false} />
          <span className="code text-[12px] text-ink-4">© {new Date().getFullYear()} Deepcar · Grupo Arcco</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <AppStoreBadge />
          <PlayStoreBadge />
        </div>
      </div>
    </footer>
  )
}
