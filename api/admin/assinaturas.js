// Tela /admin — aba Assinaturas: pagamentos sem dono e o historico do que a Cakto mandou.
//
//   GET    /api/admin/assinaturas                      pendentes + ultimos eventos
//   POST   /api/admin/assinaturas?id=...               { usuarioId } vincula a pendencia a uma conta
//   POST   /api/admin/assinaturas?id=...&acao=descartar marca a pendencia como cancelada
import { sql } from '../_lib/db.js'
import { corpo, exigir } from '../_lib/sessao.js'
import { vincularPendente } from '../_lib/assinatura.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
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
