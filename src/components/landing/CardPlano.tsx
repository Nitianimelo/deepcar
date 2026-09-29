// Cartão de plano: landing, aba Plano da conta e convite depois do teste (quem chama passa o botão em `acao`).
// Um holofote segue o ponteiro (preenchimento + borda acesa, efeito "Card Spotlight" do 21st.dev feito em CSS)
// e o plano em destaque tem uma borda viva girando em volta. O preço conta até o valor quando o cartão entra
// na tela. O miolo é o painel de módulos (components/PlanoDetalhes.tsx). Estilos em index.css (.plano*).
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Car, Zap } from 'lucide-react'
import { precoDoCiclo, type Ciclo, type PlanoVenda } from '../../data/planos'
import { ExtrasPlano, PainelSistemas } from '../PlanoDetalhes'

/**
 * Conta até o preço ("47,90") em ~900 ms, com desaceleração no fim: de 0 quando o cartão aparece,
 * e do valor atual quando a chave Mensal/Anual troca. Sem animação quando o sistema pede.
 */
function usePrecoContando(preco: string, ativo: boolean) {
  const alvo = Number(preco.replace(',', '.'))
  const [parado] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [valor, setValor] = useState(parado ? alvo : 0)
  const atual = useRef(valor)
  useEffect(() => {
    if (!ativo || parado) return
    const de = atual.current
    let raf = 0
    const t0 = performance.now()
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - t0) / (de ? 500 : 900))
      atual.current = de + (alvo - de) * (1 - Math.pow(1 - p, 3))
      setValor(atual.current)
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [ativo, alvo, parado])
  // sem animação o número acompanha a chave direto, sem passar por estado
  return (parado ? alvo : valor).toFixed(2).replace('.', ',')
}

type Props = {
  p: PlanoVenda
  ciclo?: Ciclo
  /** botão do rodapé; sem ele, "Criar conta grátis" (landing) */
  acao?: ReactNode
  /** plano que a conta já tem: selo verde no lugar do "Mais completo" */
  atual?: boolean
  /** cartão mais baixo, para caber dois lado a lado no convite do esquema embaçado */
  compacto?: boolean
}

export function CardPlano({ p, ciclo = 'mensal', acao, atual = false, compacto = false }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [visto, setVisto] = useState(false)
  const alvo = precoDoCiclo(p, ciclo)
  const preco = usePrecoContando(alvo, visto)

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

  const pad = compacto ? 'p-4 sm:p-5' : 'p-6 sm:p-7'

  return (
    <article
      ref={ref}
      onPointerMove={mover}
      className={`plano relative flex h-full flex-col overflow-hidden rounded-[18px] border ${p.destaque ? 'plano-destaque border-transparent bg-bench-1' : 'seam bg-bench-1'} ${atual ? '!border-ok/45' : ''} ${visto ? 'is-visto' : ''}`}
    >
      {p.destaque && <span aria-hidden="true" className="plano-borda-viva" />}

      {/* faixa: o motivo de escolher, numa linha — nos dois cartões, para o conteúdo ficar alinhado lado a lado */}
      <div
        className={`flex items-center gap-2 px-5 py-2 text-[12.5px] font-medium sm:px-6 ${
          p.destaque ? 'plano-faixa text-white' : 'border-b seam bg-bench-2 text-ink-2'
        }`}
      >
        {p.destaque ? <Zap size={14} className="flex-none" /> : <Car size={14} className="flex-none text-trace-hi" />} {p.chamada}
      </div>

      <div className={`flex flex-1 flex-col ${pad}`}>
        <header className="flex items-center justify-between gap-3">
          <h3 className={`${compacto ? 'text-[20px]' : 'text-[24px]'} font-semibold tracking-tight`}>{p.nome}</h3>
          {atual ? (
            <span className="code rounded-full border border-ok/35 bg-ok/10 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.16em] text-ok">Seu plano</span>
          ) : p.destaque && (
            <span className="plano-selo code inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-[10.5px] uppercase tracking-[0.18em] text-ok">
              <span className="h-1.5 w-1.5 rounded-full bg-ok pad-pulse" /> Mais completo
            </span>
          )}
        </header>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{p.para}</p>

        {/* no anual mostra só o valor por mês: o parcelamento em 12x aparece no checkout */}
        <p className={`flex items-baseline gap-2 ${compacto ? 'mt-3' : 'mt-5'}`}>
          <span className="text-[14px] text-ink-4">R$</span>
          <span
            className={`${compacto ? 'text-[38px]' : 'text-[48px]'} font-semibold leading-none tracking-[-0.03em] text-ink-1`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
            aria-label={`${alvo} reais por mês`}
          >
            {preco}
          </span>
          <span className="text-[14px] text-ink-4">/mês</span>
        </p>

        <div className={compacto ? 'mt-3' : 'mt-5'}>
          <PainelSistemas p={p} />
        </div>
        <div className={`${compacto ? 'mb-4 mt-3.5' : 'mb-7 mt-5'} px-0.5`}>
          <ExtrasPlano p={p} />
        </div>

        <div className="plano-cta-caixa mt-auto">
          {acao ?? (
            <Link
              to="/cadastro"
              className={`plano-cta group inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] text-[15px] font-medium ${p.destaque ? 'btn-cta' : 'btn-ghost !h-12 hover:!border-ok/40'}`}
            >
              Criar conta grátis
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
