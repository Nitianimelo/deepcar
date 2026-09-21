// Os planos pagos, como o cliente os vê. Fonte única: a página de vendas e a tela da conta
// leem daqui, para o preço e a lista nunca divergirem entre as duas.
// Os produtos correspondentes vivem na Cakto (ids no cofre do /admin).

export type PlanoPago = 'pro' | 'full'

export type PlanoVenda = {
  id: PlanoPago
  nome: string
  preco: string
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
    para: 'Para a oficina de veículos leves.',
    itens: ['Injeção eletrônica leve', 'ABS', 'Elétrica leve', '2 dispositivos conectados', 'App mobile', 'Suporte'],
    destaque: false,
  },
  {
    id: 'full',
    nome: 'Full',
    preco: '59,90',
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
