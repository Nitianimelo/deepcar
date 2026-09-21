// O que um pagamento faz com a conta. Fica separado do webhook porque o cadastro
// (api/registrar.js), o login e o /admin aplicam exatamente as mesmas regras.
import { sql, um } from './db.js'

/** Motivos que derrubam o acesso, na coluna assinatura_status. */
export const MOTIVOS = {
  subscription_canceled: 'cancelada',
  subscription_paused: 'pausada',
  refund: 'reembolsada',
  chargeback: 'chargeback',
}

/**
 * Dono do pagamento: assinatura conhecida → cliente conhecido → e-mail.
 * O indice de e-mail e em lower(email), entao a comparacao precisa ser nessa forma.
 */
export async function acharDono({ assinaturaId, clienteId, email }) {
  if (assinaturaId) {
    const u = await um(sql`select * from usuarios where assinatura_id = ${assinaturaId} limit 1`)
    if (u) return u
  }
  if (clienteId) {
    const u = await um(sql`select * from usuarios where cakto_cliente_id = ${clienteId} limit 1`)
    if (u) return u
  }
  if (email) {
    const u = await um(sql`select * from usuarios where lower(email) = lower(${email}) limit 1`)
    if (u) return u
  }
  return null
}

/** Grava o plano pago na conta. Usado pelo webhook, pelo cadastro e pelo /admin. */
export async function aplicarNaConta(usuarioId, plano, d = {}) {
  // uma assinatura pertence a uma conta so: se mudou de dono, solta a anterior
  if (d.assinaturaId) {
    await sql`update usuarios set assinatura_id = null where assinatura_id = ${d.assinaturaId} and id <> ${usuarioId}`
  }
  return um(sql`
    update usuarios set
      plano = ${plano},
      assinatura_id = coalesce(${d.assinaturaId ?? null}, assinatura_id),
      assinatura_pedido_id = coalesce(${d.pedidoId ?? null}, assinatura_pedido_id),
      cakto_cliente_id = coalesce(${d.clienteId ?? null}, cakto_cliente_id),
      assinatura_plano = ${plano},
      assinatura_status = 'ativa',
      assinatura_renova_em = coalesce(${d.renovaEm ?? null}, assinatura_renova_em),
      assinatura_em_atraso = false,
      assinatura_origem = ${d.origem ?? 'cakto'},
      assinatura_atualizada_em = now(),
      free_expira_em = null
    where id = ${usuarioId}
    returning *`)
}

/**
 * Pagamento aprovado. Sem conta com aquele e-mail, guarda como pendente: a pessoa
 * se cadastra depois com o mesmo e-mail e o plano entra sozinho (api/registrar.js).
 */
export async function ativarPlano(plano, d) {
  const dono = await acharDono(d)
  if (!dono) {
    const pendente = await guardarPendente(plano, d)
    return { estado: 'pendente', pendenteId: pendente?.id ?? null }
  }

  // um reembolso que chegou antes de uma aprovacao atrasada nao pode reativar o plano
  if (d.assinaturaId) {
    const derrubada = await um(sql`
      select id from cakto_eventos
       where assinatura_id = ${d.assinaturaId}
         and evento in ('refund', 'chargeback', 'subscription_canceled')
         and status = 'aplicado'
         and recebido_em > coalesce(${d.ocorridoEm ?? null}::timestamptz, now() - interval '1 second')
       limit 1`)
    if (derrubada) return { estado: 'ignorado', usuarioId: dono.id, detalhe: 'ja houve cancelamento posterior' }
  }

  const atualizado = await aplicarNaConta(dono.id, plano, d)
  return { estado: 'aplicado', usuarioId: atualizado?.id ?? dono.id }
}

async function guardarPendente(plano, d) {
  return um(sql`
    insert into assinaturas_pendentes
      (email, nome, whatsapp, plano, assinatura_id, pedido_id, produto_id, cliente_id, valor, renova_em, evento_id)
    values (${d.email}, ${d.nome ?? null}, ${d.whatsapp ?? null}, ${plano}, ${d.assinaturaId ?? null},
            ${d.pedidoId ?? null}, ${d.produtoId ?? null}, ${d.clienteId ?? null}, ${d.valor ?? null},
            ${d.renovaEm ?? null}, ${d.eventoId ?? null})
    on conflict (lower(email)) where status = 'pendente' do update
      set plano = excluded.plano,
          nome = coalesce(excluded.nome, assinaturas_pendentes.nome),
          whatsapp = coalesce(excluded.whatsapp, assinaturas_pendentes.whatsapp),
          assinatura_id = coalesce(excluded.assinatura_id, assinaturas_pendentes.assinatura_id),
          pedido_id = coalesce(excluded.pedido_id, assinaturas_pendentes.pedido_id),
          produto_id = coalesce(excluded.produto_id, assinaturas_pendentes.produto_id),
          cliente_id = coalesce(excluded.cliente_id, assinaturas_pendentes.cliente_id),
          valor = coalesce(excluded.valor, assinaturas_pendentes.valor),
          renova_em = coalesce(excluded.renova_em, assinaturas_pendentes.renova_em),
          atualizado_em = now()
    returning id`)
}

/**
 * Cancelamento, reembolso, chargeback ou pausa: volta para o free na hora.
 * `free_expira_em = now()` e proposital — deixar nulo daria 5 minutos de teste novo a cada
 * estorno, repetivel. O admin rebaixando a mao continua zerando o relogio (api/admin/usuarios.js).
 * Nao mexe em administrador nem em plano concedido a mao pelo /admin.
 */
export async function derrubarParaFree(motivo, d) {
  const dono = await acharDono(d)
  if (!dono) {
    if (d.email) {
      await sql`update assinaturas_pendentes set status = 'cancelada', atualizado_em = now()
                 where lower(email) = lower(${d.email}) and status = 'pendente'`
    }
    return { estado: 'pendente', detalhe: 'sem conta para derrubar' }
  }
  const atualizado = await um(sql`
    update usuarios set
      plano = 'free',
      assinatura_status = ${motivo},
      assinatura_em_atraso = false,
      assinatura_atualizada_em = now(),
      free_expira_em = now()
    where id = ${dono.id} and papel <> 'admin' and coalesce(assinatura_origem, 'cakto') = 'cakto'
    returning id`)
  if (!atualizado) return { estado: 'ignorado', usuarioId: dono.id, detalhe: 'conta de admin ou plano manual' }
  await sql`delete from sessoes where usuario_id = ${dono.id}`
  return { estado: 'aplicado', usuarioId: dono.id }
}

/** Atraso so marca: o acesso continua ate a Cakto cancelar de vez. */
export async function marcarAtraso(emAtraso, d) {
  const dono = await acharDono(d)
  if (!dono) return { estado: 'pendente', detalhe: 'sem conta' }
  await sql`
    update usuarios set
      assinatura_em_atraso = ${emAtraso},
      assinatura_status = case when ${emAtraso}::boolean then 'em_atraso' else 'ativa' end,
      assinatura_atualizada_em = now()
    where id = ${dono.id}`
  return { estado: 'aplicado', usuarioId: dono.id }
}

/**
 * Pagou antes de ter conta: aplica a pendencia do mesmo e-mail.
 * Chamado no cadastro e no login de quem esta no free.
 */
export async function consumirPendente(usuario) {
  if (!usuario || usuario.plano !== 'free') return usuario
  const p = await um(sql`
    select * from assinaturas_pendentes
     where lower(email) = lower(${usuario.email}) and status = 'pendente'
     order by criado_em desc limit 1`)
  if (!p) return usuario

  const atualizado = await aplicarNaConta(usuario.id, p.plano, {
    assinaturaId: p.assinatura_id,
    pedidoId: p.pedido_id,
    clienteId: p.cliente_id,
    renovaEm: p.renova_em,
  })
  await sql`update assinaturas_pendentes set status = 'aplicada', usuario_id = ${usuario.id},
             aplicada_em = now(), atualizado_em = now() where id = ${p.id}`
  return atualizado ?? usuario
}

/** /admin: vincular uma pendencia a uma conta escolhida (e-mail digitado errado no checkout). */
export async function vincularPendente(pendenteId, usuarioId) {
  const p = await um(sql`select * from assinaturas_pendentes where id = ${pendenteId} and status = 'pendente'`)
  if (!p) throw Object.assign(new Error('Pendência não encontrada ou já resolvida.'), { status: 404 })
  const u = await um(sql`select id from usuarios where id = ${usuarioId}`)
  if (!u) throw Object.assign(new Error('Conta não encontrada.'), { status: 404 })

  const atualizado = await aplicarNaConta(usuarioId, p.plano, {
    assinaturaId: p.assinatura_id,
    pedidoId: p.pedido_id,
    clienteId: p.cliente_id,
    renovaEm: p.renova_em,
  })
  await sql`update assinaturas_pendentes set status = 'aplicada', usuario_id = ${usuarioId},
             aplicada_em = now(), atualizado_em = now() where id = ${pendenteId}`
  return atualizado
}
