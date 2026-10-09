// Os planos pagos, como o cliente os vê. Fonte única: a página de vendas e a tela da conta
// leem daqui, para o preço e a lista nunca divergirem entre as duas.
// Os produtos correspondentes vivem na Cakto (ids no cofre do /admin).
import type { SectionKey } from './nav'

export type PlanoPago = 'pro' | 'full'

/** Mensal = assinatura recorrente. Anual = 12 meses pagos de uma vez, em até 12x no cartão (o 12x só aparece no checkout). */
export type Ciclo = 'mensal' | 'anual'

export type PlanoVenda = {
  id: PlanoPago
  nome: string
  /** mensalidade do plano mensal, do 2º mês em diante (preço do produto na Cakto) */
  preco: string
  /** 1ª mensalidade com a oferta (cupom da Cakto "só na 1ª cobrança"; ver OFERTA) */
  primeiroMes: string
  /** quanto o anual dá por mês (à vista ÷ 12): "equivale a R$ X/mês" */
  precoAnual: string
  /** anual à vista (Pix) = preço do produto anual na Cakto (no cartão, até 12x) */
  precoAnualVista: string
  /** 12 mensalidades cheias: o "de" do anual (âncora real, nunca inflada: CDC art. 37) */
  anualDe: string
  para: string
  /** faixa no topo do cartão: o motivo de escolher, numa linha */
  chamada: string
  itens: string[]
  /** sistemas que o cartão mostra acesos no painel (o padrão de api/_lib/planos.js; o que vale é o /admin → Planos) */
  secoes: SectionKey[]
  placa: boolean
  aparelhos: number
  /** o que aparece em destaque na página de vendas */
  destaque: boolean
}

export const PLANOS_VENDA: PlanoVenda[] = [
  {
    id: 'pro',
    nome: 'Pro',
    preco: '37,00',
    primeiroMes: '19,90',
    precoAnual: '22,20',
    precoAnualVista: '266,40',
    anualDe: '444,00',
    para: 'Para a oficina de veículos leves.',
    chamada: 'O essencial para carros leves',
    itens: ['Injeção eletrônica leve', 'ABS', 'Elétrica leve', 'Câmbio leve', '2 dispositivos conectados', 'Busca pela placa', 'App mobile', 'Suporte'],
    secoes: ['injecao-leve', 'abs', 'eletrica', 'cambio'],
    placa: true,
    aparelhos: 2,
    destaque: false,
  },
  {
    id: 'full',
    nome: 'Full',
    preco: '49,90',
    primeiroMes: '19,90',
    precoAnual: '29,94',
    precoAnualVista: '359,28',
    anualDe: '598,80',
    para: 'Para a oficina que atende do leve ao diesel.',
    chamada: 'Libera tudo, do leve ao diesel',
    itens: [
      'Injeção eletrônica leve',
      'Injeção eletrônica diesel',
      'ABS',
      'Elétrica leve',
      'Elétrica diesel',
      'Câmbio leve',
      'Câmbio diesel',
      '4 dispositivos conectados',
      'Busca pela placa',
      'App mobile',
      'Suporte',
    ],
    secoes: ['injecao-leve', 'injecao-diesel', 'abs', 'eletrica', 'eletrica-diesel', 'cambio', 'cambio-diesel'],
    placa: true,
    aparelhos: 4,
    destaque: true,
  },
]

export const planoVenda = (id: PlanoPago) => PLANOS_VENDA.find((p) => p.id === id)!

/** Preço por mês que aparece no cartão, conforme o ciclo escolhido. */
export const precoDoCiclo = (p: PlanoVenda, ciclo: Ciclo) => (ciclo === 'anual' ? p.precoAnual : p.preco)

/** Planos à venda que liberam o sistema (pelos cartões de src/data/planos.ts). */
export const planosQueLiberam = (secao: SectionKey | string) => PLANOS_VENDA.filter((p) => p.secoes.includes(secao as SectionKey))

/** "Somente no plano Full" / "Nos planos Pro e Full". */
export function textoSomente(planos: PlanoVenda[]) {
  if (planos.length === 1) return `Somente no plano ${planos[0].nome}`
  return `Nos planos ${planos.map((p) => p.nome).join(' e ')}`
}

/**
 * Oferta (09/10/2026, pedido do dono): 1ª mensalidade por R$ 19,90 nos dois planos mensais (cupom da Cakto "Desconto só
 * na 1ª cobrança da assinatura", valor fixo: Pro 37,00 − 17,10; Full 49,90 − 30,00) e 40% no anual (o próprio preço do
 * produto anual na Cakto = 12 mensalidades cheias − 40%). O cupom vai no link do checkout (src/lib/plano.ts).
 * Desligar a oferta do 1º mês: `ativa: false`. Mudou preço aqui? Mude na Cakto (produto e cupom) — a página nunca pode
 * prometer um valor que o checkout não cobra.
 */
export const OFERTA = {
  ativa: false, // liga quando o cupom DEEPCAR1990 existir na Cakto (Pro e Full) e o checkout cobrar R$ 19,90
  descontoAnual: 40,
  cupons: { pro: 'DEEPCAR1990', full: 'DEEPCAR1990' } as Record<PlanoPago, string>,
  parametro: 'coupon',
} as const

const reaisDe = (v: string) => Number(v.replace('.', '').replace(',', '.'))
export const emReais = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 1ª mensalidade: com a oferta, o preço promocional; sem ela, a mensalidade normal. */
export const precoPrimeiroMes = (p: PlanoVenda) => (OFERTA.ativa ? p.primeiroMes : p.preco)
/** Quanto economiza no 1º mês (R$) e em % sobre a mensalidade. */
export const economiaPrimeiroMes = (p: PlanoVenda) => {
  const d = reaisDe(p.preco) - reaisDe(precoPrimeiroMes(p))
  return { reais: emReais(d), pct: Math.round((d / reaisDe(p.preco)) * 100) }
}
/** Anual contra 12 mensalidades cheias. */
export const economiaAnual = (p: PlanoVenda) => {
  const d = reaisDe(p.anualDe) - reaisDe(p.precoAnualVista)
  return { reais: emReais(d), pct: Math.round((d / reaisDe(p.anualDe)) * 100) }
}
/** O que se paga em 12 meses no mensal (1º mês com a oferta + 11 cheios) — para comparar com o anual. */
export const totalMensal12 = (p: PlanoVenda) => reaisDe(precoPrimeiroMes(p)) + reaisDe(p.preco) * 11
export const numero = reaisDe
