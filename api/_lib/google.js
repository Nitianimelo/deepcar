// Acesso as APIs da Google com a conta de servico do projeto Firebase "deepcar-671ea" (cofre: FIREBASE_SERVICE_ACCOUNT).
// A mesma conta envia as notificacoes (FCM) e confere as assinaturas da Google Play (Android Publisher): no Play Console
// ela esta convidada em Usuarios e permissoes. Sem biblioteca: JWT assinado com a chave privada -> token OAuth de 1 h.
import { createSign } from 'node:crypto'
import { segredo } from './segredos.js'

export const ESCOPO_FCM = 'https://www.googleapis.com/auth/firebase.messaging'
export const ESCOPO_PLAY = 'https://www.googleapis.com/auth/androidpublisher'

let conta = null
const tokens = new Map() // escopo -> { valor, expira }

export async function contaDeServico() {
  if (conta) return conta
  const json = await segredo('FIREBASE_SERVICE_ACCOUNT')
  if (!json) throw Object.assign(new Error('Conta de servico do Google nao configurada (FIREBASE_SERVICE_ACCOUNT).'), { status: 503 })
  conta = JSON.parse(json)
  return conta
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')

/** Token OAuth para o escopo (guardado ate 5 min antes de vencer). */
export async function tokenGoogle(escopo) {
  const guardado = tokens.get(escopo)
  if (guardado && guardado.expira > Date.now() + 300_000) return guardado.valor
  const sa = await contaDeServico()
  const agora = Math.floor(Date.now() / 1000)
  const corpo = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: escopo, aud: sa.token_uri, iat: agora, exp: agora + 3600 })}`
  const assinatura = createSign('RSA-SHA256').update(corpo).sign(sa.private_key, 'base64url')
  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${corpo}.${assinatura}`,
    signal: AbortSignal.timeout(8000),
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok || !d.access_token) throw Object.assign(new Error(`Google recusou a conta de servico: ${d.error_description ?? res.status}`), { status: 502 })
  tokens.set(escopo, { valor: d.access_token, expira: Date.now() + (d.expires_in ?? 3600) * 1000 })
  return d.access_token
}

/** Chamada autenticada; devolve { ok, status, dados }. */
export async function chamarGoogle(url, escopo, { metodo = 'GET', corpo } = {}) {
  const res = await fetch(url, {
    method: metodo,
    headers: { Authorization: `Bearer ${await tokenGoogle(escopo)}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(10_000),
  })
  const dados = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, dados }
}
