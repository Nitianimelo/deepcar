// Perguntas frequentes da página de vendas (09/10/2026). Respostas curtas, no tom da oficina.
// Mudou preço, oferta, aparelhos ou o jeito de liberar o acesso? Atualize aqui junto (a oferta vem de data/planos.ts).
import { ChevronDown } from 'lucide-react'
import { OFERTA, PLANOS_VENDA } from '../../data/planos'
import { Reveal } from './Reveal'
import { BotaoEquipe } from './BotaoWhatsapp'

const PERGUNTAS: [string, string][] = [
  [
    'O que é a Deepcar?',
    'Uma plataforma de informação técnica automotiva para a oficina. Você digita a placa (ou procura o modelo) e abre os diagramas elétricos de injeção eletrônica, ABS, elétrica e câmbio, com as peças, as conexões com o módulo e a função de cada ligação.',
  ],
  [
    'Tem o carro que eu atendo?',
    'São mais de 11 mil diagramas de cerca de 60 montadoras, do carro popular ao caminhão, linha leve e diesel. Use a "Consulta técnica" desta página para procurar pelo modelo ou pelo motor antes de assinar.',
  ],
  ...(OFERTA.ativa
    ? [[
        'Como funciona o primeiro mês por R$ 19,90?',
        `Nos planos mensais, a primeira mensalidade sai por R$ ${PLANOS_VENDA[0].primeiroMes} e o desconto já aparece aplicado no pagamento. A partir do segundo mês, a assinatura segue pelo valor normal: R$ ${PLANOS_VENDA[0].preco} no Pro e R$ ${PLANOS_VENDA[1].preco} no Full. Você pode cancelar quando quiser.`,
      ] as [string, string]]
    : []),
  [
    'Como funciona o desconto no anual?',
    `O plano anual sai com ${OFERTA.descontoAnual}% de desconto em relação a 12 mensalidades: R$ ${PLANOS_VENDA[0].precoAnualVista} no Pro e R$ ${PLANOS_VENDA[1].precoAnualVista} no Full, à vista no Pix ou em até 12x no cartão. É um pagamento único que vale 12 meses e não renova sozinho.`,
  ],
  [
    'Qual a diferença entre o Pro e o Full?',
    'O Pro libera a linha leve: injeção eletrônica, ABS, elétrica e câmbio. O Full libera tudo do Pro e também a linha diesel (injeção, elétrica e câmbio de picapes, utilitários e caminhões). Os dois têm a busca pela placa.',
  ],
  [
    'Como recebo o acesso depois de pagar?',
    'O acesso é liberado assim que o pagamento é aprovado (no Pix, em segundos). Se você ainda não tem conta, crie com o mesmo e-mail que usou no pagamento: o plano entra sozinho.',
  ],
  [
    'Quais as formas de pagamento?',
    'Pix ou cartão de crédito. No plano anual, dá para parcelar em até 12x no cartão ou pagar à vista no Pix, pelo menor preço.',
  ],
  [
    'Posso cancelar quando quiser?',
    'Sim. O plano mensal não tem fidelidade nem multa: você cancela quando quiser e o acesso continua até o fim do mês já pago. E se não gostar, pode pedir o reembolso em até 7 dias depois da compra.',
  ],
  [
    'Funciona no celular?',
    'Funciona no celular, no tablet e no computador da oficina. Tem app para Android, e no iPhone você usa direto pelo navegador. A mesma conta vale em todos, respeitando o número de aparelhos do plano.',
  ],
  [
    'Não achei o meu carro. E agora?',
    'Chame a gente no WhatsApp com a placa ou o modelo. A equipe verifica no acervo e te responde se tem o diagrama de que você precisa.',
  ],
]

export function FaqLanding() {
  return (
    <section id="faq" className="relative border-t seam">
      <div className="mx-auto max-w-[820px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="text-center">
          <p className="code text-[12px] uppercase tracking-[0.24em] text-trace-hi">FAQ</p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.02em]">Perguntas frequentes</h2>
        </Reveal>

        <Reveal index={1} className="mt-10 divide-y divide-white/[0.07] rounded-2xl border seam bg-bench-1">
          {PERGUNTAS.map(([p, r]) => (
            <details key={p} className="group px-5 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-[16.5px] font-medium text-ink-1 [&::-webkit-details-marker]:hidden">
                {p}
                <ChevronDown size={19} className="flex-none text-ink-3 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="pb-5 text-[15.5px] leading-relaxed text-ink-2">{r}</p>
            </details>
          ))}
        </Reveal>

        <Reveal index={2} className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-[15.5px] text-ink-2">Ficou alguma dúvida?</p>
          <BotaoEquipe />
        </Reveal>
      </div>
    </section>
  )
}
