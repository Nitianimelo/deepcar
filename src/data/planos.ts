// Os planos pagos, como o cliente os vê. Fonte única: a página de vendas e a tela da conta
// leem daqui, para o preço e a lista nunca divergirem entre as duas.
// Os produtos correspondentes vivem na Cakto (ids no cofre do /admin).

export type PlanoPago = 'pro' | 'full'

/** Mensal = assinatura recorrente. Anual = 12 meses pagos de uma vez, em até 12x no cartão. */
export type Ciclo = 'mensal' | 'anual'

export type PlanoVenda = {
  id: PlanoPago
  nome: string
  /** mensalidade do plano mensal */
  preco: string
  /** valor de cada uma das 12 parcelas do plano anual */
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

const numero = (preco: string) => Number(preco.replace(',', '.'))
export const reais = (v: number) => v.toFixed(2).replace('.', ',')

/** Preço por mês que aparece no cartão, conforme o ciclo escolhido. */
export const precoDoCiclo = (p: PlanoVenda, ciclo: Ciclo) => (ciclo === 'anual' ? p.precoAnual : p.preco)

/** Total do anual (12 parcelas): "358,80". */
export const totalAnual = (p: PlanoVenda) => reais(numero(p.precoAnual) * 12)

/** Quanto o anual poupa num ano, frente a 12 mensalidades: "216,00". */
export const economiaAnual = (p: PlanoVenda) => reais((numero(p.preco) - numero(p.precoAnual)) * 12)

/** Maior desconto do anual entre os planos, em %, arredondado para baixo (o selo não pode prometer mais). */
export const descontoAnual = Math.max(
  ...PLANOS_VENDA.map((p) => Math.floor((1 - numero(p.precoAnual) / numero(p.preco)) * 100)),
)
