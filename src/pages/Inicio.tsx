// Tela inicial da plataforma: os dois jeitos de começar (placa ou busca) e as últimas consultas.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, FileText, History, ScanLine, Search, Trash2 } from 'lucide-react'
import { getSession } from '../lib/auth'
import { formatarPlaca, normalizarPlaca, placaValida } from '../lib/placa'
import { limparRecentes, useRecentes, type Recente } from '../lib/recentes'

export default function Inicio() {
  const primeiroNome = getSession()?.nome?.split(' ')[0]

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Início</p>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight sm:text-3xl">
        {primeiroNome ? `Olá, ${primeiroNome}.` : 'Olá.'} O que vamos consultar?
      </h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ConsultaPlaca />
        <BuscaTexto />
      </div>

      <UltimasConsultas />
    </div>
  )
}

function Cartao({ icone, titulo, descricao, children }: { icone: React.ReactNode; titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-2xl border seam bg-bench-2 p-5 sm:p-6">
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-trace/30 bg-trace/10 text-trace-hi">{icone}</span>
      <h2 className="mt-4 text-[19px] font-semibold tracking-tight">{titulo}</h2>
      <p className="mt-1 text-[14px] text-ink-3">{descricao}</p>
      <div className="mt-5">{children}</div>
    </section>
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
    <Cartao icone={<ScanLine size={20} />} titulo="Consultar por placa" descricao="Marca, modelo, ano e os esquemas compatíveis com o veículo.">
      <form onSubmit={enviar} className="flex flex-col gap-2.5 sm:flex-row">
        <input
          className="field code min-w-0 text-[17px] uppercase tracking-[0.14em] sm:flex-1"
          placeholder="ABC-1D23"
          value={placa}
          onChange={(e) => setPlaca(formatarPlaca(e.target.value))}
          autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={8}
          aria-label="Placa do veículo"
        />
        <button type="submit" className="btn-primary inline-flex items-center justify-center gap-2 px-5" disabled={!ok}>
          Consultar <ArrowRight size={16} />
        </button>
      </form>
    </Cartao>
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
    <Cartao icone={<Search size={20} />} titulo="Buscar esquema" descricao="Por modelo, motor, sistema ou palavra-chave.">
      <form onSubmit={enviar} className="flex flex-col gap-2.5 sm:flex-row">
        <input
          className="field min-w-0 sm:flex-1"
          placeholder="Ex.: gol 1.6, hilux diesel, abs onix"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar esquema"
        />
        <button type="submit" className="btn-primary inline-flex items-center justify-center gap-2 px-5">
          Buscar <ArrowRight size={16} />
        </button>
      </form>
    </Cartao>
  )
}

function UltimasConsultas() {
  const recentes = useRecentes()

  return (
    <section className="mt-6 rounded-2xl border seam bg-bench-2">
      <div className="flex items-center justify-between gap-3 border-b seam-soft px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 font-medium"><History size={17} className="text-trace" /> Últimas consultas</h2>
        {recentes.length > 0 && (
          <button
            type="button"
            onClick={() => { if (confirm('Apagar o histórico de consultas deste navegador?')) limparRecentes() }}
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-4 hover:text-fault"
          >
            <Trash2 size={14} /> Limpar
          </button>
        )}
      </div>

      {recentes.length === 0 ? (
        <p className="px-5 py-10 text-center text-[14px] text-ink-3 sm:px-6">
          As placas consultadas e os esquemas abertos aparecem aqui.
        </p>
      ) : (
        <ul>
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
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg border seam bg-bench-1 text-ink-3 group-hover:text-trace-hi">
          <Icone size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[14.5px] font-medium text-ink-1">{r.titulo}</span>
          <span className="block break-words text-[13px] text-ink-3">
            <span className={placa ? 'code' : ''}>{r.detalhe}</span>
            <span className="text-ink-4"> · {quando(r.em)}</span>
          </span>
        </span>
        <ChevronRight size={16} className="flex-none text-ink-4 group-hover:text-trace" />
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
