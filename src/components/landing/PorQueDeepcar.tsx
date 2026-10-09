// "Por que assinar a Deepcar em vez de comprar um manual em PDF" (09/10/2026, pedido do dono): comparativo lado a lado,
// linha por linha. Animação: quando a seção aparece, as linhas entram uma a uma, o ✓ da Deepcar "salta" e o ✗ do PDF
// apaga (CSS .comparativo em index.css; sem animação para quem pede menos movimento).
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, FileText, X } from 'lucide-react'
import { Reveal } from './Reveal'
import { OFERTA, PLANOS_VENDA, precoPrimeiroMes } from '../../data/planos'

const LINHAS: { tema: string; deepcar: string; pdf: string }[] = [
  { tema: 'Achar o veículo', deepcar: 'Pela placa, em segundos: marca, modelo, ano e motor.', pdf: 'Procurar arquivo por arquivo, pasta por pasta.' },
  { tema: 'Cobertura', deepcar: 'Mais de 20 mil sistemas, cobrindo 98% da frota nacional.', pdf: 'Um carro ou uma marca por arquivo.' },
  { tema: 'Atualizações', deepcar: 'Novos modelos todo mês, sem pagar nada a mais.', pdf: 'Fica desatualizado. Versão nova é comprar de novo.' },
  { tema: 'Achar a peça', deepcar: 'Digite bobina, injetor ou sonda e o diagrama vai direto nela.', pdf: 'Rolar página por página até achar.' },
  { tema: 'Sistemas', deepcar: 'Injeção, ABS, elétrica e câmbio, do leve ao diesel.', pdf: 'Normalmente só um sistema por manual.' },
  { tema: 'No celular', deepcar: 'Feito para a tela do celular, com zoom de pinça e tela cheia.', pdf: 'Arquivo pesado, difícil de ler no celular.' },
  { tema: 'Suporte', deepcar: 'Suporte especializado no WhatsApp.', pdf: 'Comprou, ficou sozinho.' },
]

export function PorQueDeepcar() {
  const ref = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setVisivel(true); return }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisivel(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section id="por-que" className="relative border-t seam">
      <div className="mx-auto max-w-[980px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-[700px] text-center">
          <p className="code text-[12px] uppercase tracking-[0.24em] text-trace-hi">Deepcar × manual em PDF</p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.1rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
            Por que assinar em vez de comprar um manual pronto?
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-2">O PDF resolve um carro. A Deepcar resolve a oficina inteira.</p>
        </Reveal>

        <div ref={ref} className={`comparativo mt-12 ${visivel ? 'is-in' : ''}`}>
          {/* cabeçalho das duas colunas */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-trace/50 bg-trace/15 px-3 py-4 text-center shadow-[0_0_40px_rgba(74,141,255,0.25)]">
              <img src="/brand/logo-h-light.png" alt="Deepcar" className="h-5 sm:h-6" draggable={false} />
            </div>
            <div className="flex items-center justify-center gap-2 rounded-2xl border seam bg-bench-1 px-3 py-4 text-[15px] font-medium text-ink-3 sm:text-[16px]">
              <FileText size={18} aria-hidden="true" /> Manual em PDF
            </div>
          </div>

          <ul className="mt-3 grid gap-3 sm:gap-4">
            {LINHAS.map((l, i) => (
              <li key={l.tema} className="comparativo-linha" style={{ ['--i' as string]: i }}>
                <p className="code mb-1.5 px-1 text-[11px] uppercase tracking-[0.2em] text-ink-4">{l.tema}</p>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-start gap-2.5 rounded-xl border border-trace/30 bg-trace/[0.08] p-3.5 sm:p-4">
                    <span className="comparativo-sim mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-emerald-500 text-white"><Check size={15} strokeWidth={3} /></span>
                    <span className="text-[14px] leading-snug text-ink-1 sm:text-[15.5px]">{l.deepcar}</span>
                  </div>
                  <div className="comparativo-pdf flex items-start gap-2.5 rounded-xl border seam bg-bench-1 p-3.5 sm:p-4">
                    <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-fault/20 text-fault"><X size={15} strokeWidth={3} /></span>
                    <span className="text-[14px] leading-snug text-ink-3 sm:text-[15.5px]">{l.pdf}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Reveal className="mt-10 flex flex-col items-center gap-3 text-center">
          <a href="#planos" className="btn-cta btn-cta-grande inline-flex items-center justify-center gap-2 px-6">
            {OFERTA.ativa ? `Começar por R$ ${precoPrimeiroMes(PLANOS_VENDA[0])}` : 'Ver planos'} <ArrowRight size={19} />
          </a>
          <p className="text-[13.5px] text-ink-3">Pix ou cartão. Cancele quando quiser.</p>
        </Reveal>
      </div>
    </section>
  )
}
