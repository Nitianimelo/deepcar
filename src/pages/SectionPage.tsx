import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ChevronRight, Search, X } from 'lucide-react'
import { SECTION_META, type SectionKey } from '../data/nav'
import { adiantarCatalogo, adiantarEsquema, carregarCatalogo, carregarMarcas, useCarga, type Esquema } from '../lib/acervo'
import { LogoMarca } from '../components/LogoMarca'

const LOTE = 60

export default function SectionPage({ secao }: { secao: SectionKey }) {
  const meta = SECTION_META[secao]

  // montadora escolhida fica na URL: voltar do navegador retorna à grade
  const [params, setParams] = useSearchParams()
  const marca = params.get('marca') ?? ''
  const escolherMarca = (m: string) => setParams(m ? { marca: m } : {}, { replace: false })
  const [q, setQ] = useState('')
  useEffect(() => { setQ('') }, [secao, marca])

  const mostrarGrade = !marca && !q.trim()

  // A grade de montadoras sai do índice (5 KB). O catálogo da seção, que é grande,
  // só desce quando o mecânico escolhe a montadora ou começa a buscar.
  const cargaMarcas = useCarga(() => carregarMarcas(secao), [secao])
  const marcas = useMemo(
    () => (cargaMarcas.estado === 'ok' ? cargaMarcas.dados.map((m) => [m.nome, m.total] as [string, number]) : []),
    [cargaMarcas],
  )

  const carga = useCarga(() => (mostrarGrade ? Promise.resolve([] as Esquema[]) : carregarCatalogo(secao)), [secao, mostrarGrade])
  const todos = useMemo(() => (carga.estado === 'ok' ? carga.dados : []), [carga])

  const lista = useMemo(() => {
    const termos = norm(q).split(' ').filter(Boolean)
    return todos.filter((e) => {
      if (marca && e.marca !== marca) return false
      if (!termos.length) return true
      const alvo = norm([e.marca, e.modelo, e.motorizacao, e.codigoMotor, e.gerenciamento, e.producao, e.chassi].join(' '))
      return termos.every((t) => alvo.includes(t))
    })
  }, [todos, q, marca])

  const estado = mostrarGrade ? cargaMarcas.estado : carga.estado
  const erro = cargaMarcas.estado === 'erro' ? cargaMarcas.msg : carga.estado === 'erro' ? carga.msg : ''

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      {/* cabeçalho */}
      {marca ? (
        <div>
          <button
            type="button"
            onClick={() => escolherMarca('')}
            data-tip="Voltar para todas as montadoras"
            data-tip-side="right"
            className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1"
          >
            <ArrowLeft size={15} /> {meta.titulo}
          </button>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-5">
              <span className="grid h-16 w-24 flex-none place-items-center rounded-xl border seam bg-bench-2 text-ink-1">
                <LogoMarca marca={marca} altura={30} larguraMax={72} />
              </span>
              <div className="min-w-0">
                <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">{meta.trilha.join('  ›  ')}</p>
                <h1 className="mt-1 truncate text-[26px] font-semibold tracking-tight sm:text-3xl">{marca}</h1>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">{meta.trilha.join('  ›  ')}</p>
            <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight sm:text-3xl">{meta.titulo}</h1>
            <p className="mt-1 text-ink-3">{meta.descricao}</p>
          </div>
        </div>
      )}

      {/* busca */}
      <label className="relative mt-6 block">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
        <input
          className="field pl-11 pr-11"
          placeholder={marca ? `Buscar em ${marca}: modelo, motor ou ano` : 'Buscar modelo, motor ou ano'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => adiantarCatalogo(secao)}
          aria-label="Buscar esquema"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Limpar busca" data-tip="Limpar busca" className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-ink-4 hover:bg-bench-3 hover:text-ink-1">
            <X size={16} />
          </button>
        )}
      </label>

      {estado === 'erro' && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/8 p-5 text-[14px]">
          <AlertTriangle size={18} className="mt-0.5 flex-none text-warn" />
          <div>
            <p className="text-ink-1">Não foi possível carregar o catálogo.</p>
            <p className="mt-1 text-ink-3">{erro}</p>
          </div>
        </div>
      )}

      {estado === 'carregando' && (
        <div aria-busy="true" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 15 }, (_, i) => <div key={i} className="h-[124px] animate-pulse rounded-xl bg-bench-2" />)}
        </div>
      )}

      {estado === 'ok' && (mostrarGrade ? (
        <GradeMarcas marcas={marcas} onEscolher={escolherMarca} onAdiantar={() => adiantarCatalogo(secao)} />
      ) : (
        <ListaEsquemas lista={lista} mostrarLogo={!marca} />
      ))}
    </div>
  )
}

function GradeMarcas({ marcas, onEscolher, onAdiantar }: { marcas: [string, number][]; onEscolher: (m: string) => void; onAdiantar: () => void }) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {marcas.map(([m]) => (
        <li key={m}>
          <button
            type="button"
            onClick={() => onEscolher(m)}
            onPointerEnter={onAdiantar}
            onFocus={onAdiantar}
            className="tile group flex h-[124px] w-full flex-col items-center justify-between rounded-xl px-3 pb-3 pt-5 text-ink-2 hover:text-ink-1"
          >
            <span className="grid h-12 w-full place-items-center">
              <LogoMarca marca={m} altura={40} larguraMax={120} className="transition-colors group-hover:text-trace-hi" />
            </span>
            <span className="w-full truncate text-center text-[13px] font-medium text-ink-1">{m}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ListaEsquemas({ lista, mostrarLogo }: { lista: Esquema[]; mostrarLogo: boolean }) {
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
          <p className="mt-1 text-sm text-ink-4">Tente outro termo.</p>
        </div>
      ) : (
        <ul>
          {lista.slice(0, visiveis).map((e, i) => <Linha key={e.id} e={e} primeira={i === 0} mostrarLogo={mostrarLogo} />)}
        </ul>
      )}
      <div ref={fim} aria-hidden="true" />
    </div>
  )
}

function Linha({ e, primeira, mostrarLogo }: { e: Esquema; primeira: boolean; mostrarLogo: boolean }) {
  const gerenc = [e.codigoMotor, e.gerenciamento].filter(Boolean).join(' · ')
  return (
    <li className={primeira ? '' : 'border-t seam-soft'}>
      <Link
        to={`/app/esquema/${e.id}`}
        onPointerEnter={() => adiantarEsquema(e.id)}
        onFocus={() => adiantarEsquema(e.id)}
        className="group grid items-center gap-1 px-5 py-3.5 transition-colors hover:bg-bench-3 md:grid-cols-[1.5fr_1fr_1.3fr_0.9fr_28px] md:gap-4"
      >
        <span className="flex min-w-0 items-center gap-3">
          {mostrarLogo && (
            <span className="grid w-9 flex-none place-items-center text-ink-3 group-hover:text-ink-1">
              <LogoMarca marca={e.marca} altura={18} larguraMax={36} />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink-1">{mostrarLogo ? `${e.marca} ` : ''}{e.modelo}</span>
            <span className="code block truncate text-[12px] text-ink-4 md:hidden">
              {[e.motorizacao, gerenc, e.producao].filter(Boolean).join(' · ')}
            </span>
          </span>
        </span>
        <span className="code hidden truncate text-[13px] text-ink-2 md:block">{e.motorizacao ?? '—'}</span>
        <span className="hidden truncate text-[13.5px] text-ink-2 md:block" data-tip={gerenc.length > 34 ? gerenc : undefined}>{gerenc || '—'}</span>
        <span className="code hidden truncate text-[13px] text-ink-3 md:block">{e.producao ?? '—'}</span>
        <ChevronRight size={17} className="hidden text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-trace md:block" />
      </Link>
    </li>
  )
}

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[/\\_-]+/g, ' ')
}
