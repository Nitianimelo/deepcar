// Regras do plano free vistas pelo navegador. O corte que vale é do servidor
// (api/_lib/sessao.js): aqui é só o relógio na tela e o texto que a pessoa lê.
import { useEffect, useState } from 'react'
import { conferirSessao, type Plano, type Session } from './auth'

export const MINUTOS_FREE = 5

const ROTULOS: Record<Plano, string> = { free: 'Free', pro: 'Pro', full: 'Full' }

export const rotuloPlano = (p: Plano | null | undefined) => ROTULOS[p ?? 'free'] ?? 'Free'

export const ehPago = (s: Session | null) => s?.plano === 'pro' || s?.plano === 'full'

/** R$ 47,90 e R$ 59,90 — o mesmo que a página de vendas anuncia. */
export const PRECOS: Record<'pro' | 'full', string> = { pro: '47,90', full: '59,90' }

const CHECKOUT: Record<'pro' | 'full', string | undefined> = {
  pro: import.meta.env.VITE_CAKTO_CHECKOUT_PRO as string | undefined,
  full: import.meta.env.VITE_CAKTO_CHECKOUT_FULL as string | undefined,
}

/**
 * Checkout da Cakto com os dados da conta preenchidos — é o que faz o e-mail do pagamento
 * bater com o da conta e o plano entrar sozinho. Sem link configurado, cai nos planos da landing.
 */
export function linkCheckout(plano: 'pro' | 'full', s: Session | null) {
  const base = CHECKOUT[plano]
  if (!base) return '/#planos'
  const q = new URLSearchParams()
  if (s?.email) q.set('email', s.email)
  if (s?.nome) q.set('name', s.nome)
  if (s?.whatsapp) q.set('phone', s.whatsapp)
  const busca = q.toString()
  return busca ? `${base}?${busca}` : base
}

const numeroSuporte = ((import.meta.env.VITE_SUPORTE_WHATSAPP as string | undefined) ?? '').replace(/\D/g, '')
const emailSuporte = (import.meta.env.VITE_SUPORTE_EMAIL as string | undefined) ?? 'suporte@deepcar.com.br'

/** 55 + DDD + 9 dígitos = 13; menos que isso não é número cheio e não vale abrir o WhatsApp. */
export const temWhatsappSuporte = numeroSuporte.length >= 12

/** Link de contato: WhatsApp quando há número configurado, e-mail como reserva. */
export function linkSuporte(mensagem: string, assunto = 'Deepcar · assinatura') {
  if (temWhatsappSuporte) return `https://wa.me/${numeroSuporte}?text=${encodeURIComponent(mensagem)}`
  return `mailto:${emailSuporte}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`
}

/**
 * Quanto sobra do teste, em milissegundos.
 * `null` = sem relógio: plano pago, administrador, ou teste que ainda não começou.
 */
export function restanteFree(s: Session | null, agora = Date.now()): number | null {
  if (!s || s.plano !== 'free' || s.papel === 'admin') return null
  if (!s.freeExpiraEm) return MINUTOS_FREE * 60_000 // ainda não começou: mostra cheio
  return new Date(s.freeExpiraEm).getTime() - agora
}

/** 275000 → "4:35" */
export function mmss(ms: number) {
  const seg = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`
}

/**
 * Relógio do teste gratuito.
 *
 * Conta de segundo em segundo e reconfere a sessão no servidor de tempos em tempos —
 * assim o bloqueio cai sozinho quando o administrador muda o plano para pro, e não dá
 * para ganhar tempo mexendo no relógio do computador: o fim vem do servidor.
 */
export function useLimiteFree(inicial: Session | null) {
  const [sessao, setSessao] = useState<Session | null>(inicial)
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => { setSessao(inicial) }, [inicial])

  const restante = restanteFree(sessao, agora)
  const temRelogio = restante !== null
  const bloqueado = restante !== null && restante <= 0

  useEffect(() => {
    if (!temRelogio) return
    const t = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [temRelogio])

  // enquanto for free, pergunta ao servidor de minuto em minuto quem é o dono da conta
  const ehFree = sessao?.plano === 'free'
  useEffect(() => {
    if (!ehFree) return
    let vivo = true
    const t = setInterval(() => {
      void conferirSessao().then((s) => { if (vivo && s) setSessao(s) })
    }, 60_000)
    return () => { vivo = false; clearInterval(t) }
  }, [ehFree])

  // voltou da aba do checkout: confere na hora, em vez de esperar o minuto
  useEffect(() => {
    if (!ehFree) return
    const olhar = () => {
      if (document.visibilityState === 'visible') void conferirSessao().then((s) => s && setSessao(s))
    }
    window.addEventListener('visibilitychange', olhar)
    window.addEventListener('focus', olhar)
    return () => {
      window.removeEventListener('visibilitychange', olhar)
      window.removeEventListener('focus', olhar)
    }
  }, [ehFree])

  // ao bater zero, confere uma vez: pode ter virado pro há dez segundos
  useEffect(() => {
    if (!bloqueado) return
    let vivo = true
    void conferirSessao().then((s) => { if (vivo && s) setSessao(s) })
    return () => { vivo = false }
  }, [bloqueado])

  return { restante, bloqueado, sessao }
}
