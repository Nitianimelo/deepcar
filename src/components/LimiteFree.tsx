// Plano de teste (free): os caminhos para assinar, sempre levando à aba Plano da conta.
//  - SeloTeste: na barra superior (só no computador): "Teste grátis · Assinar"; vencido, vira "Assinar plano".
//  - AssinarNoMenu: cartão com o botão de assinar no rodapé do menu lateral.
//  - AvisoTopo: faixa no topo da tela do celular (onde o menu lateral fica escondido).
// Desde 07/10/2026 o teste do site vale por consultas (api/_lib/consultas.js) e a tela NÃO mostra quanto falta nem
// o limite (decisão do dono): os avisos só convidam a assinar. Quando o teste acaba nada trava: os esquemas abrem
// embaçados (components/AssineParaAcessar.tsx). O corte que vale é do servidor (402).
import { OFERTA, PLANOS_VENDA, precoPrimeiroMes } from '../data/planos'
import { Link } from 'react-router-dom'
import { ArrowRight, FlaskConical, Sparkles } from 'lucide-react'
import { useAcesso } from '../lib/acesso'

const PLANOS = '/app/conta?aba=plano'

/** Conta no plano de teste (admin não conta: vê tudo e não assina). */
function useTeste() {
  const { sessao, testeAcabou } = useAcesso()
  const free = !!sessao && sessao.plano === 'free' && sessao.papel !== 'admin'
  return { free, acabou: free && testeAcabou }
}

/** Some quando não há teste (plano pago ou admin). */
export function SeloTeste() {
  const { free, acabou } = useTeste()
  if (!free) return null
  if (acabou) {
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
      data-tip="Você está no teste grátis. Ver planos."
      data-tip-side="bottom"
      className="hidden flex-none items-center gap-2 whitespace-nowrap rounded-full border border-trace/30 bg-trace/10 px-3 py-1 text-[12.5px] text-ink-2 transition-colors hover:border-trace/55 lg:inline-flex"
    >
      <FlaskConical size={14} className="text-trace-hi" />
      <span>Teste grátis</span>
      <span className="font-medium text-trace-hi">Assinar</span>
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
    // fundo cinza sólido (antes era vazado, deixava ver a grade do menu por trás)
    <div className="seam-strong mb-3 rounded-xl border bg-bench-3 p-3.5">
      <p className="code flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.16em] text-trace-hi">
        <FlaskConical size={12} /> {acabou ? 'Teste encerrado' : 'Teste grátis'}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-2">
        {acabou
          ? 'Assine para abrir os esquemas de novo.'
          : 'Gostou? Assine e tenha acesso completo, sem interrupção.'}
      </p>
      <Link to={PLANOS} className="btn-primary mt-3 inline-flex !h-10 w-full items-center justify-center gap-1.5 text-[13.5px]">
        Assinar um plano <ArrowRight size={15} />
      </Link>
    </div>
  )
}

/** Faixa acima da barra superior, só no celular e tablet (onde o menu lateral fica fechado). */
export function AvisoTopo() {
  const { free, acabou } = useTeste()
  if (!free) return null
  return (
    // com a oferta do 1º mês (data/planos.ts → OFERTA), a faixa vira a mesma faixa laranja da página de vendas
    OFERTA.ativa ? (
      <Link to={PLANOS} className="flex h-10 flex-none items-center justify-center gap-2 bg-gradient-to-r from-[#ff3d00] via-[#ff6a00] to-[#ff9100] px-4 text-[13px] font-semibold text-white lg:hidden">
        <span className="truncate">🔥 {acabou ? 'Teste encerrado: ' : ''}1º mês por R$ {precoPrimeiroMes(PLANOS_VENDA[0])}</span>
        <span className="inline-flex flex-none items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[12px] font-bold text-[#e03800]">
          Pegar oferta <ArrowRight size={12} />
        </span>
      </Link>
    ) : (
    <Link
      to={PLANOS}
      className={`flex h-10 flex-none items-center justify-center gap-2 border-b px-4 text-[13px] lg:hidden ${
        acabou ? 'border-trace/40 bg-trace/20 text-ink-1' : 'border-trace/25 bg-trace/10 text-ink-2'
      }`}
    >
      <FlaskConical size={14} className="flex-none text-trace-hi" />
      <span className="truncate">{acabou ? 'Seu teste gratuito terminou.' : 'Você está no teste grátis.'}</span>
      <span className="inline-flex flex-none items-center gap-1 font-semibold text-trace-hi">
        Assinar <ArrowRight size={13} />
      </span>
    </Link>
    )
  )
}
