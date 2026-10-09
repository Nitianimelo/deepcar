// Assinatura pela App Store (app para iPhone, 08/10/2026). O app compra pelo StoreKit 2 e manda o comprovante ASSINADO
// pela Apple (JWS): POST /api/sessao { evento: 'apple', jws }. Aqui o servidor confere a assinatura com a cadeia de
// certificados que vem no próprio comprovante, terminando no certificado raiz da Apple (Apple Root CA - G3, conferido
// pela impressão digital), e libera o plano. Renovação, cancelamento e reembolso chegam pelas notificações da App Store
// (versão 2) em POST /api/webhooks/cakto?origem=apple (o arquivo é o da Cakto por causa do limite de 12 funções).
// Sem notificação, uma assinatura vencida há mais de 2 dias volta ao teste encerrado (conferirApple, na sessão).
//
// Produtos (App Store Connect, grupo "Deepcar"): deepcar_pro_mensal, deepcar_pro_anual, deepcar_full_mensal,
// deepcar_full_anual. O appAccountToken é um UUID tirado do sha-256 do e-mail (o app calcula igual): compra de outra
// conta é recusada. Compras de teste (Sandbox: TestFlight e a revisão da Apple) valem igual, para a revisão funcionar.
import { X509Certificate, verify } from 'node:crypto'
import { sql, um } from './db.js'
import { contaPlay } from './play.js'
import { avisarCompra } from './emails.js'

export const BUNDLE_IOS = 'deepcar.app.ios'
export const PRODUTOS_APPLE = {
  deepcar_pro_mensal: { plano: 'pro', ciclo: 'mensal' }, deepcar_pro_anual: { plano: 'pro', ciclo: 'anual' },
  deepcar_full_mensal: { plano: 'full', ciclo: 'mensal' }, deepcar_full_anual: { plano: 'full', ciclo: 'anual' },
}
// Apple Root CA - G3 (https://www.apple.com/certificateauthority/AppleRootCA-G3.cer), SHA-256, válido até 2039
const RAIZ_SHA256 = '63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79'

const erro = (msg, status = 400) => Object.assign(new Error(msg), { status })

/** Confere e abre um JWS da Apple (comprovante de compra ou notificação). */
export function lerJws(jws) {
  const partes = String(jws ?? '').split('.')
  if (partes.length !== 3) throw erro('Comprovante da App Store inválido.')
  const [h, p, s] = partes
  const cab = JSON.parse(Buffer.from(h, 'base64url').toString())
  if (cab.alg !== 'ES256' || !Array.isArray(cab.x5c) || cab.x5c.length < 3) throw erro('Comprovante da App Store inválido.')
  let certs
  try { certs = cab.x5c.map((c) => new X509Certificate(Buffer.from(c, 'base64'))) } catch { throw erro('Comprovante não foi assinado pela Apple.') }
  const raiz = certs[certs.length - 1]
  const agora = Date.now()
  const valido = (c) => new Date(c.validFrom).getTime() <= agora && agora <= new Date(c.validTo).getTime()
  const cadeiaOk = raiz.fingerprint256 === RAIZ_SHA256 && certs.every(valido)
    && certs.every((c, i) => c.verify((certs[i + 1] ?? raiz).publicKey))
  if (!cadeiaOk) throw erro('Comprovante não foi assinado pela Apple.')
  const ok = verify('sha256', Buffer.from(`${h}.${p}`), { key: certs[0].publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'))
  if (!ok) throw erro('Assinatura do comprovante da App Store não confere.')
  return JSON.parse(Buffer.from(p, 'base64url').toString())
}

/** O mesmo UUID que o app manda como appAccountToken (src/lib/assinatura.ts do app → contaApple). */
export function contaApple(email) {
  const h = contaPlay(email)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

function lerTransacao(t) {
  if (t.bundleId !== BUNDLE_IOS) throw erro('Esta compra não é do app da Deepcar.')
  const produto = PRODUTOS_APPLE[t.productId]
  if (!produto) throw erro('Produto da App Store desconhecido.')
  return {
    ...produto, produto: t.productId, original: String(t.originalTransactionId),
    expira: t.expiresDate ? new Date(t.expiresDate) : null, revogada: !!t.revocationDate,
    conta: t.appAccountToken ?? null, ambiente: t.environment ?? null,
  }
}

const valendo = (c) => !c.revogada && !!c.expira && c.expira > new Date()

async function aplicarApple(usuarioId, c) {
  const antes = await um(sql`select plano, assinatura_ciclo from usuarios where id = ${usuarioId}`)
  const depois = await um(sql`
    update usuarios set
      plano = ${c.plano}, assinatura_plano = ${c.plano}, assinatura_origem = 'apple', assinatura_status = 'ativa',
      assinatura_ciclo = ${c.ciclo}, assinatura_renova_em = ${c.expira}, assinatura_em_atraso = false, assinatura_atualizada_em = now(),
      apple_tx_original = ${c.original}, apple_produto = ${c.produto}, apple_expira_em = ${c.expira}, apple_ambiente = ${c.ambiente},
      free_expira_em = null
    where id = ${usuarioId} and papel <> 'admin'
    returning *`)
  await avisarCompra(antes, depois) // "Bem-vindo ao plano" + aviso de venda ao dono; renovação não manda
  return depois
}

/** Compra feita agora no iPhone (ou "Restaurar compras"). Devolve a conta atualizada. */
export async function registrarCompraApple(u, jws) {
  const c = lerTransacao(lerJws(jws))
  if (c.conta && c.conta !== contaApple(u.email)) throw erro('Esta compra pertence a outra conta da Deepcar.', 409)
  const outra = await um(sql`select id from usuarios where apple_tx_original = ${c.original} and id <> ${u.id}`)
  if (outra) throw erro('Esta compra já está ligada a outra conta da Deepcar.', 409)
  if (!valendo(c)) throw erro('A App Store não confirmou esta assinatura como ativa.', 402)
  return aplicarApple(u.id, c)
}

/** Ao conferir a sessão: assinatura da Apple vencida há mais de 2 dias sem renovação avisada volta ao teste encerrado. */
export async function conferirApple(u) {
  if (!u || u.assinatura_origem !== 'apple' || !u.apple_expira_em) return u
  if (new Date(u.apple_expira_em).getTime() > Date.now() - 2 * 864e5) return u
  const r = await um(sql`update usuarios set plano = 'free', assinatura_status = 'expirada', free_expira_em = now(), assinatura_atualizada_em = now()
                         where id = ${u.id} and assinatura_origem = 'apple' returning *`)
  return r ? { ...u, ...r } : u
}

/**
 * Notificação da App Store (versão 2): renovou, mudou de plano, venceu, reembolsou. Responde 200 sempre que a
 * assinatura confere (a Apple reenvia o que não recebeu 200).
 */
export async function notificacaoApple(corpo) {
  const n = lerJws(corpo?.signedPayload)
  const tipo = n.notificationType, sub = n.subtype ?? null
  const info = n.data?.signedTransactionInfo ? lerJws(n.data.signedTransactionInfo) : null
  if (!info) return { tipo, sub, aplicado: false, motivo: 'sem transação' }
  const c = lerTransacao(info)
  const u = await um(sql`select id from usuarios where apple_tx_original = ${c.original}`)
  if (!u) return { tipo, sub, aplicado: false, motivo: 'compra sem conta (ainda não confirmada pelo app)' }
  if (['SUBSCRIBED', 'DID_RENEW', 'DID_CHANGE_RENEWAL_PREF', 'OFFER_REDEEMED', 'RENEWAL_EXTENDED'].includes(tipo) && valendo(c)) {
    await aplicarApple(u.id, c)
    return { tipo, sub, aplicado: true }
  }
  if (tipo === 'DID_FAIL_TO_RENEW') {
    await sql`update usuarios set assinatura_em_atraso = true, assinatura_atualizada_em = now() where id = ${u.id}`
    return { tipo, sub, aplicado: true }
  }
  if (['EXPIRED', 'GRACE_PERIOD_EXPIRED', 'REVOKE', 'REFUND'].includes(tipo)) {
    const status = tipo === 'REFUND' ? 'reembolsada' : tipo === 'REVOKE' ? 'cancelada' : 'expirada'
    await sql`update usuarios set plano = 'free', assinatura_status = ${status}, free_expira_em = now(), assinatura_atualizada_em = now()
              where id = ${u.id} and assinatura_origem = 'apple'`
    return { tipo, sub, aplicado: true }
  }
  return { tipo, sub, aplicado: false, motivo: 'tipo só informativo' }
}
