// Regras do plano free vistas pelo navegador. O corte que vale é do servidor
// (api/_lib/sessao.js): aqui é só a hora de virar a chave na tela e o texto que a pessoa lê.
import { useEffect, useState } from 'react'
import { PLANOS_VENDA, type Ciclo, type PlanoPago } from '../data/planos'
import { conferirSessao, type Plano, type Session } from './auth'

export const MINUTOS_FREE = 600

/** Como o prazo do teste aparece nos textos. Muda junto com MINUTOS_FREE. */
export const DURACAO_FREE = '10 horas'

const ROTULOS: Record<Plano, string> = { free: 'Teste', pro: 'Pro', full: 'Full' }

export const rotuloPlano = (p: Plano | null | undefined) => ROTULOS[p ?? 'free'] ?? 'Teste'

export const ehPago = (s: Session | null) => s?.plano === 'pro' || s?.plano === 'full'

/** Preços do arquivo único dos planos (src/data/planos.ts). */
export const PRECOS: Record<PlanoPago, string> = Object.fromEntries(
  PLANOS_VENDA.map((p) => [p.id, p.preco]),
) as Record<PlanoPago, string>

const CHECKOUT: Record<Ciclo, Record<PlanoPago, string | undefined>> = {
  mensal: {
    pro: import.meta.env.VITE_CAKTO_CHECKOUT_PRO as string | undefined,
    full: import.meta.env.VITE_CAKTO_CHECKOUT_FULL as string | undefined,
  },
  anual: {
    pro: import.meta.env.VITE_CAKTO_CHECKOUT_PRO_ANUAL as string | undefined,
    full: import.meta.env.VITE_CAKTO_CHECKOUT_FULL_ANUAL as string | undefined,
  },
}

/**
 * Clique num botão de assinar: o servidor manda InitiateCheckout pela API de Conversões (POST /api/sessao).
 * Não usa o pixel porque os botões ficam dentro do /app, onde o pixel não roda (a URL leva placa).
 * keepalive: o checkout abre em outra aba e a página pode sair antes da resposta. Falha não atrapalha ninguém.
 */
export function avisarCheckout(plano: PlanoPago, ciclo: Ciclo) {
  const p = PLANOS_VENDA.find((x) => x.id === plano)
  const valor = p ? Number((ciclo === 'anual' ? p.precoAnualVista : p.preco).replace(',', '.')) : undefined
  try {
    void fetch('/api/sessao', {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento: 'checkout', plano, ciclo, valor, id: crypto.randomUUID() }),
    }).catch(() => {})
  } catch { /* navegador antigo sem keepalive/randomUUID: segue sem o evento */ }
}

/**
 * Checkout da Cakto com os dados da conta preenchidos — é o que faz o e-mail do pagamento
 * bater com o da conta e o plano entrar sozinho. Sem link configurado, cai nos planos da landing.
 */
export function linkCheckout(plano: PlanoPago, s: Session | null, ciclo: Ciclo = 'mensal') {
  const base = CHECKOUT[ciclo][plano]
  if (!base) return '/#planos'
  const q = new URLSearchParams()
  if (s?.email) q.set('email', s.email)
  if (s?.nome) q.set('name', s.nome)
  if (s?.whatsapp) q.set('phone', s.whatsapp)
  const busca = q.toString()
  return busca ? `${base}?${busca}` : base
}

// contato de suporte mora em ./suporte (leve, sem sessão) para a landing poder usar sem carregar o resto
export { linkSuporte, temWhatsappSuporte } from './suporte'

/**
 * Quanto sobra do teste, em milissegundos.
 * `null` = sem relógio: plano pago, administrador, ou teste que ainda não começou.
 */
export function restanteFree(s: Session | null, agora = Date.now()): number | null {
  if (!s || s.plano !== 'free' || s.papel === 'admin') return null
  if (!s.freeExpiraEm) return MINUTOS_FREE * 60_000 // ainda não começou: mostra cheio
  return new Date(s.freeExpiraEm).getTime() - agora
}

/** 33_900_000 → "9 h 25 min"; menos de uma hora → "12 min" */
export function tempoRestante(ms: number) {
  const min = Math.max(0, Math.ceil(ms / 60_000))
  const h = Math.floor(min / 60)
  return h ? `${h} h ${String(min % 60).padStart(2, '0')} min` : `${min} min`
}

/**
 * Relógio do teste gratuito.
 *
 * Não há contador na tela: o relógio só existe para virar a chave na hora certa. Um timer
 * dispara no fim do teste (em vez de acordar a cada segundo) e a sessão é reconferida no
 * servidor de tempos em tempos — assim o acesso libera sozinho quando o plano vira pro, e não
 * dá para ganhar tempo mexendo no relógio do computador: o fim vem do servidor.
 */
export function useLimiteFree(inicial: Session | null) {
  const [sessao, setSessao] = useState<Session | null>(inicial)
  const [agora, setAgora] = useState(() => Date.now())
  // a sessão caiu no servidor (outro aparelho passou do limite do plano, admin desconectou, senha trocada)
  const [perdida, setPerdida] = useState(false)
  const aplicar = (s: Session | null) => (s ? setSessao(s) : setPerdida(true))

  useEffect(() => { setSessao(inicial) }, [inicial])

  const restante = restanteFree(sessao, agora)
  // teste acabou: a plataforma segue aberta para navegar, mas os esquemas pedem assinatura
  const acabou = restante !== null && restante <= 0

  useEffect(() => {
    if (restante === null || restante <= 0) return
    // setTimeout estoura acima de ~24 dias; o teste é bem menor, mas o teto evita surpresa
    const t = setTimeout(() => setAgora(Date.now()), Math.min(restante + 500, 2 ** 31 - 1))
    return () => clearTimeout(t)
  }, [restante])

  // pergunta ao servidor quem é o dono da conta: de minuto em minuto no free, a cada 5 no pago
  // (troca de plano, sistema liberado no /admin, sessão derrubada pelo limite de aparelhos)
  const ehFree = sessao?.plano === 'free'
  useEffect(() => {
    let vivo = true
    const t = setInterval(() => {
      void conferirSessao().then((s) => { if (vivo) aplicar(s) })
    }, ehFree ? 60_000 : 300_000)
    return () => { vivo = false; clearInterval(t) }
  }, [ehFree])

  // voltou da aba do checkout (ou de outro app): confere na hora, em vez de esperar o intervalo
  useEffect(() => {
    const olhar = () => {
      if (document.visibilityState === 'visible') void conferirSessao().then(aplicar)
    }
    window.addEventListener('visibilitychange', olhar)
    window.addEventListener('focus', olhar)
    return () => {
      window.removeEventListener('visibilitychange', olhar)
      window.removeEventListener('focus', olhar)
    }
  }, [])

  // ao bater zero, confere uma vez: pode ter virado pro há dez segundos
  useEffect(() => {
    if (!acabou) return
    let vivo = true
    void conferirSessao().then((s) => { if (vivo && s) setSessao(s) })
    return () => { vivo = false }
  }, [acabou])

  return { restante, acabou, sessao, perdida }
}
