// Todo caminho bloqueado leva ao mesmo convite para assinar (padrão claro da página de vendas):
//  - teste gratuito vencido: a plataforma continua aberta (menu, montadoras, listas, busca, campo da placa), mas o
//    esquema abre embaçado e a placa mostra o convite. O servidor também barra (402 em placa e compartilhar).
//  - sistema fora do plano (ex.: diesel no Pro, ou o que o /admin tirou do teste): a lista abre normal e o esquema
//    abre embaçado com "Somente no plano Full", mostrando só os planos que liberam aquele sistema.
// O desenho embaçado é a primeira fatia do esquema numa <img> solta, nunca o visualizador: o visualizador
// tem tela cheia, e em tela cheia o filtro do pai não vale — o esquema apareceria nítido.
// O acervo é público no R2: o borrado é só na tela (ver Pendências no CONTEXTO.md).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Lock, MessageCircle, Sparkles } from 'lucide-react'
import { avisarCheckout, linkCheckout, linkSuporte, temWhatsappSuporte } from '../lib/plano'
import { useAcesso } from '../lib/acesso'
import { urlImagem, type EsquemaDetalhe } from '../lib/acervo'
import { PLANOS_VENDA, planosQueLiberam, textoSomente, type Ciclo, type PlanoVenda } from '../data/planos'
import type { SectionKey } from '../data/nav'
import { CartaoPlanoClaro, ChaveCiclo } from './landing/PlanosLanding'
import { classeBotaoClaro } from './landing/estiloPlanos'

type Motivo = { tipo: 'teste' } | { tipo: 'plano'; secao: SectionKey | string }

/** O esquema embaçado, do tamanho do visualizador, com o convite por cima. */
export function EsquemaEmbacado({ d, motivo = { tipo: 'teste' } }: { d: EsquemaDetalhe; motivo?: Motivo }) {
  const planos = motivo.tipo === 'plano' ? planosQueLiberam(motivo.secao) : undefined
  return (
    <div className="relative overflow-hidden rounded-xl border seam bg-[#10151c]" style={{ minHeight: 'min(80vh, 900px)' }}>
      <img
        src={urlImagem(d, d.trechos[0] ?? d.minimapa)}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-top opacity-95"
        // mesmo tom do desenho escuro do visualizador, e borrado o bastante para não servir de consulta
        style={{ filter: 'invert(1) hue-rotate(180deg) saturate(.35) blur(5px)', transform: 'scale(1.08)' }}
      />
      {/* a folha some para o fundo: o cartão fica legível em qualquer parte do desenho */}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-pit/0 via-pit/25 to-pit/75" />
      <div className="relative flex justify-center px-3 py-8 sm:px-6 sm:py-14">
        {planos ? (
          <ConviteAssinatura
            etiqueta="Sistema fora do seu plano"
            titulo={`${textoSomente(planos)}.`}
            oQue={`o esquema do ${d.marca} ${d.modelo}`}
            planos={planos}
          />
        ) : (
          <ConviteAssinatura
            titulo="Assine um plano para acessar o sistema."
            oQue={`o esquema completo do ${d.marca} ${d.modelo} e todos os outros`}
          />
        )}
      </div>
    </div>
  )
}

type PropsConvite = {
  titulo: string
  /** completa "Para abrir ..., escolha um plano" */
  oQue: string
  /** só estes planos (ex.: os que liberam o sistema); sem nada, os dois */
  planos?: PlanoVenda[]
  /** linha pequena acima do título; sem ela, conforme o motivo (teste ou anual encerrado) */
  etiqueta?: string
}

/**
 * O cartão do convite: por que parou, os planos e o checkout já preenchido. Mesmo padrão claro da página de vendas
 * e da aba Plano (CartaoPlanoClaro). Serve o esquema embaçado, a consulta por placa e o início depois do teste.
 */
export function ConviteAssinatura({ titulo, oQue, planos, etiqueta }: PropsConvite) {
  const { sessao } = useAcesso()
  // abre no anual, o mais barato por mês: a mesma escolha da landing e da aba Plano
  const [ciclo, setCiclo] = useState<Ciclo>('anual')
  // a mesma tela vale quando o anual vence (api/_lib/sessao.js → vencerAnual)
  const anualVenceu = sessao?.assinatura?.status === 'expirada'
  const pago = sessao?.plano === 'pro' || sessao?.plano === 'full'
  const lista = planos ?? PLANOS_VENDA
  const mensagem = anualVenceu
    ? 'Olá! Meu plano anual do Deepcar terminou e quero renovar.'
    : pago
      ? `Olá! Quero mudar de plano no Deepcar para abrir ${oQue}.`
      : 'Olá! Terminei o teste gratuito do Deepcar e quero assinar para continuar consultando os esquemas.'

  return (
    <section aria-labelledby="convite-assinatura" className="w-full max-w-[960px] rounded-2xl bg-papel p-4 text-tinta-1 shadow-2xl sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-azul-escuro/10 text-azul-escuro">
          <Lock size={18} />
        </span>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-tinta-3">
          {etiqueta ?? (anualVenceu ? 'Plano anual encerrado' : 'Teste gratuito encerrado')}
        </p>
      </div>

      <h2 id="convite-assinatura" className="mt-4 text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
        {anualVenceu ? 'Renove seu plano para acessar o sistema.' : titulo}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-tinta-2">
        Você continua navegando pela plataforma à vontade. Para abrir {oQue}, escolha um plano: o acesso libera na hora,
        aqui mesmo.
      </p>

      <div className="mt-5">
        <ChaveCiclo ciclo={ciclo} onChange={setCiclo} />
      </div>

      {/* Full primeiro: é o que abre qualquer esquema, leve ou diesel */}
      <div className={`mt-6 grid items-stretch gap-5 ${lista.length > 1 ? 'md:grid-cols-2' : 'mx-auto max-w-[460px]'}`}>
        {[...lista].sort((a, b) => Number(b.destaque) - Number(a.destaque)).map((p) => {
          const atual = sessao?.plano === p.id
          return (
            <CartaoPlanoClaro
              key={p.id}
              p={p}
              ciclo={ciclo}
              atual={atual}
              acao={atual && !anualVenceu ? (
                <span className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-azul-escuro/30 bg-azul-escuro/[0.06] text-[14.5px] font-semibold text-azul-escuro">
                  Seu plano atual
                </span>
              ) : (
                <a
                  href={linkCheckout(p.id, sessao, ciclo)}
                  onClick={() => avisarCheckout(p.id, ciclo)}
                  target="_blank"
                  rel="noreferrer"
                  className={classeBotaoClaro(p.destaque)}
                >
                  {pago && !atual ? `Passar para o ${p.nome}` : `Assinar ${p.nome}${ciclo === 'anual' ? ' anual' : ''}`}
                  <ArrowRight size={16} />
                </a>
              )}
            />
          )
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-papel-linha pt-4 text-[13.5px]">
        <p className="text-tinta-3">Já assinou? O acesso libera sozinho, sem recarregar.</p>
        <div className="flex items-center gap-4">
          <Link to="/app/conta?aba=plano" className="font-medium text-azul-escuro hover:underline">Comparar planos</Link>
          <a href={linkSuporte(mensagem)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-tinta-2 hover:text-tinta-1">
            <MessageCircle size={14} /> {temWhatsappSuporte ? 'WhatsApp' : 'Suporte'}
          </a>
        </div>
      </div>
    </section>
  )
}

/**
 * Faixa no alto da lista de um sistema bloqueado (fora do plano ou teste vencido): a lista abre normal,
 * e a faixa já diz o que acontece ao abrir um esquema e leva aos planos.
 */
export function AvisoSistemaBloqueado({ secao }: { secao: SectionKey }) {
  const { podeSecao, testeAcabou, sessao } = useAcesso()
  const fora = !podeSecao(secao)
  if (!fora && !testeAcabou) return null
  const planos = planosQueLiberam(secao)
  const pago = sessao?.plano === 'pro' || sessao?.plano === 'full'
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-trace/30 bg-bench-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2.5 text-[14.5px] text-ink-2">
        <Lock size={17} className="mt-0.5 flex-none text-trace-hi" aria-hidden="true" />
        <span>
          <b className="font-semibold text-ink-1">{fora ? `${textoSomente(planos)}.` : 'Seu teste gratuito terminou.'}</b>{' '}
          Você pode navegar pela lista; os esquemas abrem borrados até você {fora && pago ? 'mudar de plano' : 'assinar'}.
        </span>
      </p>
      <Link to="/app/conta?aba=plano" className="btn-primary inline-flex !h-11 flex-none items-center justify-center gap-2 px-5 text-[14.5px]">
        {fora && pago ? 'Mudar de plano' : 'Assinar um plano'} <ArrowRight size={16} />
      </Link>
    </div>
  )
}

/** Menor parcela do anual entre os planos ("29,90"): o número que mais convence quem está testando. */
const MENOR_PARCELA = PLANOS_VENDA.map((p) => p.precoAnual).sort((a, b) => Number(a.replace(',', '.')) - Number(b.replace(',', '.')))[0]

const TEXTOS_FAIXA = {
  inicio: ['Você está no teste grátis.', 'Assine e tenha a placa e os esquemas liberados em todo carro que entrar na oficina.'],
  esquema: ['Achou o que precisava?', 'Com um plano, todo esquema fica liberado, sempre que o carro estiver na sua frente.'],
  placa: ['A placa resolve em segundos.', 'Assine e identifique cada carro que chegar, já com os esquemas certos.'],
  lista: ['Teste grátis em andamento.', 'Assine e mantenha o acervo inteiro liberado, sem interrupção.'],
} as const

/**
 * Teste grátis em andamento: o convite para assinar espalhado pelas telas (início, esquema, placa, listas), sem cobrir
 * nada. Não fala em limite nem em quanto falta (decisão do dono, 07/10/2026): quando o teste acaba, o convite grande
 * (ConviteAssinatura) toma o lugar. Some para plano pago, admin e teste encerrado.
 */
export function FaixaAssinar({ lugar, className = '' }: { lugar: keyof typeof TEXTOS_FAIXA; className?: string }) {
  const { sessao, testeAcabou } = useAcesso()
  if (!sessao || sessao.plano !== 'free' || sessao.papel === 'admin' || testeAcabou) return null
  const [titulo, texto] = TEXTOS_FAIXA[lugar]
  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-trace/30 bg-bench-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 ${className}`}>
      <p className="flex items-start gap-2.5 text-[14.5px] leading-snug text-ink-2">
        <Sparkles size={17} className="mt-0.5 flex-none text-trace-hi" aria-hidden="true" />
        <span>
          <b className="font-semibold text-ink-1">{titulo}</b> {texto}{' '}
          <span className="whitespace-nowrap text-ink-3">A partir de 12x de R$ {MENOR_PARCELA}.</span>
        </span>
      </p>
      <Link to="/app/conta?aba=plano" className="btn-primary inline-flex !h-11 flex-none items-center justify-center gap-2 px-5 text-[14.5px]">
        Ver planos <ArrowRight size={16} />
      </Link>
    </div>
  )
}
