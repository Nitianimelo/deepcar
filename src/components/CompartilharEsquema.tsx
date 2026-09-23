// Compartilhar um esquema: gera um link que abre 2 vezes (api/compartilhar.js) e oferece WhatsApp,
// e-mail, copiar e o compartilhamento do sistema (celular). No celular a janela sobe de baixo, como
// as folhas de compartilhar nativas; no computador fica centralizada.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Link2, LoaderCircle, Mail, Share2, X } from 'lucide-react'
import { SECTION_META } from '../data/nav'
import type { EsquemaDetalhe } from '../lib/acervo'
import { LogoMarca } from './LogoMarca'

type Estado = { fase: 'gerando' } | { fase: 'pronto'; url: string; limite: number } | { fase: 'erro'; msg: string }

export function BotaoCompartilhar({ d }: { d: EsquemaDetalhe }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        data-tip="Enviar este esquema pelo WhatsApp, e-mail ou outro app. O link abre 2 vezes."
        data-tip-side="bottom"
        className="no-print btn-ghost inline-flex items-center gap-2 self-start sm:self-auto"
      >
        <Share2 size={16} /> Compartilhar
      </button>
      {aberto && <JanelaCompartilhar d={d} onFechar={() => setAberto(false)} />}
    </>
  )
}

/** Ícone do WhatsApp (o lucide não tem marcas). */
function IconeWhatsapp({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36A9.4 9.4 0 0 1 2.61 12c0-5.2 4.24-9.43 9.45-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.44-9.44 9.44m8.03-17.47A11.3 11.3 0 0 0 12.05.7C5.8.7.7 5.78.7 12.03c0 2 .52 3.95 1.52 5.66L.6 23.3l5.75-1.5a11.3 11.3 0 0 0 5.7 1.45h.01c6.25 0 11.34-5.08 11.35-11.33a11.26 11.26 0 0 0-3.33-8.02" />
    </svg>
  )
}

function JanelaCompartilhar({ d, onFechar }: { d: EsquemaDetalhe; onFechar: () => void }) {
  const [estado, setEstado] = useState<Estado>({ fase: 'gerando' })
  const [copiado, setCopiado] = useState(false)
  const painel = useRef<HTMLDivElement>(null)
  const titulo = `${d.marca} ${d.modelo}`
  const sistema = SECTION_META[d.secao]?.titulo ?? ''
  const podeNativo = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  // um link novo por abertura da janela: cada envio tem as próprias 2 aberturas
  useEffect(() => {
    let vivo = true
    fetch('/api/compartilhar', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id, titulo: `${titulo} · ${sistema}` }),
    })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.erro ?? 'Não foi possível gerar o link.')
        if (vivo) setEstado({ fase: 'pronto', url: j.url, limite: j.limite })
      })
      .catch((e: Error) => vivo && setEstado({ fase: 'erro', msg: e.message }))
    return () => { vivo = false }
  }, [d.id, titulo, sistema])

  // Esc fecha; a página de trás não rola enquanto a janela está aberta
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', tecla)
    painel.current?.focus()
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = antes }
  }, [onFechar])

  const url = estado.fase === 'pronto' ? estado.url : ''
  const texto = `${titulo} · ${sistema}\nEsquema elétrico no Deepcar (o link abre ${estado.fase === 'pronto' ? estado.limite : 2} vezes):`

  async function copiar() {
    try { await navigator.clipboard.writeText(url) } catch {
      const c = document.getElementById('link-compartilhado') as HTMLInputElement | null
      c?.select(); document.execCommand?.('copy')
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2200)
  }

  async function nativo() {
    try { await navigator.share({ title: `${titulo} · Deepcar`, text: texto, url }) } catch { /* cancelado */ }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-pit/80 backdrop-blur-sm animate-[aparecer_180ms_ease-out]" onClick={onFechar} />
      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-compartilhar"
        tabIndex={-1}
        className="relative w-full max-w-[460px] rounded-t-[22px] border seam bg-bench-2 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-2xl outline-none animate-[subir_260ms_cubic-bezier(.2,.8,.2,1)] sm:rounded-[22px] sm:p-7"
      >
        {/* alça, como nas folhas do celular */}
        <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-[var(--seam-3)] sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <h2 id="titulo-compartilhar" className="text-[19px] font-semibold tracking-tight">Compartilhar esquema</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="-mr-2 -mt-1 grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-bench-3 hover:text-ink-1">
            <X size={18} />
          </button>
        </div>

        {/* o que vai */}
        <div className="mt-4 flex items-center gap-3.5 rounded-2xl border seam bg-bench-1 p-3.5">
          <span className="grid h-12 w-16 flex-none place-items-center rounded-xl border seam bg-bench-2 text-ink-1">
            <LogoMarca marca={d.marca} altura={22} larguraMax={50} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium text-ink-1">{titulo}</span>
            <span className="code block truncate text-[11.5px] uppercase tracking-[0.12em] text-ink-4">{sistema}</span>
          </span>
        </div>

        {estado.fase === 'erro' ? (
          <p role="alert" className="mt-5 rounded-xl border border-fault/30 bg-fault/10 px-4 py-3 text-[14px] text-fault">{estado.msg}</p>
        ) : (
          <>
            {/* WhatsApp em destaque: é por onde a oficina manda */}
            <a
              href={url ? `https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}` : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!url}
              className={`mt-5 flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-[#1fa855] text-[16px] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(31,168,85,0.7)] transition-[filter,transform] hover:brightness-110 active:scale-[0.99] ${url ? '' : 'pointer-events-none opacity-60'}`}
            >
              {url ? <IconeWhatsapp size={22} /> : <LoaderCircle size={20} className="animate-spin" />}
              Enviar pelo WhatsApp
            </a>

            <div className={`mt-2.5 grid gap-2.5 ${podeNativo ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <a
                href={url ? `mailto:?subject=${encodeURIComponent(`${titulo} · esquema no Deepcar`)}&body=${encodeURIComponent(`${texto}\n${url}`)}` : undefined}
                aria-disabled={!url}
                className={`opcao-compartilhar ${url ? '' : 'pointer-events-none opacity-50'}`}
              >
                <Mail size={19} /> E-mail
              </a>
              <button type="button" disabled={!url} onClick={() => void copiar()} className="opcao-compartilhar disabled:opacity-50">
                {copiado ? <Check size={19} className="text-ok" /> : <Copy size={19} />} {copiado ? 'Copiado' : 'Copiar'}
              </button>
              {podeNativo && (
                <button type="button" disabled={!url} onClick={() => void nativo()} className="opcao-compartilhar disabled:opacity-50">
                  <Share2 size={19} /> Mais
                </button>
              )}
            </div>

            <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border seam bg-well px-3">
              <Link2 size={15} className="flex-none text-ink-4" />
              <input
                id="link-compartilhado"
                readOnly
                value={url || 'Gerando link…'}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Link do esquema"
                className="code min-w-0 flex-1 bg-transparent text-[12.5px] text-ink-2 outline-none"
              />
            </label>
          </>
        )}

        <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-3">
          <span className="mt-[5px] h-1.5 w-1.5 flex-none rounded-full bg-trace" aria-hidden="true" />
          O link abre o esquema completo em tela cheia, sem precisar de conta, e pode ser aberto 2 vezes. Depois disso expira.
        </p>
      </div>
    </div>,
    document.body,
  )
}
