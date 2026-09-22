// Busca rápida (Ctrl+K / ⌘K) de qualquer tela do app: placa, modelo, motor, código ou sistema.
// Vazia, mostra as últimas consultas. Uma placa válida vira a primeira opção ("Consultar placa").
// Reaproveita a mesma busca da tela /app/busca (lib/busca) e o catálogo em cache (carregarTudo).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock, FileText, ScanLine, Search } from 'lucide-react'
import { SECOES, SECTION_META } from '../data/nav'
import { carregarTudo, fmt, useCarga } from '../lib/acervo'
import { filtrar, indexar, termosDe } from '../lib/busca'
import { formatarPlaca, normalizarPlaca, placaValida } from '../lib/placa'
import { useRecentes } from '../lib/recentes'

const MAX = 8

type Opcao = { chave: string; icone: 'placa' | 'esquema' | 'recente' | 'todos'; titulo: string; detalhe?: string; para: string }

/** Botão da barra superior + atalho global. A janela só monta quando abre (o catálogo desce na primeira vez). */
export function PaletaBusca() {
  const [aberta, setAberta] = useState(false)

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAberta((v) => !v) }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Busca rápida"
        data-tip="Buscar esquema, modelo, motor ou placa de qualquer tela"
        data-tip-kbd={mac ? '⌘,K' : 'Ctrl,K'}
        data-tip-side="bottom"
        className="hidden h-10 flex-none items-center gap-2 rounded-lg border seam px-3 sm:flex text-[13px] text-ink-3 transition-colors hover:border-[var(--seam-3)] hover:bg-bench-3 hover:text-ink-1"
      >
        <Search size={16} />
        <span className="hidden xl:inline">Buscar</span>
        <kbd className="tip-kbd hidden xl:inline-grid">{mac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      {aberta && <Janela onFechar={() => setAberta(false)} />}
    </>
  )
}

function Janela({ onFechar }: { onFechar: () => void }) {
  const nav = useNavigate()
  const campo = useRef<HTMLInputElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const [q, setQ] = useState('')
  const [marcado, setMarcado] = useState(0)
  const recentes = useRecentes()

  const carga = useCarga(() => carregarTudo(SECOES), [])
  const indice = useMemo(() => (carga.estado === 'ok' ? indexar(carga.dados, { comSecao: true }) : []), [carga])
  const temTermo = termosDe(q).length > 0

  const { opcoes, total } = useMemo(() => {
    const saida: Opcao[] = []
    const placa = formatarPlaca(q.trim())
    if (placaValida(placa)) {
      saida.push({ chave: 'placa', icone: 'placa', titulo: `Consultar placa ${placa}`, detalhe: 'Identifica o veículo e mostra os sistemas compatíveis', para: `/app/veiculo/${normalizarPlaca(placa)}` })
    }
    if (!temTermo) {
      for (const r of recentes.slice(0, 6)) {
        saida.push({
          chave: `r:${r.tipo === 'placa' ? r.placa : r.id}`,
          icone: 'recente',
          titulo: r.titulo,
          detalhe: r.detalhe,
          para: r.tipo === 'placa' ? `/app/veiculo/${r.placa}` : `/app/esquema/${r.id}`,
        })
      }
      return { opcoes: saida, total: 0 }
    }
    const achados = filtrar(indice, q)
    for (const e of achados.slice(0, MAX)) {
      saida.push({
        chave: e.id,
        icone: 'esquema',
        titulo: `${e.marca} ${e.modelo}`,
        detalhe: [SECTION_META[e.secao]?.titulo, e.motorizacao, e.producao].filter(Boolean).join(' · '),
        para: `/app/esquema/${e.id}`,
      })
    }
    if (achados.length > MAX) {
      saida.push({ chave: 'todos', icone: 'todos', titulo: `Ver todos os ${fmt(achados.length)} resultados`, para: `/app/busca?q=${encodeURIComponent(q.trim())}` })
    }
    return { opcoes: saida, total: achados.length }
  }, [q, temTermo, recentes, indice])

  useEffect(() => { campo.current?.focus() }, [])
  useEffect(() => { lista.current?.querySelector<HTMLElement>(`[data-i="${marcado}"]`)?.scrollIntoView({ block: 'nearest' }) }, [marcado])

  function ir(o: Opcao | undefined) {
    if (!o) return
    onFechar()
    nav(o.para, { viewTransition: true })
  }

  function tecla(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setMarcado((m) => Math.min(opcoes.length - 1, m + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMarcado((m) => Math.max(0, m - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); ir(opcoes[marcado]) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onFechar() }
  }

  const carregando = temTermo && carga.estado === 'carregando'

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Busca rápida" onKeyDown={tecla}>
      <div className="surge absolute inset-0 bg-black/55 backdrop-blur-[2px]" style={{ animationDuration: '160ms' }} onClick={onFechar} />
      <div className="pop-in relative flex max-h-[min(70vh,560px)] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border seam-strong bg-bench-2 shadow-[0_40px_100px_-20px_rgba(0,0,0,.75)]" style={{ transformOrigin: 'top center' }}>
        <label className="relative block flex-none border-b seam">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
          <input
            ref={campo}
            value={q}
            onChange={(e) => { setQ(e.target.value); setMarcado(0) }}
            placeholder="Placa, modelo, motor ou sistema…"
            aria-label="Buscar"
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full bg-transparent pl-12 pr-16 text-[16px] text-ink-1 outline-none placeholder:text-ink-4"
          />
          <kbd className="tip-kbd absolute right-4 top-1/2 -translate-y-1/2">Esc</kbd>
        </label>

        <ul ref={lista} role="listbox" aria-label="Resultados" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {!temTermo && opcoes.length > 0 && (
            <li className="code px-3 pb-1.5 pt-1 text-[10.5px] uppercase tracking-[0.16em] text-ink-4">Últimas consultas</li>
          )}
          {opcoes.map((o, i) => (
            <li key={o.chave} className="surge" style={{ '--i': Math.min(i, 8) } as React.CSSProperties}>
              <button
                type="button"
                role="option"
                aria-selected={i === marcado}
                data-i={i}
                onPointerMove={() => setMarcado(i)}
                onClick={() => ir(o)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${i === marcado ? 'bg-bench-3' : ''}`}
              >
                <span className={`grid h-8 w-8 flex-none place-items-center rounded-md border seam ${o.icone === 'placa' ? 'text-ok' : 'text-ink-3'}`}>
                  {o.icone === 'placa' ? <ScanLine size={16} /> : o.icone === 'recente' ? <Clock size={15} /> : o.icone === 'todos' ? <ArrowRight size={15} /> : <FileText size={15} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink-1">{o.titulo}</span>
                  {o.detalhe && <span className="block truncate text-[12.5px] text-ink-3">{o.detalhe}</span>}
                </span>
                {i === marcado && <ArrowRight size={15} className="flex-none text-trace" />}
              </button>
            </li>
          ))}
          {carregando && Array.from({ length: 4 }, (_, i) => <li key={i} className="skeleton sobre-cartao mx-1 my-1.5 h-12 rounded-lg" />)}
          {temTermo && carga.estado === 'ok' && total === 0 && opcoes.length === 0 && (
            <li className="px-3 py-10 text-center text-[14px] text-ink-3">Nenhum esquema com esses termos. Tente menos palavras.</li>
          )}
          {!temTermo && opcoes.length === 0 && (
            <li className="px-3 py-10 text-center text-[14px] text-ink-3">Digite uma placa ou o que procura: “gol 1.6”, “hilux diesel”, “abs onix”.</li>
          )}
        </ul>

        <p className="code hidden flex-none justify-between border-t seam px-4 py-2 text-[11px] text-ink-4 sm:flex">
          <span>↑↓ escolher · Enter abrir</span>
          {temTermo && carga.estado === 'ok' && <span>{total === 1 ? '1 esquema' : `${fmt(total)} esquemas`}</span>}
        </p>
      </div>
    </div>
  )
}
