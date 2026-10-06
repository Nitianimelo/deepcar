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
  /** mensalidade do plano mensal */
  preco: string
  /** preço por mês do plano anual (= cada uma das 12 parcelas no checkout) */
  precoAnual: string
  /** anual à vista (Pix): o preço da oferta na Cakto */
  precoAnualVista: string
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
    preco: '47,90',
    precoAnual: '29,90',
    precoAnualVista: '289,49',
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
    preco: '59,90',
    precoAnual: '37,90',
    precoAnualVista: '366,95',
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
