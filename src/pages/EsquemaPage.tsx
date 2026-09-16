import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, LoaderCircle, Printer } from 'lucide-react'
import { SECTION_META, type SectionKey } from '../data/nav'
import { carregarEsquema, rotaSecao, rotulo, subtituloCurto, useCarga } from '../lib/acervo'
import { EsquemaViewer } from '../components/EsquemaViewer'
import { LogoMarca } from '../components/LogoMarca'
import { PrintEsquema } from '../components/PrintEsquema'
import { registrarRecente } from '../lib/recentes'

/**
 * Impressão: monta o documento A4, espera as imagens e só então abre a janela do navegador.
 * Ctrl+P passa pelo mesmo caminho; imprimir pelo menu do navegador monta o documento na hora (sem esperar).
 */
function useImpressao() {
  const [ativo, setAtivo] = useState(false)
  const modo = useRef<'botao' | 'menu' | null>(null)

  const iniciar = useCallback(() => {
    if (modo.current) return
    modo.current = 'botao'
    setAtivo(true)
  }, [])

  const pronto = useCallback(() => {
    if (modo.current !== 'botao') return
    window.addEventListener('afterprint', () => { modo.current = null; setAtivo(false) }, { once: true })
    window.print()
  }, [])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); iniciar() }
    }
    const antes = () => { if (!modo.current) { modo.current = 'menu'; flushSync(() => setAtivo(true)) } }
    const depois = () => { if (modo.current === 'menu') { modo.current = null; setAtivo(false) } }
    window.addEventListener('keydown', tecla)
    window.addEventListener('beforeprint', antes)
    window.addEventListener('afterprint', depois)
    return () => {
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('beforeprint', antes)
      window.removeEventListener('afterprint', depois)
    }
  }, [iniciar])

  return { ativo, preparando: ativo && modo.current === 'botao', iniciar, pronto }
}

export default function EsquemaPage() {
  const id = useParams()['*'] ?? ''
  const secao = id.split('/')[0] as SectionKey
  const meta = SECTION_META[secao]
  const carga = useCarga(() => carregarEsquema(id), [id])
  const impressao = useImpressao()

  // entra nas últimas consultas da tela inicial
  const aberto = carga.estado === 'ok' ? carga.dados : null
  useEffect(() => {
    if (!aberto || !SECTION_META[aberto.secao]) return
    registrarRecente({
      tipo: 'esquema',
      id: aberto.id,
      titulo: `${aberto.marca} ${aberto.modelo}`,
      detalhe: SECTION_META[aberto.secao].titulo,
    })
  }, [aberto])

  if (!meta) return <NaoEncontrado />

  return (
    <div className="mx-auto max-w-[1280px] px-3 py-6 sm:px-8 sm:py-8">
      <Link
        to={carga.estado === 'ok' ? `${rotaSecao(secao)}?marca=${encodeURIComponent(carga.dados.marca)}` : rotaSecao(secao)}
        className="no-print inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1"
      >
        <ArrowLeft size={15} /> {meta.titulo}{carga.estado === 'ok' ? ` · ${carga.dados.marca}` : ''}
      </Link>

      {carga.estado === 'carregando' && (
        <div aria-busy="true" className="mt-4 space-y-3">
          <div className="h-8 w-72 animate-pulse rounded bg-bench-3" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-bench-3" />
          <div className="mt-6 h-[60vh] animate-pulse rounded-xl bg-bench-2" />
        </div>
      )}

      {carga.estado === 'erro' && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/8 p-5 text-[14px]">
          <AlertTriangle size={18} className="mt-0.5 flex-none text-warn" />
          <div>
            <p className="text-ink-1">Não foi possível abrir este esquema.</p>
            <p className="mt-1 text-ink-3">{carga.msg}</p>
          </div>
        </div>
      )}

      {carga.estado === 'ok' && (() => {
        const d = carga.dados
        return (
          <>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div className="flex min-w-0 items-center gap-5">
                <Link
                  to={`${rotaSecao(secao)}?marca=${encodeURIComponent(d.marca)}`}
                  data-tip={`Ver todos os esquemas ${d.marca} deste sistema`}
                  data-tip-side="bottom"
                  className="no-print hidden h-16 w-24 flex-none place-items-center rounded-xl border seam bg-bench-2 text-ink-1 hover:border-trace/40 sm:grid"
                >
                  <LogoMarca marca={d.marca} altura={30} larguraMax={72} />
                </Link>
                <div className="min-w-0">
                  <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">{d.marca} · {meta.trilha.join(' · ')}</p>
                  <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight sm:text-3xl">{d.marca} {d.modelo}</h1>
                  {d.subtitulo && <p className="mt-1 text-ink-3">{subtituloCurto(d.subtitulo)}</p>}
                </div>
              </div>
              <button
                onClick={impressao.iniciar}
                disabled={impressao.preparando}
                data-tip="Imprimir ou salvar em PDF, em folhas A4 com cabeçalho e numeração"
                data-tip-kbd="Ctrl,P"
                data-tip-side="bottom"
                className="no-print btn-ghost inline-flex items-center gap-2 self-start disabled:cursor-wait disabled:opacity-80 sm:self-auto"
              >
                {impressao.preparando
                  ? <><LoaderCircle size={16} className="animate-spin" /> Preparando…</>
                  : <><Printer size={16} /> Imprimir</>}
              </button>
              {impressao.ativo && <PrintEsquema d={d} onPronto={impressao.pronto} />}
            </div>

            <dl className={`mt-5 grid grid-cols-2 gap-3 ${d.specs.length ? '' : 'hidden'} md:grid-cols-4`}>
              {d.specs.map(([k, v]) => (
                <div key={k} className="min-w-0 rounded-xl border seam bg-bench-2 px-4 py-3">
                  <dt className="code text-[10.5px] uppercase tracking-[0.14em] text-ink-4">{rotulo(k)}</dt>
                  <dd className="mt-1 truncate text-[14px] font-medium text-ink-1" data-tip={v.length > 28 ? v : undefined}>{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <EsquemaViewer key={d.id} d={d} />
            </div>
          </>
        )
      })()}
    </div>
  )
}

function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <p className="text-ink-2">Esquema não encontrado.</p>
      <Link to="/app" className="mt-4 inline-flex text-trace hover:text-trace-hi">Voltar ao catálogo</Link>
    </div>
  )
}
