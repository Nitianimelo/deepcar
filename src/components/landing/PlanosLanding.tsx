// Seção de planos da landing: fundo cinza-claro, cartões brancos e texto que explica o pagamento
// (mensal no cartão ou Pix; anual em até 12x no cartão ou à vista no Pix). Sem as cores do chicote:
// aqui a pessoa decide o que comprar, então tudo é lista simples. `CartaoPlanoClaro` e `ChaveCiclo` também servem
// a aba Plano da conta (src/pages/Conta.tsx), dentro de um painel claro; o convite do fim do teste segue com o CardPlano.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, CreditCard, Flame, Minus, QrCode, ShieldCheck, Zap } from 'lucide-react'
import { NAV } from '../../data/nav'
import { OFERTA, PLANOS_VENDA, economiaAnual, economiaPrimeiroMes, numero, precoPrimeiroMes, type Ciclo, type PlanoVenda } from '../../data/planos'
import { Reveal } from './Reveal'
import { BotaoEquipe } from './BotaoWhatsapp'
import { classeBotaoClaro } from './estiloPlanos'
import { IconeGooglePlay, LINK_GOOGLE_PLAY, PlayStoreBadge } from '../StoreBadges'
import { viuPlanos } from '../../lib/pixel'
import { abrirCheckout, linkCheckout } from '../../lib/plano'
import { EVENTO_CARRO, type CarroEscolhido } from './BuscaCarro'


/** Sistemas na ordem do menu, com o nome completo ("Injeção eletrônica diesel"). */
const SISTEMAS = NAV.flatMap((n) =>
  n.kind === 'group'
    ? n.children.map((c) => ({ key: c.key, nome: `${n.label.replace('Injeção Eletrônica', 'Injeção eletrônica')} ${c.label.toLowerCase()}` }))
    : [{ key: n.key, nome: 'ABS e ESP' }],
)

const MAIOR_ANUAL = Math.max(...PLANOS_VENDA.map((p) => economiaAnual(p).pct))
const MENOR_1MES = PLANOS_VENDA.map((p) => precoPrimeiroMes(p)).sort((a, b) => numero(a) - numero(b))[0]

export function ChaveCiclo({ ciclo, onChange }: { ciclo: Ciclo; onChange: (c: Ciclo) => void }) {
  const opcoes: { id: Ciclo; rotulo: string; selo: string; seloCurto: string; laranja: boolean }[] = [
    { id: 'mensal', rotulo: 'Mensal', selo: OFERTA.ativa ? `1º mês R$ ${MENOR_1MES}` : 'sem fidelidade', seloCurto: OFERTA.ativa ? `R$ ${MENOR_1MES}` : '', laranja: OFERTA.ativa },
    { id: 'anual', rotulo: 'Anual', selo: `${MAIOR_ANUAL}% OFF`, seloCurto: `-${MAIOR_ANUAL}%`, laranja: true },
  ]
  return (
    <div role="radiogroup" aria-label="Forma de pagamento" className="inline-grid grid-cols-2 rounded-full border border-papel-linha bg-papel-card p-1 text-[14.5px] shadow-sm">
      {opcoes.map((o) => {
        const ativo = ciclo === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o.id)}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-escuro/50 sm:px-5 ${
              ativo ? 'bg-tinta-1 text-white' : 'text-tinta-2 hover:text-tinta-1'
            }`}
          >
            {o.rotulo}
            {o.selo && (
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-bold ${o.laranja ? 'bg-[#ff5a1f] text-white' : ativo ? 'bg-white/15 text-white' : 'bg-azul-escuro/10 text-azul-escuro'}`}>
                <span className="sm:hidden">{o.seloCurto || o.selo}</span>
                <span className="hidden sm:inline">{o.selo}</span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** "De R$ X por" + o preço grande: a âncora é sempre um preço real (mensalidade cheia / 12 mensalidades). */
function DePor({ de, por, sufixo }: { de: string; por: string; sufixo: string }) {
  return (
    <>
      <p className="mt-4 text-[14.5px] text-tinta-3">
        De <span className="font-medium line-through decoration-[#ff5a1f]/70 decoration-2">R$ {de}</span> por
      </p>
      <p className="mt-0.5 flex items-baseline gap-1.5 text-tinta-1">
        <span className="text-[17px] font-semibold">R$</span>
        <span className="text-[52px] font-bold leading-none tracking-[-0.03em]">{por}</span>
        <span className="text-[15px] font-medium text-tinta-3">{sufixo}</span>
      </p>
    </>
  )
}

function Preco({ p, ciclo }: { p: PlanoVenda; ciclo: Ciclo }) {
  if (ciclo === 'mensal') {
    const eco = economiaPrimeiroMes(p)
    return (
      <div className="mt-6">
        {OFERTA.ativa ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5a1f] px-3 py-1 text-[12.5px] font-bold uppercase tracking-wide text-white">
              <Flame size={14} aria-hidden="true" /> 1º mês por R$ {p.primeiroMes}
            </span>
            <DePor de={p.preco} por={p.primeiroMes} sufixo="no 1º mês" />
            <p className="mt-2 inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-[13.5px] font-semibold text-emerald-700">
              Você economiza R$ {eco.reais} ({eco.pct}%) no primeiro mês
            </p>
            {/* linha do tempo da cobrança: o que paga hoje e o que paga depois, sem surpresa */}
            <ol className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-papel-linha text-[13px]">
              <li className="bg-[#fff4ee] p-3">
                <span className="block font-semibold uppercase tracking-wide text-[#e03800]">Hoje</span>
                <span className="mt-0.5 block text-[18px] font-bold text-tinta-1">R$ {p.primeiroMes}</span>
                <span className="block text-tinta-3">1º mês</span>
              </li>
              <li className="border-l border-papel-linha bg-papel p-3">
                <span className="block font-semibold uppercase tracking-wide text-tinta-3">A partir do 2º mês</span>
                <span className="mt-0.5 block text-[18px] font-bold text-tinta-1">R$ {p.preco}</span>
                <span className="block text-tinta-3">por mês</span>
              </li>
            </ol>
          </>
        ) : (
          <p className="flex items-baseline gap-1.5 text-tinta-1">
            <span className="text-[16px] font-medium">R$</span>
            <span className="text-[46px] font-semibold leading-none tracking-[-0.03em]">{p.preco}</span>
            <span className="text-[15px] text-tinta-3">/mês</span>
          </p>
        )}
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-tinta-2">
          <span className="inline-flex items-center gap-1.5"><QrCode size={15} className="text-tinta-3" aria-hidden="true" /> Pix</span>
          <span className="inline-flex items-center gap-1.5"><CreditCard size={15} className="text-tinta-3" aria-hidden="true" /> Cartão</span>
          <span>· Sem fidelidade, cancele quando quiser</span>
        </p>
      </div>
    )
  }
  const eco = economiaAnual(p)
  return (
    <div className="mt-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5a1f] px-3 py-1 text-[12.5px] font-bold uppercase tracking-wide text-white">
        <Flame size={14} aria-hidden="true" /> {eco.pct}% OFF no anual
      </span>
      <DePor de={p.anualDe} por={p.precoAnualVista} sufixo="por 12 meses" />
      <p className="mt-1.5 text-[15px] text-tinta-2">
        Equivale a <strong className="font-semibold text-tinta-1">R$ {p.precoAnual}/mês</strong>
      </p>
      <p className="mt-2 inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-[13.5px] font-semibold text-emerald-700">
        Você economiza R$ {eco.reais} no ano
      </p>
      <div className="mt-5 grid gap-2 rounded-xl border border-papel-linha bg-papel p-3.5 text-[13.5px] text-tinta-2">
        <p className="flex items-center gap-2.5">
          <QrCode size={16} className="flex-none text-tinta-3" aria-hidden="true" />
          <span><strong className="font-semibold text-tinta-1">Pix à vista:</strong> R$ {p.precoAnualVista}</span>
        </p>
        <p className="flex items-center gap-2.5">
          <CreditCard size={16} className="flex-none text-tinta-3" aria-hidden="true" />
          <span><strong className="font-semibold text-tinta-1">Cartão:</strong> em até 12x</span>
        </p>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-tinta-3">Pagamento único que vale 12 meses. Não renova sozinho.</p>
    </div>
  )
}

type PropsCartao = {
  p: PlanoVenda
  ciclo: Ciclo
  /** botão do rodapé; sem ele, "Começar com o teste grátis" (landing) */
  acao?: ReactNode
  /** plano que a conta já tem: selo "Seu plano" no lugar do "Mais completo" */
  atual?: boolean
}

export function CartaoPlanoClaro({ p, ciclo, acao, atual = false }: PropsCartao) {
  const tem = new Set(p.secoes)
  const itens = [
    ...SISTEMAS.map((s) => ({ nome: s.nome, ok: tem.has(s.key) })),
    { nome: 'Busca pela placa do veículo', ok: p.placa },
    { nome: `${p.aparelhos} aparelhos conectados ao mesmo tempo`, ok: true },
    { nome: 'App para Android, tablet e computador', ok: true },
    { nome: 'Suporte pelo WhatsApp', ok: true },
  ]
  return (
    <article className={`relative flex h-full flex-col rounded-2xl border bg-papel-card p-6 text-tinta-1 shadow-[0_1px_2px_rgba(15,23,32,0.06),0_8px_24px_rgba(15,23,32,0.06)] sm:p-8 ${atual || p.destaque ? 'border-azul-escuro ring-1 ring-azul-escuro' : 'border-papel-linha'}`}>
      {(atual || p.destaque) && (
        <span className="absolute -top-3 left-6 rounded-full bg-azul-escuro px-3 py-1 text-[12px] font-semibold text-white sm:left-8">{atual ? 'Seu plano' : 'Mais completo'}</span>
      )}
      <h3 className="text-[26px] font-semibold tracking-tight">{p.nome}</h3>
      <p className="mt-1 text-[14.5px] text-tinta-2">{p.para}</p>

      <Preco p={p} ciclo={ciclo} />

      <p className="mt-7 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-tinta-3">O que está incluso</p>
      <ul className="mt-3 grid gap-2.5 text-[14.5px]">
        {itens.map((i) => (
          <li key={i.nome} className={`flex items-start gap-2.5 ${i.ok ? 'text-tinta-1' : 'text-tinta-3'}`}>
            {i.ok
              ? <Check size={17} strokeWidth={2.5} className="mt-0.5 flex-none text-azul-escuro" aria-hidden="true" />
              : <Minus size={17} className="mt-0.5 flex-none text-tinta-3" aria-hidden="true" />}
            <span>
              {i.nome}
              {!i.ok && <span className="sr-only"> (não incluso)</span>}
              {!i.ok && <span className="ml-1.5 text-[12.5px]">· só no Full</span>}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        {acao ?? (
          <>
            {/* página de vendas (09/10/2026): assina direto no checkout, sem precisar de conta antes; o plano entra
                sozinho quando a conta é criada com o mesmo e-mail (api/_lib/assinatura.js → pendentes) */}
            <a
              href={linkCheckout(p.id, null, ciclo)}
              onClick={(e) => abrirCheckout(e, p.id, ciclo, null)}
              className={classeBotaoClaro(p.destaque)}
            >
              {ciclo === 'mensal' && OFERTA.ativa ? `Quero o ${p.nome} por R$ ${precoPrimeiroMes(p)}` : `Quero o ${p.nome}${ciclo === 'anual' ? ` anual com ${economiaAnual(p).pct}% OFF` : ''}`} <span aria-hidden="true">→</span>
            </a>
            <p className="mt-2.5 text-center text-[12.5px] text-tinta-3">
              Pix ou cartão. Prefere conhecer antes? <Link to="/cadastro" className="font-medium text-azul-escuro underline-offset-4 hover:underline">Teste grátis</Link>
            </p>
            <a
              href={LINK_GOOGLE_PLAY}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-[13.5px] font-medium text-azul-escuro underline-offset-4 hover:underline"
            >
              <IconeGooglePlay className="h-4 w-4" /> Baixar o app Android
            </a>
          </>
        )}
      </div>
    </article>
  )
}


export function PlanosLanding() {
  // com a oferta da 1ª mensalidade ligada, a página abre no mensal (é onde está o desconto)
  const [ciclo, setCiclo] = useState<Ciclo>(OFERTA.ativa ? 'mensal' : 'anual')
  const secao = useRef<HTMLElement>(null)
  // carro escolhido na busca "Veja se tem o seu carro" (BuscaCarro): aparece em destaque em cima dos planos
  const [carro, setCarro] = useState<CarroEscolhido | null>(null)
  useEffect(() => {
    const ouvir = (e: Event) => setCarro((e as CustomEvent<CarroEscolhido>).detail)
    window.addEventListener(EVENTO_CARRO, ouvir)
    return () => window.removeEventListener(EVENTO_CARRO, ouvir)
  }, [])
  const soFull = !!carro?.secoes.some((s) => s.endsWith('diesel'))
  // ViewContent quando os planos aparecem na tela (uma vez por visita à página): sinal de interesse para a Meta
  useEffect(() => {
    const el = secao.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver((itens) => {
      if (itens.some((i) => i.isIntersecting)) { viuPlanos(); obs.disconnect() }
    }, { threshold: 0.25 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <section ref={secao} id="planos" className="secao-clara bg-papel text-tinta-1">
      <div className="mx-auto max-w-[1100px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-[680px] text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-azul-escuro">Planos</p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em]">Escolha o plano da sua oficina</h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-tinta-2">
            O <strong className="font-semibold text-tinta-1">Pro</strong> para veículos leves ou o{' '}
            <strong className="font-semibold text-tinta-1">Full</strong> para atender do leve ao diesel.
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2 text-[13.5px] font-medium text-tinta-2">
            <li className="inline-flex items-center gap-1.5 rounded-full border border-papel-linha bg-papel-card px-3 py-1.5"><QrCode size={15} className="text-azul-escuro" aria-hidden="true" /> Pix ou cartão</li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-papel-linha bg-papel-card px-3 py-1.5"><Zap size={15} className="text-azul-escuro" aria-hidden="true" /> Acesso liberado na hora</li>
            <li className="inline-flex items-center gap-1.5 rounded-full border border-papel-linha bg-papel-card px-3 py-1.5"><ShieldCheck size={15} className="text-azul-escuro" aria-hidden="true" /> 7 dias de garantia</li>
          </ul>
        </Reveal>

        {carro && (
          <div className="mx-auto mt-8 max-w-[680px] rounded-2xl border border-azul-escuro/30 bg-azul-escuro/[0.06] px-5 py-4 text-center text-[15px] text-tinta-1">
            Para abrir os esquemas do <strong className="font-semibold">{carro.nome}</strong>, escolha o plano
            {soFull ? <> <strong className="font-semibold">Full</strong> (tem diagrama de linha diesel).</> : ' Pro ou Full.'}
          </div>
        )}

        <Reveal index={1} className="mt-9 flex justify-center">
          <ChaveCiclo ciclo={ciclo} onChange={setCiclo} />
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-[920px] items-stretch gap-6 md:grid-cols-2">
          {PLANOS_VENDA.map((p, i) => (
            <Reveal key={p.id} index={i + 1}>
              <CartaoPlanoClaro p={p} ciclo={ciclo} />
            </Reveal>
          ))}
        </div>

        {/* Os dois jeitos de começar, logo abaixo dos planos: cadastro no site ou o app Android. */}
        <Reveal index={2} className="mx-auto mt-8 max-w-[920px]">
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-papel-linha bg-papel-card px-5 py-5 text-center sm:flex-row sm:gap-6 sm:text-left">
            <p className="text-[15px] font-semibold">Comece agora, grátis:</p>
            <Link to="/cadastro" className={`${classeBotaoClaro(true)} sm:w-auto sm:px-6`}>
              Criar minha conta <span aria-hidden="true">→</span>
            </Link>
            <PlayStoreBadge />
          </div>
        </Reveal>
        <Reveal index={3} className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-[15.5px] text-tinta-2">Ficou em dúvida sobre qual plano escolher?</p>
          <BotaoEquipe />
        </Reveal>
      </div>
    </section>
  )
}
