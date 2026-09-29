// Plano de teste (free): os caminhos para assinar, sempre levando à aba Plano da conta.
//  - SeloTeste: "Plano de teste" na barra superior (só no computador); com o teste vencido vira "Assinar plano".
//  - AssinarNoMenu: cartão com o botão de assinar no rodapé do menu lateral.
//  - AvisoTopo: faixa fina no topo da tela do celular, onde o menu lateral fica escondido.
// Sem contador: o tempo corre, mas não pressiona. Quando o teste acaba nada trava — os esquemas abrem embaçados
// (components/AssineParaAcessar.tsx). O corte que vale é do servidor (api/_lib/sessao.js responde 402).
import { Link } from 'react-router-dom'
import { ArrowRight, FlaskConical, Sparkles } from 'lucide-react'
import { DURACAO_FREE } from '../lib/plano'
import { useAcesso } from '../lib/acesso'

const PLANOS = '/app/conta?aba=plano'

/** Conta no plano de teste (admin não conta: vê tudo e não assina). */
function useTeste() {
  const { sessao, testeAcabou } = useAcesso()
  return { free: !!sessao && sessao.plano === 'free' && sessao.papel !== 'admin', acabou: testeAcabou }
}

/** Some quando não há teste (plano pago ou admin). */
export function SeloTeste({ restante }: { restante: number | null }) {
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
  return (
    <Link
      to={PLANOS}
      data-tip={`Teste gratuito de ${DURACAO_FREE} com todos os sistemas. Ver planos.`}
      data-tip-side="bottom"
      className="code hidden flex-none items-center gap-1.5 whitespace-nowrap rounded-full lg:inline-flex border border-trace/30 bg-trace/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-trace-hi transition-colors hover:border-trace/55"
    >
      <FlaskConical size={13} />
      Plano de teste
    </Link>
  )
}

/** Rodapé do menu lateral: aberto é um cartão com botão; recolhido, só o ícone com a dica. */
export function AssinarNoMenu({ collapsed }: { collapsed: boolean }) {
  const { free, acabou } = useTeste()
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
    <div className="mb-3 rounded-xl border border-trace/30 bg-trace/[0.07] p-3.5">
      <p className="code flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-trace-hi">
        <FlaskConical size={12} /> {acabou ? 'Teste encerrado' : 'Plano de teste'}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-2">
        {acabou ? 'Assine para abrir os esquemas de novo.' : 'Gostou? Assine e continue com acesso completo.'}
      </p>
      <Link to={PLANOS} className="btn-primary mt-3 inline-flex !h-10 w-full items-center justify-center gap-1.5 text-[13.5px]">
        Assinar um plano <ArrowRight size={15} />
      </Link>
    </div>
  )
}

/** Faixa fina acima da barra superior, só no celular e tablet (onde o menu lateral fica fechado). */
export function AvisoTopo() {
  const { free, acabou } = useTeste()
  if (!free) return null
  return (
    <Link
      to={PLANOS}
      className={`flex h-9 flex-none items-center justify-center gap-2 border-b px-4 text-[12.5px] lg:hidden ${
        acabou ? 'border-trace/40 bg-trace/20 text-ink-1' : 'border-trace/25 bg-trace/10 text-ink-2'
      }`}
    >
      <FlaskConical size={13} className="flex-none text-trace-hi" />
      <span className="truncate">{acabou ? 'Seu teste gratuito terminou.' : 'Você está no plano de teste.'}</span>
      <span className="inline-flex flex-none items-center gap-1 font-medium text-trace-hi">
        Assinar um plano <ArrowRight size={13} />
      </span>
    </Link>
  )
}
