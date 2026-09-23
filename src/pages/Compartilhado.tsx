// /c/:token — esquema recebido por link (WhatsApp, e-mail…). Não pede conta: abre o visualizador
// completo ocupando a tela inteira. O link abre 2 vezes (api/compartilhar.js); depois mostra que expirou.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Link2Off, LoaderCircle, SearchX } from 'lucide-react'
import { SECTION_META } from '../data/nav'
import { carregarEsquema, type EsquemaDetalhe } from '../lib/acervo'
import { EsquemaViewer } from '../components/EsquemaViewer'
import { GridBeam } from '../components/landing/GridBeam'

type Estado =
  | { fase: 'abrindo' }
  | { fase: 'ok'; d: EsquemaDetalhe; quem: string | null; restantes: number }
  | { fase: 'expirado'; quem: string | null }
  | { fase: 'inexistente' }
  | { fase: 'erro'; msg: string }

/** Um id por aparelho: recarregar a página no mesmo aparelho não gasta outra abertura. */
function idDoAparelho() {
  try {
    let v = localStorage.getItem('deepcar.visitante')
    if (!v) {
      v = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem('deepcar.visitante', v)
    }
    return v
  } catch {
    return ''
  }
}

export default function Compartilhado() {
  const { token = '' } = useParams()
  const [estado, setEstado] = useState<Estado>({ fase: 'abrindo' })

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const r = await fetch(`/api/compartilhar?t=${encodeURIComponent(token)}&v=${encodeURIComponent(idDoAparelho())}`, { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (r.status === 410) return vivo && setEstado({ fase: 'expirado', quem: j.quem ?? null })
      if (r.status === 404) return vivo && setEstado({ fase: 'inexistente' })
      if (!r.ok) throw new Error(j.erro ?? 'Não foi possível abrir o link.')
      const d = await carregarEsquema(j.esquemaId)
      if (vivo) setEstado({ fase: 'ok', d, quem: j.quem ?? null, restantes: j.restantes ?? 0 })
    })().catch((e: Error) => vivo && setEstado({ fase: 'erro', msg: e.message || 'Verifique sua conexão.' }))
    return () => { vivo = false }
  }, [token])

  useEffect(() => {
    const antes = document.title
    if (estado.fase === 'ok') document.title = `${estado.d.marca} ${estado.d.modelo} · Deepcar`
    return () => { document.title = antes }
  }, [estado])

  if (estado.fase === 'abrindo') {
    return (
      <div aria-busy="true" className="schematic-grid grid h-dvh place-items-center bg-pit">
        <div className="flex flex-col items-center gap-4">
          <img src="/brand/logo-h-light.png" alt="Deepcar" className="h-7 opacity-90" draggable={false} />
          <p className="flex items-center gap-2 text-[14px] text-ink-3"><LoaderCircle size={16} className="animate-spin text-trace" /> Abrindo o esquema…</p>
        </div>
      </div>
    )
  }
  if (estado.fase === 'expirado') return <Aviso tipo="expirado" quem={estado.quem} />
  if (estado.fase === 'inexistente') return <Aviso tipo="inexistente" />
  if (estado.fase === 'erro') return <Aviso tipo="erro" msg={estado.msg} />

  const { d, quem, restantes } = estado
  const sistema = SECTION_META[d.secao]?.titulo ?? ''
  return (
    <div className="flex h-dvh flex-col bg-pit">
      <header className="no-print flex h-14 flex-none items-center gap-3 border-b seam bg-bench-1/95 px-3 backdrop-blur-md sm:gap-4 sm:px-5">
        <Link to="/" aria-label="Deepcar" className="flex-none">
          <img src="/brand/mark-light.png" alt="Deepcar" className="h-7 w-7 object-contain sm:hidden" draggable={false} />
          <img src="/brand/logo-h-light.png" alt="Deepcar" className="hidden h-6 sm:block" draggable={false} />
        </Link>
        <span aria-hidden="true" className="h-6 w-px flex-none bg-[var(--seam-3)]" />
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="truncate text-[14.5px] font-semibold text-ink-1 sm:text-[15px]">{d.marca} {d.modelo}</h1>
          <p className="code truncate text-[10.5px] uppercase tracking-[0.14em] text-ink-4">{sistema}</p>
        </div>
        <span className="hidden flex-none text-[12.5px] text-ink-4 md:block">
          {quem ? `Enviado por ${quem}` : 'Enviado pelo Deepcar'}
          {restantes > 0 ? ` · o link abre mais ${restantes} ${restantes === 1 ? 'vez' : 'vezes'}` : ' · última abertura do link'}
        </span>
        <Link to="/" className="btn-cta inline-flex h-9 flex-none items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium">
          <span className="hidden sm:inline">Conhecer o</span> Deepcar <ArrowRight size={14} />
        </Link>
      </header>

      {/* o visualizador rola dentro deste <main>, com barra, seletor de componentes, zoom, pinça, minimapa e tela cheia */}
      <main className="schematic-grid min-h-0 flex-1 overflow-y-auto">
        <div className="sem-impressao px-1.5 py-2 sm:px-4 sm:py-4">
          <EsquemaViewer d={d} />
        </div>
      </main>
    </div>
  )
}

function Aviso({ tipo, quem, msg }: { tipo: 'expirado' | 'inexistente' | 'erro'; quem?: string | null; msg?: string }) {
  const expirado = tipo === 'expirado'
  const Icone = expirado ? Link2Off : SearchX
  const rotulo = expirado ? 'Link expirado' : tipo === 'inexistente' ? 'Link inválido' : 'Sem conexão'
  const titulo = expirado
    ? 'Este link já foi aberto 2 vezes.'
    : tipo === 'inexistente'
      ? 'Não encontramos este link.'
      : 'Não foi possível abrir o esquema.'
  const texto = expirado
    ? `Para proteger o acervo, os esquemas enviados pelo Deepcar abrem só duas vezes. Peça um link novo a ${quem ?? 'quem te enviou'}, ou crie sua conta e consulte quando quiser.`
    : tipo === 'inexistente'
      ? 'Confira se o endereço chegou inteiro na mensagem. Se o problema continuar, peça um link novo a quem te enviou.'
      : msg ?? 'Verifique sua conexão e tente de novo.'

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-pit px-5 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(760px 480px at 50% 42%, rgba(14,58,118,0.45) 0%, transparent 70%)' }} />
      <GridBeam celula={72} duracao={9} forca={0.7} className="grade-mascara-centro" />

      <div className="relative w-full max-w-[440px] text-center">
        <Link to="/" aria-label="Deepcar" className="inline-block">
          <img src="/brand/logo-h-light.png" alt="Deepcar" className="mx-auto h-7" draggable={false} />
        </Link>

        <div className="mt-10 rounded-[24px] border seam bg-bench-2/90 p-7 shadow-2xl backdrop-blur-md sm:p-9">
          <span className="relative mx-auto grid h-16 w-16 place-items-center">
            <span aria-hidden="true" className={`absolute inset-0 rounded-full ${expirado ? 'bg-warn/15' : 'bg-trace/15'} animate-ping [animation-duration:2.4s] motion-reduce:animate-none`} />
            <span className={`relative grid h-16 w-16 place-items-center rounded-full border ${expirado ? 'border-warn/35 bg-warn/10 text-warn' : 'border-trace/35 bg-trace/10 text-trace-hi'}`}>
              <Icone size={26} />
            </span>
          </span>
          <p className="code mt-6 text-[11px] uppercase tracking-[0.24em] text-ink-4">{rotulo}</p>
          <h1 className="mt-2.5 text-[24px] font-semibold leading-tight tracking-tight sm:text-[26px]">{titulo}</h1>
          <p className="mx-auto mt-3 max-w-[36ch] text-[15px] leading-relaxed text-ink-2">{texto}</p>

          <div className="mt-8 grid gap-2.5">
            {tipo === 'erro' ? (
              <button type="button" onClick={() => location.reload()} className="btn-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-medium">
                Tentar de novo
              </button>
            ) : (
              <Link to="/cadastro" className="btn-cta inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[15px] font-medium">
                Criar conta grátis <ArrowRight size={16} />
              </Link>
            )}
            <Link to="/" className="btn-ghost inline-flex !h-12 items-center justify-center rounded-xl text-[15px]">
              Conhecer o Deepcar
            </Link>
          </div>
        </div>

        <p className="mt-6 text-[12.5px] text-ink-4">Esquemas elétricos de injeção, ABS, elétrica e câmbio, do leve ao diesel.</p>
      </div>
    </div>
  )
}
