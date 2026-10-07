// Seção de planos da landing: fundo cinza-claro, cartões brancos e texto que explica o pagamento
// (mensal no cartão ou Pix; anual em até 12x no cartão ou à vista no Pix). Sem as cores do chicote:
// aqui a pessoa decide o que comprar, então tudo é lista simples. `CartaoPlanoClaro` e `ChaveCiclo` também servem
// a aba Plano da conta (src/pages/Conta.tsx), dentro de um painel claro; o convite do fim do teste segue com o CardPlano.
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, CreditCard, Minus, QrCode } from 'lucide-react'
import { NAV } from '../../data/nav'
import { PLANOS_VENDA, type Ciclo, type PlanoVenda } from '../../data/planos'
import { Reveal } from './Reveal'
import { BotaoEquipe } from './BotaoWhatsapp'
import { classeBotaoClaro } from './estiloPlanos'
import { IconeGooglePlay, LINK_GOOGLE_PLAY, PlayStoreBadge } from '../StoreBadges'

const reais = (v: string) => Number(v.replace('.', '').replace(',', '.'))
const brl = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Sistemas na ordem do menu, com o nome completo ("Injeção eletrônica diesel"). */
const SISTEMAS = NAV.flatMap((n) =>
  n.kind === 'group'
    ? n.children.map((c) => ({ key: c.key, nome: `${n.label.replace('Injeção Eletrônica', 'Injeção eletrônica')} ${c.label.toLowerCase()}` }))
    : [{ key: n.key, nome: 'ABS e ESP' }],
)

/** Economia de pagar o anual (12x) em vez de 12 mensalidades, em % inteiro. */
function economia(p: PlanoVenda) {
  const mensal = reais(p.preco) * 12
  return { reais: mensal - reais(p.precoAnual) * 12, pct: Math.round((1 - reais(p.precoAnual) / reais(p.preco)) * 100) }
}
const MAIOR_ECONOMIA = Math.max(...PLANOS_VENDA.map((p) => economia(p).pct))

export function ChaveCiclo({ ciclo, onChange }: { ciclo: Ciclo; onChange: (c: Ciclo) => void }) {
  const opcoes: { id: Ciclo; rotulo: string; extra?: string }[] = [
    { id: 'mensal', rotulo: 'Mensal' },
    { id: 'anual', rotulo: 'Anual', extra: `economize até ${MAIOR_ECONOMIA}%` },
  ]
  return (
    <div role="radiogroup" aria-label="Forma de pagamento" className="inline-grid grid-cols-2 rounded-full border border-papel-linha bg-papel-card p-1 text-[14px] shadow-sm">
      {opcoes.map((o) => {
        const ativo = ciclo === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o.id)}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul-escuro/50 ${
              ativo ? 'bg-tinta-1 text-white' : 'text-tinta-2 hover:text-tinta-1'
            }`}
          >
            {o.rotulo}
            {o.extra && (
              // celular estreito: só "-38%", para a chave não quebrar em duas linhas
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${ativo ? 'bg-white/15 text-white' : 'bg-azul-escuro/10 text-azul-escuro'}`}>
                <span className="sm:hidden">-{MAIOR_ECONOMIA}%</span>
                <span className="hidden sm:inline">{o.extra}</span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Preco({ p, ciclo }: { p: PlanoVenda; ciclo: Ciclo }) {
  if (ciclo === 'mensal') {
    return (
      <div className="mt-6">
        <p className="flex items-baseline gap-1.5 text-tinta-1">
          <span className="text-[16px] font-medium">R$</span>
          <span className="text-[46px] font-semibold leading-none tracking-[-0.03em]">{p.preco}</span>
          <span className="text-[15px] text-tinta-3">/mês</span>
        </p>
        <p className="mt-2.5 text-[14px] leading-relaxed text-tinta-2">
          Assinatura cobrada todo mês, no <strong className="font-semibold text-tinta-1">cartão de crédito</strong> ou no <strong className="font-semibold text-tinta-1">Pix</strong>.
        </p>
      </div>
    )
  }
  const eco = economia(p)
  return (
    <div className="mt-6">
      <p className="flex items-baseline gap-1.5 text-tinta-1">
        <span className="text-[16px] font-medium">12x de R$</span>
        <span className="text-[46px] font-semibold leading-none tracking-[-0.03em]">{p.precoAnual}</span>
      </p>
      <p className="mt-1 text-[14px] text-tinta-3">no cartão de crédito</p>
      <div className="mt-4 grid gap-2 rounded-xl border border-papel-linha bg-papel p-3.5 text-[13.5px] text-tinta-2">
        <p className="flex items-center gap-2.5">
          <CreditCard size={16} className="flex-none text-tinta-3" aria-hidden="true" />
          <span><strong className="font-semibold text-tinta-1">Cartão:</strong> até 12x de R$ {p.precoAnual}</span>
        </p>
        <p className="flex items-center gap-2.5">
          <QrCode size={16} className="flex-none text-tinta-3" aria-hidden="true" />
          <span><strong className="font-semibold text-tinta-1">Pix à vista:</strong> R$ {p.precoAnualVista} <span className="text-tinta-3">(menor preço)</span></span>
        </p>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-tinta-2">
        Pagamento único que vale <strong className="font-semibold text-tinta-1">12 meses</strong>. Não renova sozinho.
        <span className="mt-1 block font-semibold text-azul-escuro">Economia de R$ {brl(eco.reais)} em relação ao mensal.</span>
      </p>
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
            <Link to="/cadastro" className={classeBotaoClaro(p.destaque)}>
              Começar com o teste grátis <span aria-hidden="true">→</span>
            </Link>
            <p className="mt-2.5 text-center text-[12.5px] text-tinta-3">Crie a conta, teste à vontade e assine depois.</p>
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

const PASSOS = [
  { t: 'Crie sua conta grátis', d: 'Leva um minuto e não pede cartão. O teste libera todos os sistemas.' },
  { t: 'Escolha o plano', d: 'Mensal ou anual. No anual, até 12x no cartão ou à vista no Pix.' },
  { t: 'Use na hora', d: 'Pagamento aprovado, o plano libera sozinho na sua conta, no computador e no celular.' },
]

export function PlanosLanding() {
  const [ciclo, setCiclo] = useState<Ciclo>('anual')
  return (
    <section id="planos" className="secao-clara bg-papel text-tinta-1">
      <div className="mx-auto max-w-[1100px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-[680px] text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-azul-escuro">Planos</p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.08] tracking-[-0.02em]">Escolha o plano da sua oficina</h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-tinta-2">
            Comece com o teste grátis, sem cartão. Quando quiser continuar, assine o <strong className="font-semibold text-tinta-1">Pro</strong> para
            veículos leves ou o <strong className="font-semibold text-tinta-1">Full</strong> para atender do leve ao diesel.
          </p>
        </Reveal>

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

        <Reveal index={2} className="mx-auto mt-14 max-w-[920px]">
          <h3 className="text-center text-[20px] font-semibold">Como funciona</h3>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {PASSOS.map((s, i) => (
              <li key={s.t} className="rounded-2xl border border-papel-linha bg-papel-card p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-tinta-1 text-[14px] font-semibold text-white">{i + 1}</span>
                <p className="mt-3 text-[15.5px] font-semibold">{s.t}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-tinta-2">{s.d}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal index={3} className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-[15.5px] text-tinta-2">Ficou em dúvida sobre qual plano escolher?</p>
          <BotaoEquipe />
        </Reveal>
      </div>
    </section>
  )
}
