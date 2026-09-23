// Protocolo do webhook da Cakto: ler o corpo cru, provar a origem e traduzir o evento.
//
// A entrega e um POST com { secret, event, data } e dois cabecalhos:
//   X-Cakto-Timestamp  unix em segundos
//   X-Cakto-Signature  "v1=<hmac-sha256>" de `${timestamp}.${corpo cru}` com o secret como chave
// O corpo tem que ser o byte a byte recebido: reserializar o JSON muda os bytes e invalida a conta.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { segredo } from './segredos.js'

/** Janela aceita entre o envio e a chegada. Alem disso e considerado reenvio antigo. */
const TOLERANCIA_S = 5 * 60

/**
 * Bytes crus da requisicao, quando o runtime deixa.
 *
 * Na Vercel (runtime nodejs) NAO deixa: o corpo ja chega consumido (req.readableEnded true) e
 * nao ha req.rawBody — medido em 2026-09-21. Sem os bytes originais nao da para conferir o HMAC,
 * porque reserializar o JSON muda os bytes. Por isso a validacao cai no campo `secret` do corpo,
 * que a Cakto documenta como a outra forma valida. A funcao fica porque em outro runtime
 * (servidor proprio, Deepcar.exe) os bytes existem e ai a assinatura passa a valer.
 */
export async function lerCorpoCru(req) {
  if (req.readableEnded || req.complete) return null
  const partes = []
  for await (const p of req) partes.push(typeof p === 'string' ? Buffer.from(p) : p)
  const bruto = Buffer.concat(partes)
  return bruto.length ? bruto : null
}

export const assinar = (chave, timestamp, bruto) =>
  `v1=${createHmac('sha256', chave).update(`${timestamp}.`).update(bruto).digest('hex')}`

/** Identidade da entrega: a Cakto nao manda id de evento, e data.id se repete entre eventos. */
export const idDaEntrega = (bruto) => createHash('sha256').update(bruto).digest('hex')

const iguais = (a, b) => {
  const x = Buffer.from(String(a ?? ''))
  const y = Buffer.from(String(b ?? ''))
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Confere se a entrega veio mesmo da Cakto.
 * Preferimos a assinatura (prova a origem e detecta corpo adulterado); o campo `secret` do
 * corpo e a reserva para quando nao houver como pegar os bytes crus.
 */
export function conferirEntrega({ bruto, corpo, headers, chave }) {
  const assinatura = headers['x-cakto-signature']

  // Veio assinatura: ela manda. Aceitar o `secret` do corpo aqui deixaria passar uma entrega
  // capturada e reenviada depois (o secret do corpo nao expira; a assinatura, com o timestamp, sim).
  if (assinatura && bruto) {
    const ts = Number(headers['x-cakto-timestamp'])
    if (!Number.isFinite(ts)) return { ok: false, motivo: 'timestamp ausente' }
    if (Math.abs(Date.now() / 1000 - ts) > TOLERANCIA_S) return { ok: false, motivo: 'timestamp fora da janela' }
    if (iguais(assinatura, assinar(chave, ts, bruto))) return { ok: true, modo: 'hmac' }
    return { ok: false, motivo: 'assinatura nao confere' }
  }

  // Sem os bytes crus (caso da Vercel): vale o `secret` do corpo. Quando o cabecalho de tempo
  // vem junto, a janela continua sendo exigida — barra o reenvio de uma entrega antiga capturada.
  if (assinatura && headers['x-cakto-timestamp']) {
    const ts = Number(headers['x-cakto-timestamp'])
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCIA_S) {
      return { ok: false, motivo: 'timestamp fora da janela' }
    }
  }
  if (iguais(corpo?.secret, chave)) return { ok: true, modo: 'secret' }
  return { ok: false, motivo: 'secret invalido' }
}

/* ── Evento → o que fazer ──────────────────────────────────────────── */
const ACOES = {
  purchase_approved: 'ativar',
  subscription_created: 'ativar',
  subscription_renewed: 'ativar',
  subscription_resumed: 'ativar',
  subscription_late_recovered: 'atraso_fim',
  subscription_late: 'atraso',              // mantem o acesso, so marca
  subscription_renewal_refused: 'atraso',   // a Cakto ainda vai tentar de novo
  subscription_canceled: 'derrubar',
  subscription_paused: 'derrubar',
  refund: 'derrubar',
  chargeback: 'derrubar',
  purchase_refused: 'registrar',            // so historico
  pix_gerado: 'registrar',
  boleto_gerado: 'registrar',
  picpay_gerado: 'registrar',
  openfinance_nubank_gerado: 'registrar',
  checkout_abandonment: 'registrar',
}

/** null = evento desconhecido: o webhook grava como ignorado e responde 200. */
export function acaoDoEvento(evento) {
  if (ACOES[evento]) return ACOES[evento]
  // rede de seguranca para um nome novo de renovacao que a Cakto venha a criar
  if (/^subscription_renew/.test(evento ?? '')) return /refus|fail|recus|late/i.test(evento) ? 'atraso' : 'ativar'
  return null
}

/** Produto na Cakto → plano e ciclo. O mensal e assinatura recorrente; o anual e compra unica de 12 meses. */
const PRODUTOS = [
  ['CAKTO_PRODUTO_PRO', 'pro', 'mensal'],
  ['CAKTO_PRODUTO_FULL', 'full', 'mensal'],
  ['CAKTO_PRODUTO_PRO_ANUAL', 'pro', 'anual'],
  ['CAKTO_PRODUTO_FULL_ANUAL', 'full', 'anual'],
]

/** Qual plano (e por quanto tempo) o produto comprado libera. Ids ficam no cofre para mudar sem deploy. */
export async function planoDoProduto(produtoId) {
  if (!produtoId) return null
  const ids = await Promise.all(PRODUTOS.map(([chave]) => segredo(chave)))
  const i = ids.findIndex((id) => id && id === produtoId)
  return i < 0 ? null : { plano: PRODUTOS[i][1], ciclo: PRODUTOS[i][2] }
}

const texto = (v) => {
  const s = String(v ?? '').trim()
  return s || null
}

const data = (v) => {
  const d = v ? new Date(v) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}

/** So os campos que o resto do sistema usa, num formato estavel. */
export function normalizar(corpo) {
  const d = corpo?.data ?? {}
  const assinatura = d.subscription ?? null
  return {
    evento: texto(corpo?.event),
    email: texto(d.customer?.email)?.toLowerCase() ?? null,
    nome: texto(d.customer?.name),
    whatsapp: texto(d.customer?.phone),
    clienteId: d.customer?.id != null ? String(d.customer.id) : null,
    assinaturaId: texto(assinatura?.id),
    pedidoId: texto(d.id),
    produtoId: texto(d.product?.id),
    valor: Number.isFinite(Number(d.amount)) ? Number(d.amount) : null,
    renovaEm: data(assinatura?.next_payment_date ?? assinatura?.nextPaymentDate),
  }
}
