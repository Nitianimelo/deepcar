// Contato de suporte (WhatsApp ou e-mail). Arquivo sem dependências: entra no pacote da landing.
export const numeroSuporte = ((import.meta.env.VITE_SUPORTE_WHATSAPP as string | undefined) ?? '').replace(/\D/g, '')
const emailSuporte = (import.meta.env.VITE_SUPORTE_EMAIL as string | undefined) ?? 'nitiani@compilla.dev'

/** 55 + DDD + 9 dígitos = 13; menos que isso não é número cheio e não vale abrir o WhatsApp. */
export const temWhatsappSuporte = numeroSuporte.length >= 12

/** Link de contato: WhatsApp quando há número configurado, e-mail como reserva. */
export function linkSuporte(mensagem: string, assunto = 'Deepcar · assinatura') {
  return linkWhatsapp(mensagem) ?? `mailto:${emailSuporte}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`
}

/** Link direto do WhatsApp de suporte, ou null quando não há número configurado (VITE_SUPORTE_WHATSAPP). */
export function linkWhatsapp(mensagem: string) {
  return temWhatsappSuporte ? `https://wa.me/${numeroSuporte}?text=${encodeURIComponent(mensagem)}` : null
}
