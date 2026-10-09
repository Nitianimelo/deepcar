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
    'São mais de 20 mil sistemas de cerca de 60 montadoras, do carro popular ao caminhão, linha leve e diesel. Use a "Consulta técnica" desta página para procurar pelo modelo ou pelo motor antes de assinar.',
  ],
  [
    'As atualizações são cobradas à parte?',
    'Não. O acervo recebe atualizações todo mês, com modelos e sistemas novos, e tudo isso já está incluso no seu plano. Você não paga nada a mais por atualização.',
  ],
  ...(OFERTA.ativa
    ? [[
        'Como funciona o primeiro mês por R$ 19,90?',
        `Nos planos mensais, a primeira mensalidade sai por R$ ${PLANOS_VENDA[0].primeiroMes} e o desconto já aparece aplicado no pagamento. A partir do segundo mês, a assinatura segue pelo valor normal: R$ ${PLANOS_VENDA[0].preco} no Pro e R$ ${PLANOS_VENDA[1].preco} no Full. Você pode cancelar quando quiser.`,
      ] as [string, string]]
    : []),
  [
    'Como funciona o desconto no anual?',
    `O plano anual sai com ${OFERTA.descontoAnual}% de desconto em relação a 12 mensalidades: R$ ${PLANOS_VENDA[0].precoAnualVista} no Pro e R$ ${PLANOS_VENDA[1].precoAnualVista} no Full, no Pix ou no cartão. É um pagamento único que vale 12 meses e não renova sozinho.`,
  ],
  [
    'Qual a diferença entre o Pro e o Full?',
    'O Pro libera a linha leve: injeção eletrônica, ABS, elétrica e câmbio. O Full libera tudo do Pro e também a linha diesel (injeção, elétrica e câmbio de picapes, utilitários e caminhões). Os dois têm a busca pela placa.',
  ],
  [
    'Quais as formas de pagamento?',
    'Cartão de crédito ou Pix, tanto no plano mensal quanto no anual. No anual, dá para parcelar no cartão ou pagar à vista no Pix.',
  ],
  [
    'Posso pagar a mensalidade no Pix, sem cartão?',
    'Pode. No plano mensal você paga no Pix todo mês, sem precisar cadastrar cartão de crédito. Quando a mensalidade estiver para vencer, a nossa equipe te avisa.',
  ],
  [
    'Quando o acesso é liberado?',
    'Assim que o pagamento é aprovado, o acesso é liberado automaticamente, tanto no cartão quanto no Pix. Se você ainda não tem conta, ela é criada na hora com o e-mail do pagamento: chega um e-mail para você criar a sua senha e já entrar.',
  ],
  [
    'Posso cancelar? Tem reembolso?',
    'Pode cancelar quando quiser: o plano mensal não tem fidelidade nem multa. E se não quiser continuar, você pede o reembolso do pagamento em até 7 dias depois da compra.',
  ],
  [
    'Funciona no celular?',
    'Funciona no navegador do celular, do tablet e do computador, e tem app para Android e para iPhone. A mesma conta vale em todos, respeitando o número de aparelhos do plano.',
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
