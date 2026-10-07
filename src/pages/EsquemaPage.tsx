import { useEffect, useState } from 'react'
import { registrar as anotar } from '../lib/log'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { SECTION_META, type SectionKey } from '../data/nav'
import { carregarEsquema, rotaSecao, rotulo, subtituloCurto, useCarga } from '../lib/acervo'
import { EsquemaViewer } from '../components/EsquemaViewer'
import { LogoMarca } from '../components/LogoMarca'
import { BotaoCompartilhar } from '../components/CompartilharEsquema'
import { registrarRecente } from '../lib/recentes'
import { EsquemaEmbacado } from '../components/AssineParaAcessar'
import { useAcesso } from '../lib/acesso'
import { useTitulo } from '../lib/seo'
import { getSession } from '../lib/auth'
import { momentoDeValor } from '../lib/funil'
import { DicaEsquema } from '../components/Funil'
import { FaixaAssinar } from '../components/AssineParaAcessar'
import { liberarEsquema } from '../lib/consulta'

export default function EsquemaPage() {
  const id = useParams()['*'] ?? ''
  const secao = id.split('/')[0] as SectionKey
  return <VerEsquema id={id} secao={secao} />
}

function VerEsquema({ id, secao }: { id: string; secao: SectionKey }) {
  const meta = SECTION_META[secao]
  const carga = useCarga(() => carregarEsquema(id), [id])
  // fora do plano (ex.: diesel no Pro) ou teste vencido: a página abre (título, montadora, dados), mas o desenho fica
  // embaçado com o convite. Fora do plano diz qual plano libera ("Somente no plano Full").
  const { testeAcabou, podeSecao, sessao } = useAcesso()
  const foraDoPlano = !!SECTION_META[secao] && !podeSecao(secao)
  // teste grátis por consultas: o servidor conta este esquema e diz se ainda pode abrir (lib/consulta.ts).
  // Enquanto confere, o desenho espera (o esquema não pisca nítido para quem já não tem consulta).
  const noTeste = sessao?.plano === 'free' && sessao.papel !== 'admin'
  const [liberacao, setLiberacao] = useState<{ id: string; ok: boolean } | null>(null)
  const precisaConferir = noTeste && !testeAcabou && !foraDoPlano
  useEffect(() => {
    if (!precisaConferir || carga.estado !== 'ok') return
    let vivo = true
    void liberarEsquema(id).then((ok) => { if (vivo) setLiberacao({ id, ok }) })
    return () => { vivo = false }
  }, [id, precisaConferir, carga.estado])
  const conferindo = precisaConferir && liberacao?.id !== id
  const recusado = precisaConferir && liberacao?.id === id && !liberacao.ok
  const bloqueado = testeAcabou || foraDoPlano || recusado
  // registro de uso: cada esquema aberto e como terminou (liberado, recusado pela 6ª consulta, teste vencido, fora do plano)
  const pronto = carga.estado === 'ok' && !conferindo
  useEffect(() => {
    if (!pronto) return
    anotar('esquema', { id: id.slice(0, 160), estado: recusado ? 'recusado' : testeAcabou ? 'teste_encerrado' : foraDoPlano ? 'fora_do_plano' : 'liberado' })
  }, [id, pronto]) // eslint-disable-line react-hooks/exhaustive-deps
  useTitulo(carga.estado === 'ok' ? `${carga.dados.marca} ${carga.dados.modelo} · ${meta?.titulo ?? ''} · Deepcar` : null)

  // entra nas últimas consultas da tela inicial
  const aberto = carga.estado === 'ok' ? carga.dados : null
  useEffect(() => {
    if (!aberto || !SECTION_META[aberto.secao] || conferindo) return
    // esquema borrado não conta como aberto (nem para a ativação nem para o convite do teste)
    const email = getSession()?.email
    if (email && !bloqueado) momentoDeValor(email, 'esquema')
    registrarRecente({
      tipo: 'esquema',
      id: aberto.id,
      titulo: `${aberto.marca} ${aberto.modelo}`,
      detalhe: SECTION_META[aberto.secao].titulo,
    })
  }, [aberto, conferindo]) // eslint-disable-line react-hooks/exhaustive-deps

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
              {!bloqueado && !conferindo && <BotaoCompartilhar d={d} />}
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
              {bloqueado
                ? <EsquemaEmbacado d={d} motivo={foraDoPlano ? { tipo: 'plano', secao } : { tipo: 'teste' }} />
                : conferindo
                  ? <div aria-busy="true" className="skeleton h-[60vh] rounded-xl" />
                  : <><DicaEsquema /><EsquemaViewer key={d.id} d={d} /></>}
            </div>
            {/* teste em andamento: o convite fica logo abaixo do desenho, sem cobrir nada */}
            {noTeste && !bloqueado && !conferindo && <FaixaAssinar className="mt-6" lugar="esquema" />}
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
