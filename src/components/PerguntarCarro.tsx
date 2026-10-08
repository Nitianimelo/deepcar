// "Perguntar se tem o meu carro" (08/10/2026): as vendas que aconteceram tiveram conversa antes, e a pergunta de quem
// compra é "tem o diagrama do MEU carro?". O botão fica onde a pessoa trava: convite para assinar (esquema borrado,
// placa, início), placa não encontrada e veículo sem esquemas. Some sem VITE_SUPORTE_WHATSAPP.
import { IconeWhatsapp } from './IconeWhatsapp'
import { linkWhatsapp } from '../lib/suporte'
import { getSession } from '../lib/auth'
import { registrar as anotar } from '../lib/log'

/** `carro`: o que a pessoa procurava (placa, modelo do esquema), vai na mensagem. `onde`: para o registro de uso. */
export function PerguntarCarro({ carro, onde, className = '' }: { carro?: string; onde: string; className?: string }) {
  const email = getSession()?.email
  const href = linkWhatsapp(
    `Olá! Quero saber se a Deepcar tem o esquema do meu carro${carro ? ` (${carro})` : ''}: ` +
    `modelo, ano e motor: ______. ${email ? `Minha conta é ${email}.` : ''}`.trim(),
  )
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => anotar('whatsapp', { onde })}
      className={`inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-whatsapp px-4 text-[14.5px] font-semibold text-pit shadow-lg shadow-black/15 transition hover:bg-whatsapp-hi ${className}`}
    >
      <IconeWhatsapp size={20} /> Perguntar se tem o meu carro
    </a>
  )
}
