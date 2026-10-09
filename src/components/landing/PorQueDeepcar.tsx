// "Manual em PDF ou Deepcar?" (09/10/2026, pedido do dono; redesenhada no mesmo dia para ficar mais sóbria): uma tabela
// comparativa só, com linhas finas e a coluna da Deepcar destacada como uma faixa contínua. No celular, o critério vira
// uma linha curta acima das duas colunas. Entrada discreta: as linhas aparecem em sequência (.comparativo no index.css).
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Minus } from 'lucide-react'
import { Reveal } from './Reveal'
import { OFERTA, PLANOS_VENDA, precoPrimeiroMes } from '../../data/planos'

const LINHAS: { tema: string; deepcar: string; pdf: string }[] = [
  { tema: 'Encontrar o veículo', deepcar: 'Pela placa, em segundos', pdf: 'Procurando arquivo por arquivo' },
  { tema: 'Cobertura', deepcar: '20 mil sistemas, 98% da frota nacional', pdf: 'Um modelo ou uma marca por arquivo' },
  { tema: 'Atualizações', deepcar: 'Mensais, já incluídas no plano', pdf: 'Desatualiza; versão nova é outra compra' },
  { tema: 'Encontrar o componente', deepcar: 'Busca direta: bobina, injetor, sonda', pdf: 'Rolando página por página' },
  { tema: 'Sistemas', deepcar: 'Injeção, ABS, elétrica e câmbio, leve e diesel', pdf: 'Em geral, um sistema por manual' },
  { tema: 'Uso no celular', deepcar: 'Tela feita para o celular, com zoom', pdf: 'Arquivo pesado, difícil de ler' },
  { tema: 'Suporte', deepcar: 'Equipe técnica no WhatsApp', pdf: 'Sem suporte depois da compra' },
]

export function PorQueDeepcar() {
  const ref = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisivel(true); return }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisivel(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section id="por-que" className="relative border-t seam">
      <div className="mx-auto max-w-[1040px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="max-w-[640px]">
          <h2 className="text-[clamp(1.9rem,3.6vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.02em]">Manual em PDF ou Deepcar?</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
            O PDF resolve um carro. A assinatura acompanha a oficina inteira, todos os dias, com o acervo sempre atualizado.
          </p>
        </Reveal>

        <div ref={ref} className={`comparativo mt-10 overflow-hidden rounded-2xl border seam bg-bench-1 ${visivel ? 'is-in' : ''}`}>
          {/* cabeçalho */}
          <div className="grid grid-cols-2 text-[14px] sm:grid-cols-[1.1fr_1.2fr_1fr]">
            <div className="hidden px-6 py-5 sm:block" />
            <div className="sm:border-x sm:border-trace/25 bg-trace/[0.07] px-4 py-5 sm:px-6">
              <img src="/brand/logo-h-light.png" alt="Deepcar" className="h-[22px]" draggable={false} />
            </div>
            <div className="px-4 py-5 font-medium text-ink-3 sm:px-6">Manual em PDF</div>
          </div>

          <ul>
            {LINHAS.map((l, i) => (
              <li key={l.tema} className="comparativo-linha grid grid-cols-2 border-t seam text-[14.5px] sm:grid-cols-[1.1fr_1.2fr_1fr] sm:text-[15px]" style={{ ['--i' as string]: i }}>
                <div className="col-span-2 px-4 pb-0 pt-4 text-[12.5px] font-medium text-ink-4 sm:col-span-1 sm:px-6 sm:py-5 sm:text-[15px] sm:text-ink-2">{l.tema}</div>
                <div className="flex items-start gap-2.5 sm:border-x sm:border-trace/25 bg-trace/[0.07] px-4 pb-4 pt-2 sm:px-6 sm:py-5">
                  <Check size={17} strokeWidth={2.4} className="mt-[3px] flex-none text-trace-hi" aria-label="Sim" />
                  <span className="leading-snug text-ink-1">{l.deepcar}</span>
                </div>
                <div className="flex items-start gap-2.5 px-4 pb-4 pt-2 sm:px-6 sm:py-5">
                  <Minus size={17} strokeWidth={2} className="mt-[3px] flex-none text-ink-4" aria-label="Não" />
                  <span className="leading-snug text-ink-3">{l.pdf}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Reveal className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] text-ink-3">
            {OFERTA.ativa ? <>Comece por <b className="font-semibold text-ink-1">R$ {precoPrimeiroMes(PLANOS_VENDA[0])}</b> no primeiro mês. Pix ou cartão, sem fidelidade.</> : 'Pix ou cartão, sem fidelidade.'}
          </p>
          <a href="#planos" className="btn-cta inline-flex h-12 items-center justify-center gap-2 px-6">
            Ver planos <ArrowRight size={18} />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
