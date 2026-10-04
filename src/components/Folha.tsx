// Folha que sobe de baixo (no computador, um cartão centralizado embaixo): boas-vindas e convites da plataforma.
// Pensada para celular fraco: sem desfoque (backdrop-filter pesa em aparelho de entrada), só opacidade e transform,
// e nada anima com prefers-reduced-motion. O voltar do Android fecha a folha em vez de sair da página: ao abrir,
// empilha um estado no histórico (com o idx do React Router, para ele não se perder) e o "voltar" só o desempilha.
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type Props = {
  aberta: boolean
  onFechar: () => void
  titulo: ReactNode
  children: ReactNode
  /** botões do rodapé */
  acoes: ReactNode
  /** some o véu escuro: usado quando a folha aponta para um elemento da tela (o destaque faz o escuro) */
  semVeu?: boolean
}

export function Folha({ aberta, onFechar, titulo, children, acoes, semVeu = false }: Props) {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const fechar = useRef(onFechar)
  useEffect(() => { fechar.current = onFechar })

  useEffect(() => {
    if (!aberta) return
    history.pushState({ ...history.state, deepcarFolha: true }, '')
    const voltar = () => fechar.current()
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar.current() }
    window.addEventListener('popstate', voltar)
    window.addEventListener('keydown', tecla)
    // foco no primeiro botão: leitor de tela e teclado começam na folha
    const primeiro = ref.current?.querySelector<HTMLElement>('[data-foco]') ?? ref.current?.querySelector<HTMLElement>('button, a')
    primeiro?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('popstate', voltar)
      window.removeEventListener('keydown', tecla)
      // fechou por botão: tira o estado que a folha empilhou (fechou pelo voltar: ele já saiu)
      if (history.state?.deepcarFolha) history.back()
    }
  }, [aberta])

  if (!aberta) return null
  return createPortal(
    <div className="folha-raiz fixed inset-0 z-[70] flex items-end justify-center sm:items-end sm:pb-8">
      {!semVeu && <div aria-hidden="true" onClick={onFechar} className="folha-veu absolute inset-0 bg-black/60" />}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="folha relative w-full max-w-[460px] rounded-t-2xl border-t seam bg-bench-2 px-5 pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] sm:rounded-2xl sm:border"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        {/* alça: no celular mostra que é uma folha */}
        <span aria-hidden="true" className="mx-auto -mt-1 mb-3 block h-1 w-10 rounded-full bg-ink-4/40 sm:hidden" />
        <button type="button" onClick={onFechar} aria-label="Fechar" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-ink-3 hover:bg-bench-3 hover:text-ink-1">
          <X size={18} />
        </button>
        <h2 id={id} className="pr-10 text-[19px] font-semibold leading-snug tracking-tight">{titulo}</h2>
        <div className="mt-2 text-[15px] leading-relaxed text-ink-2">{children}</div>
        <div className="mt-5 grid gap-2.5">{acoes}</div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Destaque de um elemento da tela durante as boas-vindas: um recorte com sombra gigante em volta (um elemento só,
 * barato), posicionado sobre o retângulo do alvo. Fica fora da árvore do alvo para não ser cortado por overflow.
 */
export function Destaque({ alvo }: { alvo: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${alvo}"]`)
    const caixa = ref.current
    if (!el || !caixa) return
    el.scrollIntoView({ block: 'center', behavior: 'auto' })
    let raf = 0
    const posicionar = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        Object.assign(caixa.style, { top: `${r.top - 6}px`, left: `${r.left - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px`, opacity: '1' })
      })
    }
    posicionar()
    window.addEventListener('resize', posicionar)
    window.addEventListener('scroll', posicionar, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', posicionar)
      window.removeEventListener('scroll', posicionar, true)
    }
  }, [alvo])
  return createPortal(
    <div
      ref={ref}
      aria-hidden="true"
      className="destaque pointer-events-none fixed z-[65] rounded-2xl opacity-0"
      style={{ boxShadow: '0 0 0 3px var(--color-trace), 0 0 0 9999px rgba(0,0,0,0.62)' }}
    />,
    document.body,
  )
}
