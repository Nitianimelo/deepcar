// Os planos pagos, como o cliente os vê. Fonte única: a página de vendas e a tela da conta
// leem daqui, para o preço e a lista nunca divergirem entre as duas.
// Os produtos correspondentes vivem na Cakto (ids no cofre do /admin).

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
  para: string
  itens: string[]
  /** o que aparece em destaque na página de vendas */
  destaque: boolean
}

export const PLANOS_VENDA: PlanoVenda[] = [
  {
    id: 'pro',
    nome: 'Pro',
    preco: '47,90',
    precoAnual: '29,90',
    para: 'Para a oficina de veículos leves.',
    itens: ['Injeção eletrônica leve', 'ABS', 'Elétrica leve', '2 dispositivos conectados', 'App mobile', 'Suporte'],
    destaque: false,
  },
  {
    id: 'full',
    nome: 'Full',
    preco: '59,90',
    precoAnual: '37,90',
    para: 'Para a oficina que atende do leve ao diesel.',
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
    destaque: true,
  },
]

export const planoVenda = (id: PlanoPago) => PLANOS_VENDA.find((p) => p.id === id)!

/** Preço por mês que aparece no cartão, conforme o ciclo escolhido. */
export const precoDoCiclo = (p: PlanoVenda, ciclo: Ciclo) => (ciclo === 'anual' ? p.precoAnual : p.preco)
