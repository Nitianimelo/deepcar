// Tela no lugar do conteúdo quando o sistema (ou a busca pela placa) não faz parte do plano da conta.
// Não é erro: é o convite para o Full, com o checkout já preenchido e o caminho para a aba Plano.
import { Link } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { linkCheckout, rotuloPlano } from '../lib/plano'
import { useAcesso } from '../lib/acesso'

export function BloqueioPlano({ titulo, oQue }: { titulo: string; oQue: string }) {
  const { sessao } = useAcesso()
  const pago = sessao?.plano === 'pro' || sessao?.plano === 'full'

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:py-24">
      <div className="rounded-2xl border seam bg-bench-2 p-7 sm:p-9">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-trace/30 bg-trace/10 text-trace-hi">
          <Lock size={20} />
        </span>
        <p className="code mt-5 text-[11px] uppercase tracking-[0.2em] text-ink-4">{titulo}</p>
        <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">
          {oQue} não faz parte do plano {rotuloPlano(sessao?.plano)}.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          O plano Full libera todos os sistemas, leve e diesel, e a busca pela placa.
        </p>
        <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
          <a
            href={linkCheckout('full', sessao, 'anual')}
            target="_blank"
            rel="noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2 px-5"
          >
            {pago ? 'Passar para o Full' : 'Assinar o Full'} <ArrowRight size={16} />
          </a>
          <Link to="/app/conta?aba=plano" className="btn-ghost inline-flex !h-12 items-center justify-center">
            Ver planos
          </Link>
        </div>
        <p className="mt-5 text-[12.5px] text-ink-4">Depois do pagamento aprovado, o acesso libera sozinho aqui.</p>
      </div>
    </div>
  )
}
