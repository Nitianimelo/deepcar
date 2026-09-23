// POST /api/webhooks/cakto — a Cakto avisa aqui quando algo acontece com um pagamento.
//
// Rota publica (nao tem sessao): a defesa e a assinatura do corpo, a janela de 5 minutos e a
// idempotencia. Responde 2xx sempre que a entrega for reconhecida, mesmo que nada mude no banco:
// a Cakto reenvia enquanto nao receber 2xx. 500 so em falha de infraestrutura, onde repetir ajuda.
import { sql, um } from '../_lib/db.js'
import { acaoDoEvento, conferirEntrega, idDaEntrega, lerCorpoCru, normalizar, planoDoProduto } from '../_lib/cakto.js'
import { ativarPlano, derrubarParaFree, marcarAtraso, MOTIVOS } from '../_lib/assinatura.js'
import { segredo } from '../_lib/segredos.js'

export const config = { runtime: 'nodejs' }

// so para o log nao repetir a cada evento na mesma instancia
let avisou = false

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ erro: 'Use POST.' })
  }

  // IMPORTANTE: ler o stream antes de qualquer acesso a req.body, que o consumiria
  const bruto = await lerCorpoCru(req)
  let corpo
  try {
    corpo = bruto ? JSON.parse(bruto.toString('utf8')) : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body)
  } catch {
    return res.status(400).json({ erro: 'Corpo inválido.' })
  }
  if (!corpo || typeof corpo !== 'object') return res.status(400).json({ erro: 'Corpo inválido.' })

  try {
    const chave = await segredo('CAKTO_WEBHOOK_SECRET')
    if (!chave) {
      // erro nosso de configuracao: 500 faz a Cakto reenviar depois que a chave for gravada
      console.error('[cakto] CAKTO_WEBHOOK_SECRET não configurada no cofre')
      return res.status(500).json({ erro: 'Webhook não configurado.' })
    }

    const prova = conferirEntrega({ bruto, corpo, headers: req.headers, chave })
    if (!prova.ok) {
      // nao grava nada: endpoint publico, gravar daria a qualquer um como encher a tabela
      console.warn('[cakto] entrega recusada:', prova.motivo)
      return res.status(401).json({ erro: 'Entrega não autenticada.' })
    }

    // registra como a entrega foi provada: 'hmac' so aparece em runtime que entrega o corpo cru
    if (prova.modo === 'secret' && !avisou) {
      avisou = true
      console.log('[cakto] validando pelo campo secret do corpo (runtime não expõe o corpo cru)')
    }

    const d = normalizar(corpo)
    const id = idDaEntrega(bruto ?? Buffer.from(JSON.stringify(corpo)))
    const acao = acaoDoEvento(d.evento)

    // idempotencia: a mesma entrega reenviada tem corpo byte a byte igual
    const novo = await um(sql`
      insert into cakto_eventos (id, evento, corpo, email, assinatura_id, pedido_id, produto_id, valor)
      values (${id}, ${d.evento ?? 'desconhecido'}, ${JSON.stringify(corpo)}::jsonb, ${d.email},
              ${d.assinaturaId}, ${d.pedidoId}, ${d.produtoId}, ${d.valor})
      on conflict (id) do nothing
      returning id`)
    if (!novo) {
      const antes = await um(sql`select status from cakto_eventos where id = ${id}`)
      if (antes && ['aplicado', 'ignorado', 'pendente'].includes(antes.status)) {
        return res.status(200).json({ ok: true, repetido: true })
      }
      // ficou em 'recebido' ou 'erro': a tentativa anterior morreu no meio, refaz
    }

    if (!acao) {
      console.log('[cakto] evento sem tratamento:', d.evento)
      await concluir(id, 'ignorado', { detalhe: `evento sem tratamento: ${d.evento}` })
      return res.status(200).json({ ok: true, ignorado: true })
    }

    if (acao === 'registrar') {
      await concluir(id, 'ignorado', { detalhe: 'evento informativo' })
      return res.status(200).json({ ok: true })
    }

    if (acao === 'ativar') {
      const produto = await planoDoProduto(d.produtoId)
      if (!produto) {
        // nunca adivinhar plano por preco: fica visivel no /admin para resolver a mao
        console.error('[cakto] produto desconhecido:', d.produtoId)
        await concluir(id, 'erro', { detalhe: `produto desconhecido: ${d.produtoId}`, plano: null })
        return res.status(200).json({ ok: true, pendente: true })
      }
      const { plano, ciclo } = produto
      const r = await ativarPlano(plano, { ...d, ciclo, eventoId: id })
      await concluir(id, r.estado === 'aplicado' ? 'aplicado' : r.estado === 'pendente' ? 'pendente' : 'ignorado', {
        plano, usuarioId: r.usuarioId, detalhe: r.detalhe ?? (ciclo === 'anual' ? 'anual' : null),
      })
      return res.status(200).json({ ok: true, estado: r.estado })
    }

    if (acao === 'derrubar') {
      // o ciclo diz o que caiu: reembolso do anual nao derruba uma mensal ativa, e vice-versa
      const produto = await planoDoProduto(d.produtoId)
      const r = await derrubarParaFree(MOTIVOS[d.evento] ?? 'cancelada', { ...d, ciclo: produto?.ciclo ?? null })
      await concluir(id, r.estado === 'aplicado' ? 'aplicado' : 'ignorado', {
        usuarioId: r.usuarioId, detalhe: r.detalhe ?? null,
      })
      return res.status(200).json({ ok: true, estado: r.estado })
    }

    // atraso / atraso_fim: marca a conta, sem tirar o acesso
    const r = await marcarAtraso(acao === 'atraso', d)
    await concluir(id, r.estado === 'aplicado' ? 'aplicado' : 'ignorado', {
      usuarioId: r.usuarioId, detalhe: r.detalhe ?? null,
    })
    return res.status(200).json({ ok: true, estado: r.estado })
  } catch (err) {
    // nunca logar o corpo inteiro nem o secret
    console.error('[cakto] falha ao processar', corpo?.event, err?.message)
    return res.status(500).json({ erro: 'Falha ao processar o evento.' })
  }
}

function concluir(id, status, { plano = null, usuarioId = null, detalhe = null } = {}) {
  return sql`
    update cakto_eventos set
      status = ${status},
      plano = coalesce(${plano}, plano),
      usuario_id = coalesce(${usuarioId ?? null}, usuario_id),
      detalhe = ${detalhe},
      aplicado_em = now()
    where id = ${id}`
}
