import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { SECTION_META, type SectionKey } from '../data/nav'
import { carregarEsquema, rotaSecao, rotulo, subtituloCurto, useCarga } from '../lib/acervo'
import { EsquemaViewer } from '../components/EsquemaViewer'
import { LogoMarca } from '../components/LogoMarca'
import { BotaoCompartilhar } from '../components/CompartilharEsquema'
import { registrarRecente } from '../lib/recentes'
import { BloqueioPlano } from '../components/BloqueioPlano'
import { useAcesso } from '../lib/acesso'

export default function EsquemaPage() {
  const id = useParams()['*'] ?? ''
  const secao = id.split('/')[0] as SectionKey
  const { podeSecao } = useAcesso()
  // link salvo, recente ou compartilhado de um sistema fora do plano
  if (SECTION_META[secao] && !podeSecao(secao)) {
    return <BloqueioPlano titulo={SECTION_META[secao].trilha.join(' · ')} oQue={SECTION_META[secao].titulo} />
  }
  return <VerEsquema id={id} secao={secao} />
}

function VerEsquema({ id, secao }: { id: string; secao: SectionKey }) {
  const meta = SECTION_META[secao]
  const carga = useCarga(() => carregarEsquema(id), [id])

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
        viewTransition
        className="no-print inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1"
      >
        <ArrowLeft size={15} /> {meta.titulo}{carga.estado === 'ok' ? ` · ${carga.dados.marca}` : ''}
      </Link>

      {carga.estado === 'carregando' && (
        <div aria-busy="true" className="mt-4 space-y-3">
          <div className="skeleton h-8 w-72 max-w-full rounded" />
          <div className="skeleton h-4 w-96 max-w-full rounded" />
          <div className="skeleton mt-6 h-[60vh] rounded-xl" />
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
                  <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight sm:text-3xl" style={{ viewTransitionName: 'titulo-esquema' }}>{d.marca} {d.modelo}</h1>
                  {d.subtitulo && <p className="mt-1 text-ink-3">{subtituloCurto(d.subtitulo)}</p>}
                </div>
              </div>
              <BotaoCompartilhar d={d} />
            </div>

            <dl className={`mt-5 grid grid-cols-2 gap-3 ${d.specs.length ? '' : 'hidden'} md:grid-cols-4`}>
              {d.specs.map(([k, v]) => (
                <div key={k} className="min-w-0 rounded-xl border seam bg-bench-2 px-4 py-3">
                  <dt className="code text-[10.5px] uppercase tracking-[0.14em] text-ink-4">{rotulo(k)}</dt>
                  <dd className="mt-1 truncate text-[14px] font-medium text-ink-1" data-tip={v.length > 28 ? v : undefined}>{v}</dd>
                </div>
              ))}
            </dl>

            <div className="sem-impressao mt-6">
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
