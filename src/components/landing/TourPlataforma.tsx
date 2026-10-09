// "Como funciona": o passo a passo real da plataforma em telas de verdade (prints tirados em 09/10/2026 com uma conta
// Full, placa NGY4310 → Fiat Strada → injeção eletrônica → bobina de ignição). No celular: um aparelho com as telas,
// arrastar para o lado ou tocar nas setas; no computador: a lista de passos à esquerda, clicável.
// Imagens em public/landing/tour/0N.webp (780 px de largura, ~40 KB cada). Trocou a plataforma? Tire os prints de novo.
import { useCallback, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Reveal } from './Reveal'
import { registrar as anotar } from '../../lib/log'

const PASSOS = [
  {
    titulo: 'Entre na sua conta',
    texto: 'No celular, no tablet ou no computador da oficina. A mesma conta vale no site e no app.',
  },
  {
    titulo: 'Digite a placa',
    texto: 'Padrão antigo ou Mercosul. Sem a placa, dá para buscar pelo modelo, pelo motor ou pelo código.',
  },
  {
    titulo: 'Confira o veículo',
    texto: 'Montadora, modelo, ano, combustível e procedência aparecem na hora, direto da base de veículos.',
  },
  {
    titulo: 'Escolha o diagrama certo',
    texto: 'Só os esquemas compatíveis com aquele carro, cada um com motorização, sistema de gerenciamento e anos de fabricação.',
  },
  {
    titulo: 'Abra o esquema elétrico',
    texto: 'Código do motor, sistema e fabricação no topo. O desenho completo logo abaixo, em alta resolução.',
  },
  {
    titulo: 'Vá direto ao componente',
    texto: 'Digite bobina, injetor, sonda lambda, relé... e o desenho pula para ele. Sem rolar o esquema inteiro.',
  },
  {
    titulo: 'Veja cada conexão',
    texto: 'O diagrama mostra as peças, as conexões com o módulo e a informação de cada ligação, com zoom de pinça. Na bancada, com o carro na frente.',
  },
] as const

export function TourPlataforma() {
  const [i, setI] = useState(0)
  const toque = useRef<number | null>(null)
  const vistos = useRef(new Set<number>([0]))

  const ir = useCallback((n: number) => {
    const novo = (n + PASSOS.length) % PASSOS.length
    setI(novo)
    // quanto do tour a pessoa vê (/admin → Logs): uma vez por passo
    if (!vistos.current.has(novo)) { vistos.current.add(novo); anotar('tour_passo', { passo: novo + 1 }) }
  }, [])

  return (
    <section id="como-funciona" className="relative border-t seam">
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="max-w-[640px]">
          <p className="code text-[12px] uppercase tracking-[0.24em] text-trace-hi">Como funciona</p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
            Da placa ao diagrama certo em sete toques.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
            Estas são telas reais da plataforma, consultando uma Fiat Strada até chegar na bobina de ignição.
          </p>
        </Reveal>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          {/* passos: no computador ficam todos à vista e são clicáveis; no celular, só o atual (embaixo do aparelho) */}
          <ol className="hidden space-y-2 lg:block">
            {PASSOS.map((p, n) => (
              <li key={p.titulo}>
                <button
                  type="button"
                  onClick={() => ir(n)}
                  aria-current={n === i ? 'step' : undefined}
                  className={`flex w-full gap-4 rounded-2xl border p-5 text-left transition-colors ${n === i ? 'border-trace/40 bg-trace/[0.08]' : 'border-transparent hover:bg-bench-1'}`}
                >
                  <span className={`code mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full border text-[13px] ${n === i ? 'border-trace bg-trace text-white' : 'border-trace/30 text-trace-hi'}`}>
                    {n + 1}
                  </span>
                  <span>
                    <span className="block text-[17px] font-medium text-ink-1">{p.titulo}</span>
                    <span className={`block text-[15px] leading-relaxed ${n === i ? 'text-ink-2' : 'text-ink-3'}`}>{p.texto}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="mx-auto w-full max-w-[250px] sm:max-w-[300px] lg:max-w-[340px]">
            {/* aparelho */}
            <div
              className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0b0f15] p-2 lg:rounded-[44px] lg:p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
              onTouchStart={(e) => { toque.current = e.touches[0].clientX }}
              onTouchEnd={(e) => {
                if (toque.current === null) return
                const dx = e.changedTouches[0].clientX - toque.current
                toque.current = null
                if (Math.abs(dx) > 40) ir(dx < 0 ? i + 1 : i - 1)
              }}
            >
              <div className="relative aspect-[390/844] overflow-hidden rounded-[30px] bg-pit lg:rounded-[36px]">
                {PASSOS.map((p, n) => (
                  <img
                    key={p.titulo}
                    src={`/landing/tour/0${n + 1}.webp`}
                    alt={`Passo ${n + 1}: ${p.titulo}`}
                    width={780}
                    height={1688}
                    loading={n === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                    className={`absolute inset-0 h-full w-full select-none object-cover object-top transition-opacity duration-300 ${n === i ? 'opacity-100' : 'opacity-0'}`}
                  />
                ))}
              </div>
            </div>

            {/* controles */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => ir(i - 1)} aria-label="Passo anterior" className="grid h-11 w-11 place-items-center rounded-full border seam text-ink-2 hover:bg-bench-1">
                <ChevronLeft size={20} />
              </button>
              <div className="flex gap-1.5" role="tablist" aria-label="Passos">
                {PASSOS.map((p, n) => (
                  <button
                    key={p.titulo}
                    type="button"
                    role="tab"
                    aria-selected={n === i}
                    aria-label={`Passo ${n + 1}: ${p.titulo}`}
                    onClick={() => ir(n)}
                    className={`h-2 rounded-full transition-all ${n === i ? 'w-6 bg-trace' : 'w-2 bg-ink-4/50'}`}
                  />
                ))}
              </div>
              <button type="button" onClick={() => ir(i + 1)} aria-label="Próximo passo" className="grid h-11 w-11 place-items-center rounded-full border seam text-ink-2 hover:bg-bench-1">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* legenda do passo atual (celular) */}
            <div className="mt-5 min-h-[112px] lg:hidden" aria-live="polite">
              <p className="code text-[12px] uppercase tracking-[0.2em] text-trace-hi">Passo {i + 1} de {PASSOS.length}</p>
              <p className="mt-2 text-[19px] font-medium text-ink-1">{PASSOS[i].titulo}</p>
              <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-2">{PASSOS[i].texto}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
