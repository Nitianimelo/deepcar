import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import { SECTION_META, type SectionKey } from '../data/nav'
import { esquemasDaSecao } from '../data/esquemas'

export default function SectionPage({ secao }: { secao: SectionKey }) {
  const meta = SECTION_META[secao]
  const todos = useMemo(() => esquemasDaSecao(secao), [secao])
  const [q, setQ] = useState('')
  const [montadora, setMontadora] = useState<string | null>(null)

  const montadoras = useMemo(() => Array.from(new Set(todos.map((e) => e.montadora))).sort(), [todos])

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    return todos.filter((e) => {
      if (montadora && e.montadora !== montadora) return false
      if (!t) return true
      return [e.montadora, e.modelo, e.motor, e.modulo, e.anos].join(' ').toLowerCase().includes(t)
    })
  }, [todos, q, montadora])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      {/* cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">
            {meta.trilha.join('  ›  ')}
          </p>
          <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight sm:text-3xl">{meta.titulo}</h1>
          <p className="mt-1 text-ink-3">{meta.descricao}</p>
        </div>
        <div className="code rounded-lg border seam bg-bench-2 px-3.5 py-2 text-[13px] text-ink-2">
          <span className="text-ink-1">{lista.length}</span> de {todos.length} esquemas
        </div>
      </div>

      {/* filtros */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
          <input
            className="field pl-11"
            placeholder="Modelo, motor, módulo ou ano"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Chip active={montadora === null} onClick={() => setMontadora(null)}>Todas</Chip>
          {montadoras.map((m) => (
            <Chip key={m} active={montadora === m} onClick={() => setMontadora(m === montadora ? null : m)}>{m}</Chip>
          ))}
        </div>
      </div>

      {/* lista */}
      <div className="mt-6 overflow-hidden rounded-xl border seam bg-bench-2">
        <div className="code hidden grid-cols-[1.5fr_1.2fr_1fr_0.8fr_160px] gap-4 border-b seam-soft px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-ink-4 md:grid">
          <span>Veículo</span><span>Módulo</span><span>Motor / sistema</span><span>Anos</span><span className="text-right">Conteúdo</span>
        </div>

        {lista.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-ink-2">Nenhum esquema encontrado.</p>
            <p className="mt-1 text-sm text-ink-4">Tente outro termo ou limpe o filtro de montadora.</p>
          </div>
        ) : (
          <ul>
            {lista.map((e, i) => (
              <li key={e.id} className={i > 0 ? 'border-t seam-soft' : ''}>
                <Link
                  to={`/app/esquema/${e.id}`}
                  className="group grid items-center gap-1.5 px-5 py-4 transition-colors hover:bg-bench-3 md:grid-cols-[1.5fr_1.2fr_1fr_0.8fr_160px] md:gap-4 md:py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink-1">{e.montadora} {e.modelo}</span>
                    <span className="code block text-[12px] text-ink-4 md:hidden">{e.modulo} · {e.anos}</span>
                  </span>
                  <span className="code hidden truncate text-[13px] text-ink-2 md:block">{e.modulo}</span>
                  <span className="truncate text-[13.5px] text-ink-2">{e.motor}</span>
                  <span className="code hidden text-[13px] text-ink-3 md:block">{e.anos}</span>
                  <span className="flex items-center justify-between gap-3 md:justify-end">
                    <span className="code whitespace-nowrap text-[12px] text-ink-3">{e.paginas} pág · {e.conectores} con.</span>
                    <ChevronRight size={17} className="text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-trace" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
        active
          ? 'border-trace/50 bg-trace/12 text-trace-hi'
          : 'seam bg-bench-2 text-ink-2 hover:bg-bench-3 hover:text-ink-1'
      }`}
    >
      {children}
    </button>
  )
}
