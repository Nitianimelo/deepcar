// Plano de teste (free): os caminhos para assinar, sempre levando à aba Plano da conta.
//  - SeloTeste: na barra superior (só no computador), com o tempo que falta; vencido, vira "Assinar plano".
//  - AssinarNoMenu: cartão com o tempo que falta e o botão de assinar no rodapé do menu lateral.
//  - AvisoTopo: faixa no topo da tela do celular (onde o menu lateral fica escondido), com o tempo que falta.
// O tempo restante aparece sempre (decisão de 2026-10-03: funil mais incisivo); nas últimas 2 horas o tom muda
// para aviso. Quando o teste acaba nada trava: os esquemas abrem embaçados (components/AssineParaAcessar.tsx).
// O corte que vale é do servidor (api/_lib/sessao.js responde 402).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, FlaskConical, Sparkles, Timer } from 'lucide-react'
import { duracaoTeste, restanteFree, tempoRestante } from '../lib/plano'
import { useAcesso } from '../lib/acesso'

const PLANOS = '/app/conta?aba=plano'

/** Conta no plano de teste (admin não conta: vê tudo e não assina). */
function useTeste() {
  const { sessao, testeAcabou } = useAcesso()
  // relógio de minuto em minuto: o texto "restam 6 h 20 min" acompanha sem custar nada
  const [agora, setAgora] = useState(() => Date.now())
  const free = !!sessao && sessao.plano === 'free' && sessao.papel !== 'admin'
  useEffect(() => {
    if (!free || testeAcabou) return
    const t = window.setInterval(() => setAgora(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [free, testeAcabou])
  const restante = free && !testeAcabou ? restanteFree(sessao, agora) : null
  return { free, acabou: testeAcabou, restante, final: restante !== null && restante <= RETA_FINAL }
}

/** Últimas 2 horas: o aviso muda de tom. */
const RETA_FINAL = 2 * 60 * 60 * 1000

/** Some quando não há teste (plano pago ou admin). */
export function SeloTeste({ restante }: { restante: number | null }) {
  const { sessao } = useAcesso()
  if (restante === null) return null
  if (restante <= 0) {
    return (
      <Link
        to={PLANOS}
        data-tip="O teste gratuito terminou. Assine para abrir os esquemas."
        data-tip-side="bottom"
        className="btn-primary hidden !h-9 flex-none lg:inline-flex items-center gap-1.5 whitespace-nowrap !px-3 text-[13px] sm:!px-3.5"
      >
        <span>Assinar<span className="hidden sm:inline"> plano</span></span> <ArrowRight size={14} />
      </Link>
    )
  }
  const final = restante <= RETA_FINAL
  return (
    <Link
      to={PLANOS}
      data-tip={`Teste gratuito de ${duracaoTeste(sessao?.testeMinutos)}. Ver planos.`}
      data-tip-side="bottom"
      className={`hidden flex-none items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-[12.5px] transition-colors lg:inline-flex ${
        final ? 'border-warn/50 bg-warn/15 text-ink-1 hover:border-warn' : 'border-trace/30 bg-trace/10 text-ink-2 hover:border-trace/55'
      }`}
    >
      <Timer size={14} className={final ? 'text-warn' : 'text-trace-hi'} />
      <span>Teste: <b className="font-semibold text-ink-1">{tempoRestante(restante)}</b></span>
      <span className={`font-medium ${final ? 'text-warn' : 'text-trace-hi'}`}>Assinar</span>
    </Link>
  )
}

/** Rodapé do menu lateral: aberto é um cartão com botão; recolhido, só o ícone com a dica. */
export function AssinarNoMenu({ collapsed }: { collapsed: boolean }) {
  const { free, acabou, restante, final } = useTeste()
  if (!free) return null
  if (collapsed) {
    return (
      <Link
        to={PLANOS}
        aria-label="Assinar um plano"
        data-tip={acabou ? 'Teste encerrado: assinar um plano' : 'Assinar um plano'}
        data-tip-side="right"
        className="btn-primary mb-2 grid !h-10 w-full place-items-center !px-0"
      >
        <Sparkles size={17} />
      </Link>
    )
  }
  return (
    // fundo cinza sólido (antes era vazado, deixava ver a grade do menu por trás)
    <div className={`mb-3 rounded-xl border bg-bench-3 p-3.5 ${final ? 'border-warn/50' : 'seam-strong'}`}>
      <p className={`code flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] ${final ? 'text-warn' : 'text-trace-hi'}`}>
        <FlaskConical size={12} /> {acabou ? 'Teste encerrado' : 'Plano de teste'}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-2">
        {acabou
          ? 'Assine para abrir os esquemas de novo.'
          : restante !== null
            ? <>Restam <b className="font-semibold text-ink-1">{tempoRestante(restante)}</b> do teste. Assine e continue com acesso completo.</>
            : 'Gostou? Assine e continue com acesso completo.'}
      </p>
      <Link to={PLANOS} className="btn-primary mt-3 inline-flex !h-10 w-full items-center justify-center gap-1.5 text-[13.5px]">
        Assinar um plano <ArrowRight size={15} />
      </Link>
    </div>
  )
}

/** Faixa acima da barra superior, só no celular e tablet (onde o menu lateral fica fechado). */
export function AvisoTopo() {
  const { free, acabou, restante, final } = useTeste()
  if (!free) return null
  const texto = acabou
    ? 'Seu teste gratuito terminou.'
    : restante === null
      ? 'Você está no plano de teste.'
      : final
        ? <>Seu teste acaba em <b className="font-semibold">{tempoRestante(restante)}</b></>
        : <>Teste grátis: restam <b className="font-semibold text-ink-1">{tempoRestante(restante)}</b></>
  return (
    <Link
      to={PLANOS}
      className={`flex h-10 flex-none items-center justify-center gap-2 border-b px-4 text-[13px] lg:hidden ${
        acabou ? 'border-trace/40 bg-trace/20 text-ink-1' : final ? 'border-warn/40 bg-warn/15 text-ink-1' : 'border-trace/25 bg-trace/10 text-ink-2'
      }`}
    >
      {acabou ? <FlaskConical size={14} className="flex-none text-trace-hi" /> : <Timer size={14} className={`flex-none ${final ? 'text-warn' : 'text-trace-hi'}`} />}
      <span className="truncate">{texto}</span>
      <span className={`inline-flex flex-none items-center gap-1 font-semibold ${final ? 'text-warn' : 'text-trace-hi'}`}>
        Assinar <ArrowRight size={13} />
      </span>
    </Link>
  )
}
