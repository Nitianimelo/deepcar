import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BadgeDollarSign, Check, LogOut, MessageCircle, ShieldCheck, Timer, UserRound } from 'lucide-react'
import { getSession, logout, type Session } from '../lib/auth'
import { linkCheckout, linkSuporte, MINUTOS_FREE, mmss, restanteFree, rotuloPlano, temWhatsappSuporte } from '../lib/plano'
import { PLANOS_VENDA, precoDoCiclo, type Ciclo } from '../data/planos'
import { SeletorCiclo } from '../components/SeletorCiclo'

/** Como o estado da assinatura é lido na tela. */
const ESTADOS: Record<string, string> = {
  ativa: 'ativa',
  em_atraso: 'com cobrança atrasada',
  pausada: 'pausada',
  cancelada: 'cancelada',
  reembolsada: 'reembolsada',
  chargeback: 'contestada',
  manual: 'liberada pelo suporte',
  expirada: 'anual vencido',
}

// Preferências reais, guardadas neste navegador (as mesmas chaves que o visualizador e o layout leem).
const PREFS = [
  { chave: 'deepcar.desenho.escuro', rotulo: 'Desenho escuro no visualizador', ajuda: 'Inverte as cores do esquema para leitura com pouca luz.', padrao: true, ligado: (v: string | null) => v !== '0' },
  { chave: 'deepcar.sidebar.collapsed', rotulo: 'Menu lateral recolhido', ajuda: 'Vale a partir da próxima abertura.', padrao: false, ligado: (v: string | null) => v === '1' },
] as const

export default function Conta() {
  const nav = useNavigate()
  const s = getSession()
  const [params] = useSearchParams()
  // ?aba=plano: link do cadeado dos sistemas fora do plano
  const [aba, setAba] = useState<'conta' | 'plano'>(params.get('aba') === 'plano' ? 'plano' : 'conta')
  const restante = restanteFree(s)
  if (!s) return null

  async function sair() {
    await logout()
    nav('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Conta</p>
      <div className="mt-3 flex items-center gap-4">
        <span className="grid h-14 w-14 flex-none place-items-center rounded-full border seam-strong bg-bench-3 text-ink-2">
          <UserRound size={24} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-semibold tracking-tight sm:text-3xl">{s.nome}</h1>
          <p className="truncate text-ink-3">{s.email}</p>
        </div>
      </div>

      <div className="mt-7 flex items-center gap-1 rounded-lg border seam bg-bench-2 p-1 w-fit">
        {([['conta', 'Conta', UserRound], ['plano', 'Plano', BadgeDollarSign]] as const).map(([k, rotulo, Icone]) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k)}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[13.5px] ${aba === k ? 'bg-bench-3 text-ink-1' : 'text-ink-3 hover:text-ink-1'}`}
          >
            <Icone size={15} /> {rotulo}
          </button>
        ))}
      </div>

      {aba === 'plano' ? (
        <AbaPlano s={s} restante={restante} />
      ) : (
      <>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <section className="rounded-xl border seam bg-bench-2 p-5">
          <h2 className="font-medium">Oficina</h2>
          <dl className="mt-3 space-y-2 text-[14px]">
            <Row k="Nome" v={s.oficina} />
            <Row k="Plano" v={rotuloPlano(s.plano)} />
            {s.whatsapp && <Row k="WhatsApp" v={s.whatsapp.replace(/^55(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')} />}
          </dl>
          <button type="button" onClick={() => setAba('plano')} className="mt-3 inline-flex items-center gap-1.5 border-t seam-soft pt-3 text-[13px] text-trace hover:text-trace-hi">
            {restante !== null && restante > 0 ? `Restam ${mmss(restante)} de acesso gratuito · ver planos` : 'Ver planos e assinar'}
            <ArrowRight size={14} />
          </button>
        </section>

        <section className="rounded-xl border seam bg-bench-2 p-5">
          <h2 className="flex items-center gap-2 font-medium"><ShieldCheck size={17} className="text-ok" /> Acesso</h2>
          <dl className="mt-3 space-y-2 text-[14px]">
            <Row k="Sessão" v="Este dispositivo" />
            {s.acesso && s.papel !== 'admin' && (
              <Row k="Aparelhos" v={s.acesso.dispositivos ? `até ${s.acesso.dispositivos} ao mesmo tempo` : 'sem limite'} />
            )}
            <Row k="Autenticação" v="E-mail e senha" />
          </dl>
        </section>
      </div>

      <section className="mt-5 rounded-xl border seam bg-bench-2 p-5">
        <h2 className="font-medium">Preferências</h2>
        <p className="mt-0.5 text-[13px] text-ink-4">Guardadas neste navegador.</p>
        <div className="mt-4 space-y-4 text-[14px]">
          {PREFS.map((p) => <Toggle key={p.chave} {...p} />)}
        </div>
      </section>

      </>
      )}

      <div className="mt-8 flex justify-end">
        <button onClick={sair} className="btn-ghost inline-flex items-center gap-2 hover:!border-fault/40 hover:!text-fault">
          <LogOut size={16} /> Sair da conta
        </button>
      </div>
    </div>
  )
}

/** Aba Plano: em que pé está a assinatura e como assinar (ou trocar de plano). */
function AbaPlano({ s, restante }: { s: Session; restante: number | null }) {
  const pago = s.plano === 'pro' || s.plano === 'full'
  const mensagem = `Olá! Sou ${s.nome} (${s.email}) e quero falar sobre a assinatura do Deepcar.`
  const cicloAtual: Ciclo = s.assinatura?.ciclo === 'anual' ? 'anual' : 'mensal'
  // quem já paga abre no ciclo que tem; quem ainda não paga abre no anual, que é o mais barato
  const [ciclo, setCiclo] = useState<Ciclo>(pago ? cicloAtual : 'anual')
  const validoAte = s.assinatura?.validoAte ? new Date(s.assinatura.validoAte).toLocaleDateString('pt-BR') : null

  return (
    <div className="mt-6">
      {/* situação atual */}
      <section className="rounded-xl border seam bg-bench-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Plano atual</p>
            <p className="mt-1 text-[22px] font-semibold tracking-tight">
              {rotuloPlano(s.plano)}
              {pago && s.assinatura?.ciclo && <span className="ml-2 text-[15px] font-normal text-ink-3">{s.assinatura.ciclo}</span>}
            </p>
          </div>
          {s.assinatura && (
            <span className={`code text-[12px] ${s.assinatura.emAtraso ? 'text-warn' : s.assinatura.status === 'expirada' ? 'text-fault' : 'text-ok'}`}>
              {ESTADOS[s.assinatura.status] ?? s.assinatura.status}
              {pago && cicloAtual === 'anual' && validoAte
                ? ` · válido até ${validoAte}`
                : s.assinatura.renovaEm && ` · renova ${new Date(s.assinatura.renovaEm).toLocaleDateString('pt-BR')}`}
            </span>
          )}
        </div>

        {!pago && (
          <p className="mt-3 flex items-center gap-2 border-t seam-soft pt-3 text-[13.5px] text-ink-3">
            <Timer size={15} className="flex-none text-trace" />
            {restante !== null && restante > 0
              ? <>Você está no teste gratuito: restam <b className="font-medium text-ink-1">{mmss(restante)}</b> dos {MINUTOS_FREE} minutos.</>
              : <>Seu teste de {MINUTOS_FREE} minutos terminou. Assine para voltar a consultar.</>}
          </p>
        )}
        {s.assinatura?.emAtraso && (
          <p className="mt-3 border-t seam-soft pt-3 text-[13.5px] text-warn">
            A última cobrança falhou. O acesso continua enquanto a Cakto tenta de novo — vale conferir o cartão.
          </p>
        )}
      </section>

      {/* planos */}
      <div className="mt-6 flex justify-center">
        <SeletorCiclo ciclo={ciclo} onChange={setCiclo} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {PLANOS_VENDA.map((p) => {
          // quem tem o anual já pagou o ano: o plano dele fica "ativo" nas duas abas, sem convite a pagar a mensal
          const atual = s.plano === p.id && (cicloAtual === ciclo || cicloAtual === 'anual')
          const anual = ciclo === 'anual'
          // mesmo plano, outro ciclo: o botão vira "passar para anual/mensal"
          const mesmoPlano = s.plano === p.id
          return (
            <section key={p.id} className={`flex flex-col rounded-xl border p-5 ${atual ? 'border-ok/40 bg-bench-1' : 'seam bg-bench-2'}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[18px] font-semibold tracking-tight">{p.nome}</h2>
                {atual && <span className="code text-[10.5px] uppercase tracking-[0.18em] text-ok">seu plano</span>}
              </div>
              <p className="mt-1 text-[13.5px] text-ink-3">{p.para}</p>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[13px] text-ink-4">R$</span>
                <span className="text-[30px] font-semibold leading-none tracking-[-0.02em]" style={{ fontVariantNumeric: 'tabular-nums' }}>{precoDoCiclo(p, ciclo)}</span>
                <span className="text-[13px] text-ink-4">/mês</span>
              </p>
              <ul className="mb-6 mt-4 space-y-1.5 text-[13.5px]">
                {p.itens.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-ink-2">
                    <Check size={13} className="mt-[4px] flex-none text-trace/70" strokeWidth={2.5} /> {i}
                  </li>
                ))}
              </ul>
              {atual ? (
                <span className="mt-auto inline-flex h-11 items-center justify-center rounded-[10px] border seam text-[14px] text-ink-4">
                  Plano ativo
                </span>
              ) : (
                <a
                  href={linkCheckout(p.id, s, ciclo)}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-[10px] text-[14px] font-medium ${p.destaque || !pago ? 'btn-primary !h-11' : 'btn-ghost !h-11'}`}
                >
                  {!pago
                    ? `Assinar ${p.nome}${anual ? ' anual' : ''}`
                    : mesmoPlano
                      ? `Passar para ${anual ? 'anual' : 'mensal'}`
                      : `Trocar para ${p.nome}${anual ? ' anual' : ''}`}{' '}
                  <ArrowRight size={15} />
                </a>
              )}
            </section>
          )
        })}
      </div>

      {pago && cicloAtual === 'mensal' && ciclo === 'anual' && (
        <p className="mt-4 rounded-lg border border-warn/25 bg-warn/5 px-3.5 py-2.5 text-[12.5px] text-ink-2">
          Já paga o mensal? Depois que o anual for aprovado, fale com o suporte para cancelar a cobrança mensal: ela
          não para sozinha.
        </p>
      )}

      <p className="mt-4 text-[12.5px] text-ink-4">
        O pagamento é processado pela Cakto. O acesso libera assim que o pagamento é aprovado, sem precisar
        recarregar.{' '}
        <a href={linkSuporte(mensagem, 'Deepcar · assinatura')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-trace hover:text-trace-hi">
          <MessageCircle size={13} /> {temWhatsappSuporte ? 'Falar no WhatsApp' : 'Falar com o suporte'}
        </a>{' '}
        para trocar o cartão, cancelar ou tirar dúvidas.
      </p>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{k}</dt>
      <dd className="text-ink-1">{v}</dd>
    </div>
  )
}

function Toggle({ chave, rotulo, ajuda, padrao, ligado }: (typeof PREFS)[number]) {
  const [on, setOn] = useState(() => {
    try { const v = localStorage.getItem(chave); return v === null ? padrao : ligado(v) } catch { return padrao }
  })
  function mudar(v: boolean) {
    setOn(v)
    try { localStorage.setItem(chave, v ? '1' : '0') } catch { /* ignore */ }
  }
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 select-none">
      <span>
        <span className="block text-ink-2">{rotulo}</span>
        <span className="block text-[12px] text-ink-4">{ajuda}</span>
      </span>
      <input type="checkbox" checked={on} onChange={(e) => mudar(e.target.checked)} className="peer sr-only" />
      <span
        className={`relative h-6 w-11 flex-none rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-trace/50 ${
          on ? 'border-trace/60 bg-trace/25' : 'seam-strong bg-well'
        }`}
      >
        <span className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full transition-transform ${on ? 'translate-x-5 bg-trace-hi' : 'bg-ink-3'}`} />
      </span>
    </label>
  )
}
