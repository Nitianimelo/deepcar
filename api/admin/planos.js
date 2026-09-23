// Tela /admin → Planos: o que cada plano libera. Vale para todas as contas daquele plano.
//
//   GET  /api/admin/planos   { secoes, planos: { free, pro, full } }
//   PUT  /api/admin/planos   grava { plano, secoes, placa, dispositivos }
import { sql } from '../_lib/db.js'
import { esquecerRegras, PLANOS, regras, SECOES } from '../_lib/planos.js'
import { corpo, exigir } from '../_lib/sessao.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const admin = await exigir(req, res, { admin: true })
  if (!admin) return

  try {
    if (req.method === 'GET') {
      esquecerRegras()
      return res.status(200).json({ secoes: SECOES, planos: await regras() })
    }

    if (req.method === 'PUT') {
      const d = corpo(req)
      if (!PLANOS.includes(d.plano)) return res.status(400).json({ erro: 'Plano inválido.' })
      if (!Array.isArray(d.secoes) || d.secoes.some((s) => !SECOES.includes(s))) {
        return res.status(400).json({ erro: 'Sistema inválido na lista.' })
      }
      const dispositivos = d.dispositivos === null || d.dispositivos === '' ? null : Number(d.dispositivos)
      if (dispositivos !== null && (!Number.isInteger(dispositivos) || dispositivos < 1 || dispositivos > 50)) {
        return res.status(400).json({ erro: 'Dispositivos: um número de 1 a 50, ou vazio para sem limite.' })
      }
      // mantem a ordem do menu, sem repetidos
      const secoes = SECOES.filter((s) => d.secoes.includes(s))
      await sql`
        insert into planos_acesso (plano, secoes, placa, dispositivos, atualizado_em, atualizado_por)
        values (${d.plano}, ${secoes}, ${!!d.placa}, ${dispositivos}, now(), ${admin.id})
        on conflict (plano) do update set
          secoes = excluded.secoes, placa = excluded.placa, dispositivos = excluded.dispositivos,
          atualizado_em = now(), atualizado_por = excluded.atualizado_por`
      esquecerRegras()
      return res.status(200).json({ secoes: SECOES, planos: await regras() })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ erro: 'Método não suportado.' })
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha na operação.' })
  }
}
