// Cartão de plano da landing. Um holofote segue o ponteiro (preenchimento + borda acesa, efeito "Card Spotlight"
// do 21st.dev feito em CSS) e o plano em destaque tem uma borda viva girando em volta. O preço conta até o valor
// quando o cartão entra na tela. Estilos em index.css (.plano*).
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import type { PlanoVenda } from '../../data/planos'

/** Conta de 0 até o preço ("47,90") em ~900 ms, com desaceleração no fim. Sem animação quando o sistema pede. */
function usePrecoContando(preco: string, ativo: boolean) {
  const alvo = Number(preco.replace(',', '.'))
  const [parado] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [valor, setValor] = useState(parado ? alvo : 0)
  useEffect(() => {
    if (!ativo || parado) return
    let raf = 0
    const t0 = performance.now()
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - t0) / 900)
      setValor(alvo * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [ativo, alvo, parado])
  return valor.toFixed(2).replace('.', ',')
}

export function CardPlano({ p }: { p: PlanoVenda }) {
  const ref = useRef<HTMLElement>(null)
  const [visto, setVisto] = useState(false)
  const preco = usePrecoContando(p.preco, visto)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisto(true); io.disconnect() } }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  function mover(e: PointerEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <article
      ref={ref}
      onPointerMove={mover}
      className={`plano relative flex h-full flex-col rounded-[18px] border bg-bench-1 p-7 sm:p-8 ${p.destaque ? 'plano-destaque border-transparent' : 'seam'} ${visto ? 'is-visto' : ''}`}
    >
      {p.destaque && <span aria-hidden="true" className="plano-borda-viva" />}

      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-[20px] font-semibold tracking-tight">{p.nome}</h3>
        {p.destaque && (
          <span className="plano-selo code inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.18em] text-ok">
            <span className="h-1.5 w-1.5 rounded-full bg-ok pad-pulse" /> Mais completo
          </span>
        )}
      </header>
      <p className="mt-1.5 min-h-[42px] max-w-[34ch] text-[14px] leading-relaxed text-ink-3">{p.para}</p>

      <p className="mt-6 flex items-baseline gap-2 border-t seam-soft pt-6">
        <span className="text-[14px] text-ink-4">R$</span>
        <span
          className="text-[44px] font-semibold leading-none tracking-[-0.03em] text-ink-1"
          style={{ fontVariantNumeric: 'tabular-nums' }}
          aria-label={`${p.preco} reais`}
        >
          {preco}
        </span>
        <span className="text-[14px] text-ink-4">/mês</span>
      </p>

      {/* lista longa (Full) em duas colunas de texto: flui sem abrir buracos entre as linhas */}
      <ul className={`plano-itens mb-9 mt-7 border-t seam-soft pt-6 text-[14px] ${p.itens.length > 7 ? 'sm:columns-2 sm:gap-x-7' : ''}`}>
        {p.itens.map((item, i) => (
          <li key={item} style={{ '--i': i } as React.CSSProperties} className="flex items-start gap-2.5 break-inside-avoid pb-2.5 text-ink-2 last:pb-0">
            <Check size={14} className={`mt-[4px] flex-none ${p.destaque ? 'text-ok/80' : 'text-trace/70'}`} strokeWidth={2.5} /> {item}
          </li>
        ))}
      </ul>

      <Link
        to="/cadastro"
        className={`plano-cta group mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-[10px] text-[15px] font-medium ${p.destaque ? 'btn-cta' : 'btn-ghost !h-12 hover:!border-ok/40'}`}
      >
        Criar conta grátis
        <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
      </Link>
    </article>
  )
}
