import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BadgeDollarSign, LogOut, MessageCircle, ShieldCheck, Timer, UserRound } from 'lucide-react'
import { getSession, logout, type Session } from '../lib/auth'
import { avisarCheckout, duracaoTeste, linkCheckout, linkSuporte, restanteFree, rotuloPlano, tempoRestante, temWhatsappSuporte } from '../lib/plano'
import { PLANOS_VENDA, type Ciclo } from '../data/planos'
import { CartaoPlanoClaro, ChaveCiclo } from '../components/landing/PlanosLanding'
import { classeBotaoClaro } from '../components/landing/estiloPlanos'

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
  const [params, setParams] = useSearchParams()
  // a aba vive na URL (?aba=plano): o cadeado, o menu e o aviso do celular levam direto aos planos,
  // inclusive quando a pessoa já está na tela da conta
  const aba: 'conta' | 'plano' = params.get('aba') === 'plano' ? 'plano' : 'conta'
  const setAba = (k: 'conta' | 'plano') => setParams(k === 'plano' ? { aba: 'plano' } : {}, { replace: true })
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
            {restante !== null && restante > 0 ? `Plano de teste: restam ${tempoRestante(restante)} · ver planos` : 'Ver planos e assinar'}
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

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Link to="/excluir-conta" className="text-[13px] text-ink-4 hover:text-fault">Excluir conta</Link>
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
  // sempre abre no anual (o mais barato por mês): quem paga o mensal já vê ali o convite para passar ao anual
  const [ciclo, setCiclo] = useState<Ciclo>('anual')
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
            {/* num span só: solto no flex, o texto e o negrito viravam colunas no celular */}
            <span>
              {restante !== null && restante > 0
                ? <>Você está no plano de teste: restam <b className="font-medium text-ink-1">{tempoRestante(restante)}</b> das {duracaoTeste(s.testeMinutos)}.</>
                : <>Seu teste de {duracaoTeste(s.testeMinutos)} terminou. Escolha um plano abaixo para abrir os esquemas.</>}
            </span>
          </p>
        )}
        {s.assinatura?.emAtraso && (
          <p className="mt-3 border-t seam-soft pt-3 text-[13.5px] text-warn">
            A última cobrança falhou. O acesso continua enquanto a Cakto tenta de novo — vale conferir o cartão.
          </p>
        )}
      </section>

      {/* planos: o mesmo padrão claro da página de vendas (components/landing/PlanosLanding.tsx) */}
      <section className="mt-6 rounded-2xl bg-papel p-4 text-tinta-1 sm:p-7">
        <div className="text-center">
          <h2 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{pago ? 'Seu plano e as opções' : 'Escolha seu plano'}</h2>
          <p className="mx-auto mt-1.5 max-w-[560px] text-[14.5px] leading-relaxed text-tinta-2">
            Mensal no cartão ou Pix. Anual em até 12x no cartão ou à vista no Pix, pagamento único que vale 12 meses.
          </p>
          <div className="mt-5 flex justify-center">
            <ChaveCiclo ciclo={ciclo} onChange={setCiclo} />
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-[920px] items-stretch gap-6 md:grid-cols-2">
          {PLANOS_VENDA.map((p) => {
            // quem tem o anual já pagou o ano: o plano dele fica "ativo" nas duas abas, sem convite a pagar a mensal
            const atual = s.plano === p.id && (cicloAtual === ciclo || cicloAtual === 'anual')
            const anual = ciclo === 'anual'
            // mesmo plano, outro ciclo: o botão vira "passar para anual/mensal"
            const mesmoPlano = s.plano === p.id
            return (
              <CartaoPlanoClaro
                key={p.id}
                p={p}
                ciclo={ciclo}
                atual={atual}
                acao={atual ? (
                  <span className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-azul-escuro/30 bg-azul-escuro/[0.06] text-[14.5px] font-semibold text-azul-escuro">
                    Plano ativo
                  </span>
                ) : (
                  <>
                    <a
                      href={linkCheckout(p.id, s, ciclo)}
                      onClick={() => avisarCheckout(p.id, ciclo)}
                      target="_blank"
                      rel="noreferrer"
                      className={classeBotaoClaro(p.destaque)}
                    >
                      {!pago
                        ? `Assinar ${p.nome}${anual ? ' anual' : ''}`
                        : mesmoPlano
                          ? `Passar para ${anual ? 'anual' : 'mensal'}`
                          : `Trocar para ${p.nome}${anual ? ' anual' : ''}`}
                      <ArrowRight size={16} />
                    </a>
                    <p className="mt-2.5 text-center text-[12.5px] text-tinta-3">Abre o pagamento seguro da Cakto em outra aba.</p>
                  </>
                )}
              />
            )
          })}
        </div>

        {pago && cicloAtual === 'mensal' && ciclo === 'anual' && (
          <p className="mx-auto mt-6 max-w-[920px] rounded-xl border border-aviso-claro-borda bg-aviso-claro px-4 py-3 text-[13.5px] text-tinta-1">
            Já paga o mensal? Depois que o anual for aprovado, fale com o suporte para cancelar a cobrança mensal: ela
            não para sozinha.
          </p>
        )}

        <p className="mx-auto mt-6 max-w-[920px] text-center text-[13px] leading-relaxed text-tinta-3">
          O pagamento é processado pela Cakto. O acesso libera assim que o pagamento é aprovado, sem precisar
          recarregar.{' '}
          <a href={linkSuporte(mensagem, 'Deepcar · assinatura')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-azul-escuro hover:underline">
            <MessageCircle size={13} /> {temWhatsappSuporte ? 'Falar no WhatsApp' : 'Falar com o suporte'}
          </a>{' '}
          para trocar o cartão, cancelar ou tirar dúvidas.
        </p>
      </section>
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
