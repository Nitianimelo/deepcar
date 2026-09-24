import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ScanLine } from 'lucide-react'
import { Phone, Tablet } from '../components/DeviceMockups'
import { AppStoreBadge, PlayStoreBadge } from '../components/StoreBadges'
import { CarBlueprint } from '../components/CarBlueprint'
import { MarcasStrip } from '../components/MarcasStrip'
import { formatarPlaca, placaValida } from '../lib/placa'
import { PLANOS_VENDA, type Ciclo } from '../data/planos'
import { SeletorCiclo } from '../components/SeletorCiclo'
import { GridBeam } from '../components/landing/GridBeam'
import { Reveal } from '../components/landing/Reveal'
import { CardPlano } from '../components/landing/CardPlano'

export default function Landing() {
  return (
    <div className="landing min-h-full bg-pit text-ink-1">
      <Header />
      <Hero />
      <Cobertura />
      <BuscaPlaca />
      <Planos />
      <Footer />
    </div>
  )
}

/* ── Cabeçalho ─────────────────────────────────────────────────────── */
function Header() {
  const ref = useRef<HTMLElement>(null)

  // um só ouvinte de rolagem, agrupado por quadro: grava o progresso numa variável CSS e marca o cabeçalho depois de rolar
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const medir = () => {
      raf = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      el.style.setProperty('--progresso', String(max > 0 ? Math.min(1, window.scrollY / max) : 0))
      el.classList.toggle('is-rolado', window.scrollY > 12)
    }
    const agendar = () => { if (!raf) raf = requestAnimationFrame(medir) }
    medir()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', agendar); window.removeEventListener('resize', agendar) }
  }, [])

  return (
    <header ref={ref} className="landing-header sticky top-0 z-30 border-b seam bg-pit/85 backdrop-blur-md">
      <span aria-hidden="true" className="landing-progresso" />
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-4 px-4 sm:gap-8 sm:px-8">
        <a href="#topo" className="flex items-center"><img src="/brand/logo-h-light.png" alt="Deepcar" className="h-6 sm:h-7" draggable={false} /></a>
        <nav className="ml-6 hidden items-center gap-7 text-[14px] text-ink-2 md:flex">
          <a href="#plataforma" className="hover:text-ink-1">Plataforma</a>
          <a href="#cobertura" className="hover:text-ink-1">Cobertura</a>
          <a href="#planos" className="hover:text-ink-1">Planos</a>
        </nav>
        <div className="ml-auto flex flex-none items-center gap-1.5 sm:gap-2.5">
          <Link to="/login" className="btn-ghost inline-flex flex-none items-center !px-3 text-[14px] sm:!px-4">Entrar</Link>
          <Link to="/cadastro" className="btn-cta inline-flex h-10 flex-none items-center whitespace-nowrap px-3 text-[13.5px] sm:px-4 sm:text-[14px]">Criar conta grátis</Link>
        </div>
      </div>
    </header>
  )
}

/* ── Primeira dobra ────────────────────────────────────────────────── */
function Hero() {
  return (
    <section id="topo" className="relative overflow-hidden">
      {/* luzes derivando devagar + grade com pulsos de corrente (GridBeam), dissolvida nas bordas */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="luz-a absolute -inset-[10%]" style={{ background: 'radial-gradient(1100px 700px at 18% 10%, rgba(14,58,118,0.55) 0%, transparent 60%)' }} />
        <div className="luz-b absolute -inset-[10%]" style={{ background: 'radial-gradient(800px 600px at 90% 80%, rgba(74,141,255,0.14) 0%, transparent 60%)' }} />
      </div>
      <GridBeam celula={64} duracao={6} className="grade-mascara" />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:gap-4 lg:pb-24 lg:pt-24">
        <div id="plataforma" className="max-w-[560px]">
          <Reveal as="p" index={0} className="code text-[12px] uppercase tracking-[0.24em] text-trace-hi">Plataforma Deepcar</Reveal>
          <Reveal as="h1" index={1} className="mt-4 text-[clamp(2.4rem,5.2vw,4.2rem)] font-semibold leading-[1.02] tracking-[-0.025em]">
            Inteligência automotiva para a sua oficina.
          </Reveal>
          <Reveal as="p" index={2} className="mt-6 max-w-[48ch] text-[17px] leading-relaxed text-ink-2">
            Informações técnicas de mais de 15 mil modelos de veículos: só precisa digitar a placa do carro.
            Injeção eletrônica, elétrica, ABS e câmbio. No celular, no tablet ou no computador da sua oficina.
          </Reveal>
          <Reveal index={3} className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/cadastro" className="btn-cta inline-flex items-center gap-2 px-6">
              Criar conta grátis <ArrowRight size={17} />
            </Link>
            <a href="#cobertura" className="btn-ghost inline-flex h-12 items-center px-5">Ver cobertura</a>
          </Reveal>

          <Reveal index={4} className="mt-12">
            <p className="text-[14px] text-ink-3">Baixe nosso app</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <AppStoreBadge />
              <PlayStoreBadge />
            </div>
          </Reveal>
        </div>

        {/* dispositivos: tablet ao fundo sangrando pela direita, celular na frente */}
        {/* a posição fica no invólucro; a flutuação anima o aparelho, para os dois transforms não brigarem */}
        <Reveal index={2} className="relative mx-auto h-[540px] w-full max-w-[420px] sm:h-[600px] sm:max-w-none lg:-mr-24 lg:h-[640px] lg:w-[820px] lg:max-w-none">
          <div className="absolute right-0 top-2 hidden sm:block lg:right-0 lg:top-4">
            <Tablet scale={0.52} className="flutua-2" />
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0 lg:left-0">
            <Phone scale={0.55} className="flutua drop-shadow-2xl" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ── Busca por placa ───────────────────────────────────────────────── */
function BuscaPlaca() {
  const passos = [
    ['Digite a placa', 'Padrão antigo ou Mercosul, no celular ou no computador.'],
    ['Veja o veículo', 'Montadora, modelo, ano, combustível e motorização na hora.'],
    ['Abra o manual técnico', 'Só os sistemas compatíveis com aquele carro, sem procurar em lista.'],
  ]
  return (
    <section id="placa" className="relative overflow-hidden border-t seam">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(800px 500px at 85% 20%, rgba(14,58,118,0.45) 0%, transparent 60%)' }}
      />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] lg:gap-14 lg:py-28">
        <Reveal>
          <p className="code text-[12px] uppercase tracking-[0.24em] text-trace-hi">Busca por placa</p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
            O manual técnico certo em um toque.
          </h2>
          <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
            Em vez de garimpar o modelo no catálogo, digite a placa. O Deepcar identifica montadora, modelo, ano e
            motorização e já mostra os manuais técnicos daquele veículo — injeção, ABS, elétrica e câmbio.
            Menos tempo procurando, mais tempo com o carro no elevador.
          </p>

          <ol className="mt-9 space-y-5 border-t seam pt-8">
            {passos.map(([titulo, texto], i) => (
              <Reveal as="li" key={titulo} index={i + 1} className="flex gap-4">
                <span className="code mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full border border-trace/30 bg-trace/10 text-[12px] text-trace-hi">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-[15.5px] font-medium text-ink-1">{titulo}</span>
                  <span className="block text-[14.5px] leading-relaxed text-ink-3">{texto}</span>
                </span>
              </Reveal>
            ))}
          </ol>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/cadastro" className="btn-cta inline-flex items-center gap-2 px-6">
              Testar com uma placa <ArrowRight size={17} />
            </Link>
          </div>
        </Reveal>

        {/* foto da oficina: sem moldura, sangrando pela direita e dissolvendo no fundo */}
        <Reveal as="figure" index={1} className="relative -mx-5 overflow-hidden sm:-mx-8 lg:mx-0 lg:-mr-[max(0px,calc((100vw-1200px)/2+2rem))] lg:rounded-l-[28px]">
          <picture>
            <source type="image/webp" srcSet="/landing/oficina-placa-900.webp 900w, /landing/oficina-placa-1536.webp 1536w" sizes="(min-width: 1024px) 58vw, 100vw" />
            <img
              src="/landing/oficina-placa-1536.jpg"
              srcSet="/landing/oficina-placa-900.jpg 900w, /landing/oficina-placa-1536.jpg 1536w"
              sizes="(min-width: 1024px) 58vw, 100vw"
              width={1536}
              height={1024}
              loading="lazy"
              decoding="async"
              alt="Mecânico na oficina consultando o Deepcar no celular, com a lista de montadoras aberta"
              className="block h-[360px] w-full object-cover object-[62%_45%] sm:h-[460px] lg:h-[600px]"
            />
          </picture>
          {/* a foto se dissolve no fundo em vez de terminar numa linha reta */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(to top, var(--color-pit) 0%, rgba(21,27,36,.3) 12%, transparent 30%)' }}
          />
          {/* só no desktop, onde o texto fica ao lado: a borda esquerda encosta no fundo da coluna de texto */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden lg:block"
            style={{ background: 'linear-gradient(90deg, var(--color-pit) 0%, rgba(21,27,36,.5) 10%, transparent 34%)' }}
          />
        </Reveal>
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
          <Reveal>
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
          </Reveal>

          <Reveal index={1} className="relative rounded-2xl border seam bg-bench-1 p-6 sm:p-8">
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
                <button type="submit" className="btn-cta px-6" disabled={!ok}>Testar gratuitamente</button>
              </form>
              <p className="code mt-3 text-[11.5px] text-ink-4">Placas Mercosul e padrão antigo. Sem cartão de crédito.</p>
            </div>
          </Reveal>
        </div>
      </div>

      {/* montadoras */}
      <Reveal className="pb-20 pt-8 lg:pb-28">
        <p className="code mb-8 text-center text-[11px] uppercase tracking-[0.24em] text-ink-4">Montadoras no catálogo</p>
        <MarcasStrip />
      </Reveal>
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

/* ── Planos ────────────────────────────────────────────────────────── */
function Planos() {
  const planos = PLANOS_VENDA
  const [ciclo, setCiclo] = useState<Ciclo>('anual')
  return (
    <section id="planos" className="relative overflow-hidden border-t seam">
      {/* fundo: a mesma grade de corrente do topo, mais fraca e concentrada atrás dos cartões */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(900px 520px at 50% 62%, rgba(14,58,118,0.42) 0%, transparent 65%)' }}
      />
      <GridBeam celula={72} duracao={8} forca={0.8} className="grade-mascara-centro" />

      <div className="relative mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="code text-[12px] uppercase tracking-[0.24em] text-trace-hi">Mensal ou anual</p>
            <h2 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.02em]">Planos</h2>
          </div>
          <p className="max-w-[46ch] text-[15px] text-ink-3">
            A conta gratuita abre na hora, sem cartão, para você conhecer o acervo por dentro.
          </p>
        </Reveal>

        <Reveal index={1} className="mt-10 flex justify-center">
          <SeletorCiclo ciclo={ciclo} onChange={setCiclo} />
        </Reveal>

        <div className="mx-auto mt-8 grid max-w-[920px] items-stretch gap-5 md:grid-cols-2">
          {planos.map((p, i) => (
            <Reveal key={p.nome} index={i + 1} className="relative">
              {p.destaque && <span aria-hidden="true" className="plano-halo" />}
              <CardPlano p={p} ciclo={ciclo} />
            </Reveal>
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
          <span className="code text-[12px] text-ink-4">© {new Date().getFullYear()} Deepcar</span>
          <Link to="/privacidade" className="text-[12.5px] text-ink-4 hover:text-ink-2">Privacidade</Link>
        </div>
        <div className="flex flex-wrap gap-3">
          <AppStoreBadge />
          <PlayStoreBadge />
        </div>
      </div>
    </footer>
  )
}
