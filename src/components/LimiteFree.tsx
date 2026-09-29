// Plano free na barra superior: só o selo "Plano de teste", sem contador (o tempo corre, mas não pressiona).
// Quando o teste acaba nada trava: o selo vira o botão de assinar e os esquemas abrem embaçados
// (components/AssineParaAcessar.tsx). O corte que vale é do servidor (api/_lib/sessao.js responde 402).
import { Link } from 'react-router-dom'
import { ArrowRight, FlaskConical } from 'lucide-react'
import { DURACAO_FREE } from '../lib/plano'

/** Some quando não há teste (plano pago ou admin). */
export function SeloTeste({ restante }: { restante: number | null }) {
  if (restante === null) return null
  if (restante <= 0) {
    return (
      <Link
        to="/app/conta?aba=plano"
        data-tip="O teste gratuito terminou. Assine para abrir os esquemas."
        data-tip-side="bottom"
        className="btn-primary inline-flex !h-9 flex-none items-center gap-1.5 whitespace-nowrap !px-3 text-[13px] sm:!px-3.5"
      >
        <span>Assinar<span className="hidden sm:inline"> plano</span></span> <ArrowRight size={14} />
      </Link>
    )
  }
  return (
    <Link
      to="/app/conta?aba=plano"
      data-tip={`Teste gratuito de ${DURACAO_FREE} com todos os sistemas. Ver planos.`}
      data-tip-side="bottom"
      className="code inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full border border-trace/30 bg-trace/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-trace-hi transition-colors hover:border-trace/55"
    >
      <FlaskConical size={13} />
      <span className="hidden sm:inline">Plano de teste</span>
      <span className="sm:hidden">Teste</span>
    </Link>
  )
}
