import { IconeWhatsapp } from '../IconeWhatsapp'
import { linkWhatsapp } from '../../lib/suporte'

const MENSAGEM = 'Olá! Vim pelo site do Deepcar e quero saber mais sobre a plataforma.'

/** Botão flutuante do WhatsApp na landing. Some quando VITE_SUPORTE_WHATSAPP não está configurado. */
export function BotaoWhatsapp() {
  const href = linkWhatsapp(MENSAGEM)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com o Deepcar no WhatsApp"
      className="group fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-full bg-whatsapp p-3.5 text-white shadow-lg shadow-black/40 transition hover:bg-whatsapp-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:bottom-6"
    >
      <IconeWhatsapp size={28} />
      <span className="hidden pr-1.5 text-sm font-semibold sm:inline">Fale com a gente</span>
    </a>
  )
}
