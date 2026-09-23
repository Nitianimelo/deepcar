// Plano free: o contador na barra superior e a tela que fecha o acesso quando ele zera.
//
// A regra também vale no servidor (api/_lib/sessao.js responde 402 nas rotas de conteúdo);
// esta camada é a parte que a pessoa vê — e é honesta: mostra o tempo correndo antes de barrar.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, LogOut, MessageCircle, Timer } from 'lucide-react'
import { getSession, logout } from '../lib/auth'
import { linkCheckout, linkSuporte, mmss, MINUTOS_FREE, temWhatsappSuporte } from '../lib/plano'
import { planoVenda, precoDoCiclo, type Ciclo } from '../data/planos'
import { SeletorCiclo } from './SeletorCiclo'

/** Pastilha discreta com o que resta. Some quando não há relógio (plano pago ou admin). */
export function ContadorFree({ restante }: { restante: number | null }) {
  if (restante === null || restante <= 0) return null
  const apertado = restante < 60_000
  return (
    <span
      data-tip={`Plano Free: ${MINUTOS_FREE} minutos de acesso. Depois é preciso assinar.`}
      data-tip-side="bottom"
      className={`code inline-flex flex-none items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] ${
        apertado ? 'border-warn/40 bg-warn/10 text-warn' : 'seam bg-bench-2 text-ink-3'
      }`}
    >
      <Timer size={13} className={apertado ? '' : 'text-trace'} />
      Free · {mmss(restante)}
    </span>
  )
}

/** Tela de fim de teste: cobre tudo e não fecha — a saída é assinar, falar com o suporte ou sair. */
export function BloqueioFree() {
  const nav = useNavigate()
  const sessao = getSession()
  const [ciclo, setCiclo] = useState<Ciclo>('anual')
  // a mesma tela fecha o acesso quando o anual vence (api/_lib/sessao.js → vencerAnual)
  const anualVenceu = sessao?.assinatura?.status === 'expirada'
  const preco = (id: 'pro' | 'full') => `R$ ${precoDoCiclo(planoVenda(id), ciclo)}/mês`

  // com a tela travada, rolar o que está atrás só confunde
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = antes }
  }, [])

  async function sair() {
    await logout()
    nav('/login', { replace: true })
  }

  const mensagem = 'Olá! Usei os minutos gratuitos do Deepcar e quero assinar para continuar consultando os esquemas.'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fim-do-teste"
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-pit/85 p-5 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-[520px] rounded-2xl border seam bg-bench-2 p-7 sm:p-9">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-warn/30 bg-warn/10 text-warn">
          <CircleAlert size={22} />
        </span>

        <h2 id="fim-do-teste" className="mt-5 text-[26px] font-semibold leading-tight tracking-tight">
          {anualVenceu ? 'Seu plano anual terminou.' : `Seus ${MINUTOS_FREE} minutos gratuitos terminaram.`}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          {anualVenceu
            ? 'Os 12 meses do seu plano chegaram ao fim. Renove para continuar consultando os manuais de injeção leve e diesel, ABS, elétrica e câmbio.'
            : 'O plano Free serve para você conhecer o acervo. Para continuar consultando os manuais de injeção leve e diesel, ABS, elétrica e câmbio, assine um plano ou fale com a gente.'}
        </p>

        <SeletorCiclo ciclo={ciclo} onChange={setCiclo} className="mt-6 w-full" />

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <a
            href={linkCheckout('full', sessao, ciclo)}
            autoFocus
            target="_blank"
            rel="noreferrer"
            className="btn-primary inline-flex items-center justify-center px-5"
          >
            Assinar Full · {preco('full')}
          </a>
          <a
            href={linkCheckout('pro', sessao, ciclo)}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost inline-flex items-center justify-center !h-12"
          >
            Assinar Pro · {preco('pro')}
          </a>
        </div>
        <a
          href={linkSuporte(mensagem)}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 inline-flex w-full items-center justify-center gap-2 text-[13.5px] text-ink-3 hover:text-ink-1"
        >
          <MessageCircle size={15} /> {temWhatsappSuporte ? 'Falar no WhatsApp' : 'Falar com o suporte'}
        </a>

        <div className="mt-6 flex items-center justify-between gap-4 border-t seam-soft pt-5">
          <p className="text-[12.5px] text-ink-4">
            Já assinou? O acesso libera sozinho aqui, sem precisar recarregar.
          </p>
          <button type="button" onClick={() => void sair()} className="inline-flex flex-none items-center gap-1.5 text-[13px] text-ink-3 hover:text-fault">
            <LogOut size={15} /> Sair
          </button>
        </div>
      </div>
    </div>
  )
}
