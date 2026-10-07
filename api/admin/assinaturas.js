// Tela /admin — aba Assinaturas: pagamentos sem dono e o historico do que a Cakto mandou.
//
//   GET    /api/admin/assinaturas                      pendentes + ultimos eventos
//   POST   /api/admin/assinaturas?id=...               { usuarioId } vincula a pendencia a uma conta
//   POST   /api/admin/assinaturas?id=...&acao=descartar marca a pendencia como cancelada
//   GET    /api/admin/assinaturas?acao=cron            cron diario da Vercel (Authorization: Bearer CRON_SECRET):
//          notificacao "teste acabou" para quem venceu pelo prazo nos ultimos 3 dias e tem o app (api/_lib/push.js)
//          e o e-mail "teste acabou" para quem venceu pelo prazo (api/_lib/emails.js)
import { sql } from '../_lib/db.js'
import { corpo, exigir } from '../_lib/sessao.js'
import { vincularPendente } from '../_lib/assinatura.js'
import { avisarTesteAcabou } from '../_lib/push.js'
import { avisarTesteAcabouEmail } from '../_lib/emails.js'

// e-mail "teste acabou" para todo teste vencido que ainda nao recebeu (o dono aprovou mandar tambem para os antigos,
// 08/10/2026), no maximo 40 por dia: o plano gratis do Resend aceita 100 e-mails/dia, contando cadastro e senha
const EMAILS_POR_DIA = 40

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.query.acao === 'cron') return cron(req, res)
  const admin = await exigir(req, res, { admin: true })
  if (!admin) return

  try {
    if (req.method === 'GET') {
      const [pendentes, eventos] = await Promise.all([
        sql`select p.id, p.email, p.nome, p.whatsapp, p.plano, p.ciclo, p.valor, p.criado_em, p.assinatura_id, p.pedido_id
              from assinaturas_pendentes p
             where p.status = 'pendente'
             order by p.criado_em desc
             limit 100`,
        sql`select e.id, e.evento, e.status, e.email, e.plano, e.valor, e.detalhe, e.recebido_em,
                   u.nome as usuario_nome, u.email as usuario_email
              from cakto_eventos e
              left join usuarios u on u.id = e.usuario_id
             order by e.recebido_em desc
             limit 60`,
      ])
      return res.status(200).json({ pendentes, eventos })
    }

    if (req.method === 'POST') {
      const id = req.query.id
      if (!id) return res.status(400).json({ erro: 'Informe a pendência.' })

      if (req.query.acao === 'descartar') {
        const r = await sql`update assinaturas_pendentes set status = 'cancelada', atualizado_em = now(),
                             observacao = ${`descartada por ${admin.email}`}
                             where id = ${id} and status = 'pendente' returning id`
        if (!r.length) return res.status(404).json({ erro: 'Pendência não encontrada ou já resolvida.' })
        return res.status(200).json({ ok: true })
      }

      const { usuarioId } = corpo(req)
      if (!usuarioId) return res.status(400).json({ erro: 'Informe a conta que vai receber o plano.' })
      const usuario = await vincularPendente(id, usuarioId)
      return res.status(200).json({ ok: true, usuario })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ erro: 'Método não suportado.' })
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha na operação.' })
  }
}

async function cron(req, res) {
  const segredoCron = process.env.CRON_SECRET
  if (!segredoCron || req.headers.authorization !== `Bearer ${segredoCron}`) return res.status(401).json({ erro: 'Não autorizado.' })
  const contas = await sql`select distinct u.id from usuarios u join aparelhos_push a on a.usuario_id = u.id
                            where u.plano = 'free' and u.papel <> 'admin' and u.push_teste_acabou_em is null
                              and u.free_expira_em <= now() and u.free_expira_em > now() - interval '3 days'`
  for (const c of contas) await avisarTesteAcabou(c.id)
  const porEmail = await sql`select id from usuarios
                              where plano = 'free' and papel <> 'admin' and ativo and email_teste_acabou_em is null
                                and free_expira_em <= now()
                              order by free_expira_em desc limit ${EMAILS_POR_DIA}`
  for (const c of porEmail) await avisarTesteAcabouEmail(c.id)
  // registro de uso: guarda 120 dias (o /admin → Logs olha no máximo 90)
  const limpos = await sql`delete from eventos_uso where em < now() - interval '120 days' returning 1`
  return res.status(200).json({ avisados: contas.length, emails: porEmail.length, eventosApagados: limpos.length })
}
