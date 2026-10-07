// Assinatura pela Google Play (app Android 1.3.0, 07/10/2026). O app compra com o Google Play Billing e manda o token
// da compra: POST /api/sessao { evento: 'play', produto, token }. Aqui o servidor confere com a Google (Android
// Publisher, purchases.subscriptionsv2), reconhece a compra (sem isso a Google devolve o dinheiro em 3 dias) e libera
// o plano. Renovação/cancelamento: sem webhook da Google; ao conferir a sessão, conta 'play' com o prazo vencido é
// perguntada de novo (conferirPlay) e renova ou volta ao teste.
//
// Produtos no Play Console: assinaturas `deepcar_pro` e `deepcar_full`, planos base `mensal` e `anual`.
// Os preços do app ficam só no Play Console (com os 15% da Google compensados; ver CONTEXTO.md).
import { createHash } from 'node:crypto'
import { sql, um } from './db.js'
import { chamarGoogle, ESCOPO_PLAY } from './google.js'

export const PACOTE = 'deepcar.app.android'
export const PRODUTOS = { deepcar_pro: 'pro', deepcar_full: 'full' }
const VALE = new Set(['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'])
const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACOTE}/purchases/subscriptions`

/** O que a Google diz do token: { plano, ciclo, expira, estado, conta, reconhecida } ou erro. */
export async function consultarCompra(token) {
  const r = await chamarGoogle(`${BASE}v2/tokens/${encodeURIComponent(token)}`, ESCOPO_PLAY)
  if (!r.ok) throw Object.assign(new Error(r.dados?.error?.message ?? `Google Play respondeu HTTP ${r.status}`), { status: r.status === 404 || r.status === 400 ? 400 : 502 })
  const d = r.dados
  const item = (d.lineItems ?? []).find((l) => PRODUTOS[l.productId]) ?? d.lineItems?.[0]
  return {
    produto: item?.productId ?? null,
    plano: PRODUTOS[item?.productId] ?? null,
    ciclo: item?.offerDetails?.basePlanId === 'anual' ? 'anual' : 'mensal',
    expira: item?.expiryTime ? new Date(item.expiryTime) : null,
    estado: d.subscriptionState ?? null,
    conta: d.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null,
    reconhecida: d.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
  }
}

/** O identificador da conta que o app manda à Google na compra (src/lib/assinatura.ts do app). */
export const contaPlay = (email) => createHash('sha256').update(String(email ?? '').trim().toLowerCase()).digest('hex')

const valendo = (c) => !!c.plano && VALE.has(c.estado) && !!c.expira && c.expira > new Date()

/** Compra feita agora no app (ou "restaurar compras"). Devolve a conta atualizada. */
export async function registrarCompraPlay(u, token) {
  if (!/^[\w.:-]{20,600}$/.test(String(token ?? ''))) throw Object.assign(new Error('Compra inválida.'), { status: 400 })
  const c = await consultarCompra(token)
  // a compra leva a conta (obfuscatedAccountId = sha-256 do e-mail em minúsculas, mandado pelo app; o app não sabe o id):
  // não deixa usar a compra de outra pessoa
  if (c.conta && c.conta !== contaPlay(u.email)) throw Object.assign(new Error('Esta compra pertence a outra conta da Deepcar.'), { status: 409 })
  const outra = await um(sql`select id from usuarios where play_token = ${token} and id <> ${u.id}`)
  if (outra) throw Object.assign(new Error('Esta compra já está ligada a outra conta da Deepcar.'), { status: 409 })
  if (!valendo(c)) throw Object.assign(new Error('A Google Play não confirmou esta assinatura como ativa.'), { status: 402 })
  if (!c.reconhecida) {
    const ack = await chamarGoogle(`${BASE}/${c.produto}/tokens/${encodeURIComponent(token)}:acknowledge`, ESCOPO_PLAY, { metodo: 'POST', corpo: {} })
    if (!ack.ok) console.error('[play] acknowledge falhou:', ack.status, JSON.stringify(ack.dados).slice(0, 200))
  }
  return aplicarPlay(u.id, token, c)
}

async function aplicarPlay(usuarioId, token, c) {
  return um(sql`
    update usuarios set
      plano = ${c.plano}, assinatura_plano = ${c.plano}, assinatura_origem = 'play',
      assinatura_status = case when ${c.estado} = 'SUBSCRIPTION_STATE_CANCELED' then 'cancelada_no_fim' else 'ativa' end,
      assinatura_ciclo = ${c.ciclo}, assinatura_renova_em = ${c.expira}, assinatura_em_atraso = ${c.estado === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'},
      assinatura_atualizada_em = now(),
      play_token = ${token}, play_produto = ${c.produto}, play_expira_em = ${c.expira}, play_estado = ${c.estado}, play_conferido_em = now()
    where id = ${usuarioId} and papel <> 'admin'
    returning *`)
}

/**
 * Chamado ao conferir a sessão: assinatura da Play com o prazo vencido é perguntada de novo (no máximo a cada 10 min).
 * Renovou: estende. Acabou: volta ao teste encerrado. Falha da Google não derruba ninguém (tenta na próxima).
 */
export async function conferirPlay(u) {
  if (!u || u.assinatura_origem !== 'play' || !u.play_token) return u
  if (u.play_expira_em && new Date(u.play_expira_em) > new Date()) return u
  if (u.play_conferido_em && Date.now() - new Date(u.play_conferido_em).getTime() < 600_000) return u
  try {
    const c = await consultarCompra(u.play_token)
    if (valendo(c)) return { ...u, ...(await aplicarPlay(u.id, u.play_token, c)) }
    const agora = new Date()
    const r = await um(sql`
      update usuarios set plano = 'free', assinatura_status = 'expirada', free_expira_em = ${agora},
             play_estado = ${c.estado}, play_conferido_em = now(), assinatura_atualizada_em = now()
       where id = ${u.id} and assinatura_origem = 'play' returning *`)
    return r ? { ...u, ...r } : u
  } catch (err) {
    await sql`update usuarios set play_conferido_em = now() where id = ${u.id}`
    console.error('[play] conferir:', err.message)
    return u
  }
}
