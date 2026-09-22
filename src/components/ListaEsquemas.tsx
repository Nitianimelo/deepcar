// Tabela de esquemas (lista da seção e resultado da busca). No celular cada linha empilha os dados.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { SECTION_META } from '../data/nav'
import { adiantarEsquema, type Esquema } from '../lib/acervo'
import { marcarTitulo } from '../lib/transicao'
import { DetalhesEsquema } from './DetalhesEsquema'
import { LogoMarca } from './LogoMarca'

const LOTE = 60

export function ListaEsquemas({ lista, mostrarLogo, mostrarSecao = false, vazio = 'Tente outro termo.' }: {
  lista: Esquema[]
  mostrarLogo: boolean
  /** nome do sistema em cada linha (busca geral, que mistura seções) */
  mostrarSecao?: boolean
  vazio?: string
}) {
  // renderiza em lotes conforme a rolagem chega ao fim (a lista inteira pode ter milhares de linhas)
  const [visiveis, setVisiveis] = useState(LOTE)
  useEffect(() => { setVisiveis(LOTE) }, [lista])
  const fim = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = fim.current
    if (!el) return
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) setVisiveis((v) => v + LOTE) }, { rootMargin: '800px' })
    io.observe(el)
    return () => io.disconnect()
  }, [lista])

  return (
    <div className="mt-4 overflow-hidden rounded-xl border seam bg-bench-2">
      <div className="code sticky top-0 z-10 hidden grid-cols-[1.5fr_1fr_1.3fr_0.9fr_28px] gap-4 border-b seam-soft bg-bench-2/95 px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] text-ink-4 backdrop-blur-md md:grid">
        <span>Veículo</span><span>Motorização</span><span>Sistema</span><span>Fabricação</span><span />
      </div>
      {lista.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <p className="text-ink-2">Nenhum esquema encontrado.</p>
          <p className="mt-1 text-sm text-ink-4">{vazio}</p>
        </div>
      ) : (
        <ul>
          {lista.slice(0, visiveis).map((e, i) => (
            <Linha key={e.id} e={e} primeira={i === 0} mostrarLogo={mostrarLogo} mostrarSecao={mostrarSecao} />
          ))}
        </ul>
      )}
      <div ref={fim} aria-hidden="true" />
    </div>
  )
}

function Linha({ e, primeira, mostrarLogo, mostrarSecao }: { e: Esquema; primeira: boolean; mostrarLogo: boolean; mostrarSecao: boolean }) {
  const gerenc = [e.codigoMotor, e.gerenciamento].filter(Boolean).join(' · ')
  return (
    <li className={primeira ? '' : 'border-t seam-soft'}>
      <Link
        to={`/app/esquema/${e.id}`}
        viewTransition
        onClick={marcarTitulo}
        onPointerEnter={() => adiantarEsquema(e.id)}
        onFocus={() => adiantarEsquema(e.id)}
        className="group grid items-center gap-1 px-5 py-3.5 transition-colors hover:bg-bench-3 md:grid-cols-[1.5fr_1fr_1.3fr_0.9fr_28px] md:gap-4"
      >
        <span className="flex min-w-0 items-start gap-3 md:items-center">
          {mostrarLogo && (
            <span className="mt-0.5 grid w-9 flex-none place-items-center text-ink-3 group-hover:text-ink-1 md:mt-0">
              <LogoMarca marca={e.marca} altura={18} larguraMax={36} />
            </span>
          )}
          <span className="min-w-0">
            {mostrarSecao && (
              <span className="code block text-[10.5px] uppercase tracking-[0.14em] text-trace-hi">{SECTION_META[e.secao]?.titulo}</span>
            )}
            <span data-titulo className="block break-words font-medium text-ink-1 md:truncate">{mostrarLogo ? `${e.marca} ` : ''}{e.modelo}</span>
            <DetalhesEsquema e={e} className="mt-1.5 md:hidden" />
          </span>
        </span>
        <span className="code hidden truncate text-[13px] text-ink-2 md:block" data-tip={(e.motorizacao?.length ?? 0) > 22 ? e.motorizacao! : undefined}>{e.motorizacao ?? '—'}</span>
        <span className="hidden truncate text-[13.5px] text-ink-2 md:block" data-tip={gerenc.length > 34 ? gerenc : undefined}>{gerenc || '—'}</span>
        <span className="code hidden truncate text-[13px] text-ink-3 md:block">{e.producao ?? '—'}</span>
        <ChevronRight size={17} className="hidden text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-trace md:block" />
      </Link>
    </li>
  )
}
