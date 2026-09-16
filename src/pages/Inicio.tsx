// Tela inicial da plataforma: os dois jeitos de começar (placa ou busca) e as últimas consultas.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, FileText, ScanLine, Search } from 'lucide-react'
import { getSession } from '../lib/auth'
import { formatarPlaca, normalizarPlaca, placaValida } from '../lib/placa'
import { limparRecentes, useRecentes, type Recente } from '../lib/recentes'

export default function Inicio() {
  const primeiroNome = getSession()?.nome?.split(' ')[0]
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <h1 className="text-[26px] font-semibold tracking-tight sm:text-3xl">{saudacao()}{primeiroNome ? `, ${primeiroNome}` : ''}.</h1>
      <p className="mt-1 text-ink-3">Consulte pela placa ou procure um esquema.</p>

      {/* bancada: placa de um lado, busca do outro, no mesmo painel */}
      <div className="mt-7 grid overflow-hidden rounded-2xl border seam bg-bench-2 md:grid-cols-[1.05fr_1fr]">
        <ConsultaPlaca />
        <BuscaTexto />
      </div>

      <UltimasConsultas />
    </div>
  )
}

/** "Bom dia" / "Boa tarde" / "Boa noite" pelo relógio de quem abre. */
function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function Rotulo({ children, dica }: { children: string; dica: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="code flex-none text-[11px] uppercase tracking-[0.2em] text-ink-4">{children}</span>
      <span className="hidden truncate text-[12.5px] text-ink-4 sm:block">{dica}</span>
    </div>
  )
}

function ConsultaPlaca() {
  const nav = useNavigate()
  const [placa, setPlaca] = useState('')
  const ok = placaValida(placa)

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (ok) nav(`/app/veiculo/${normalizarPlaca(placa)}`)
  }

  return (
    <form onSubmit={enviar} className="min-w-0 p-5 sm:p-6">
      <Rotulo dica="Mercosul ou padrão antigo">Consulta por placa</Rotulo>
      {/* a placa em si: faixa azul à esquerda como na Mercosul, letras grandes em mono */}
      <div className="relative mt-3 flex h-16 items-stretch overflow-hidden rounded-xl border seam-strong bg-well transition-[border-color,box-shadow] focus-within:border-trace/60 focus-within:shadow-[var(--glow)]">
        <span aria-hidden="true" className="code grid w-12 flex-none place-items-center border-r seam bg-navy text-[10px] font-medium tracking-[0.2em] text-white/85">BR</span>
        <input
          className="code w-full min-w-0 flex-1 bg-transparent px-4 text-[22px] uppercase tracking-[0.16em] text-ink-1 outline-none placeholder:text-ink-4/70 sm:text-[24px] sm:tracking-[0.18em]"
          placeholder="ABC-1D23"
          size={7}
          value={placa}
          onChange={(e) => setPlaca(formatarPlaca(e.target.value))}
          autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={8}
          aria-label="Placa do veículo"
        />
        <button
          type="submit"
          disabled={!ok}
          aria-label="Consultar placa"
          data-tip={ok ? 'Ver o veículo e os esquemas compatíveis' : 'Digite a placa completa'}
          data-tip-kbd={ok ? 'Enter' : undefined}
          className="m-2 grid w-11 flex-none place-items-center rounded-lg bg-trace text-white transition-[filter,opacity] hover:brightness-110 disabled:opacity-30 disabled:hover:brightness-100"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  )
}

function BuscaTexto() {
  const nav = useNavigate()
  const [q, setQ] = useState('')

  function enviar(e: FormEvent) {
    e.preventDefault()
    nav(q.trim() ? `/app/busca?q=${encodeURIComponent(q.trim())}` : '/app/busca')
  }

  return (
    <form onSubmit={enviar} className="min-w-0 border-t seam-soft p-5 sm:p-6 md:border-l md:border-t-0">
      <Rotulo dica="Modelo, motor, código ou sistema">Buscar esquema</Rotulo>
      <label className="relative mt-3 block">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
        <input
          className="field h-16 pl-11 pr-14 text-[16px]"
          placeholder="hilux diesel, abs onix, bosch me7…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar esquema"
        />
        <button
          type="submit"
          aria-label="Buscar"
          data-tip="Procurar em todos os sistemas"
          data-tip-kbd="Enter"
          className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg border seam bg-bench-3 text-ink-2 transition-colors hover:border-trace/40 hover:text-ink-1"
        >
          <ArrowRight size={18} />
        </button>
      </label>
    </form>
  )
}

function UltimasConsultas() {
  const recentes = useRecentes()

  return (
    <section className="mt-9">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Últimas consultas</h2>
        {recentes.length > 0 && (
          <button
            type="button"
            onClick={() => { if (confirm('Apagar o histórico de consultas deste navegador?')) limparRecentes() }}
            className="text-[12.5px] text-ink-4 hover:text-fault"
          >
            Limpar
          </button>
        )}
      </div>

      {recentes.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed seam px-5 py-8 text-center text-[14px] text-ink-4">
          Nada por aqui ainda. O que você consultar fica guardado neste navegador.
        </p>
      ) : (
        <ul className="mt-3 overflow-hidden rounded-2xl border seam bg-bench-2">
          {recentes.map((r) => <ItemRecente key={r.tipo === 'placa' ? `p-${r.placa}` : `e-${r.id}`} r={r} />)}
        </ul>
      )}
    </section>
  )
}

function ItemRecente({ r }: { r: Recente }) {
  const placa = r.tipo === 'placa'
  const Icone = placa ? ScanLine : FileText
  return (
    <li className="border-t seam-soft first:border-t-0">
      <Link
        to={placa ? `/app/veiculo/${r.placa}` : `/app/esquema/${r.id}`}
        className="group flex items-center gap-3.5 px-5 py-3.5 hover:bg-bench-3 sm:px-6"
      >
        <Icone size={16} className="flex-none text-ink-4 group-hover:text-trace" />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[14.5px] text-ink-1">{r.titulo}</span>
          <span className="code mt-0.5 block truncate text-[12px] text-ink-4">{r.detalhe}</span>
        </span>
        <span className="code flex-none text-[11.5px] text-ink-4">{quando(r.em)}</span>
        <ChevronRight size={15} className="hidden flex-none text-ink-4 group-hover:text-trace sm:block" />
      </Link>
    </li>
  )
}

/** "agora", "há 12 min", "há 3 h", "ontem", "14/09" */
function quando(em: number) {
  const min = Math.floor((Date.now() - em) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 24 * 60) return `há ${Math.floor(min / 60)} h`
  const dias = Math.floor(min / (24 * 60))
  if (dias === 1) return 'ontem'
  return new Date(em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
