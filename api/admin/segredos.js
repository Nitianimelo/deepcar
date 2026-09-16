// Tela /admin — cofre de chaves de API (credenciais da APIBrasil, dados do R2, ...).
// O valor vai cifrado para o banco e nunca volta para o navegador.
//
//   GET    /api/admin/segredos             nomes, descrição e quando mudou
//   PUT    /api/admin/segredos             grava { chave, valor, descricao }
//   DELETE /api/admin/segredos?chave=...   remove
import { apagar, guardar, listar } from '../_lib/segredos.js'
import { corpo, exigir } from '../_lib/sessao.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const admin = await exigir(req, res, { admin: true })
  if (!admin) return

  try {
    if (req.method === 'GET') return res.status(200).json(await listar())

    if (req.method === 'PUT') {
      const { chave, valor, descricao } = corpo(req)
      if (!chave || !valor) return res.status(400).json({ erro: 'Informe a chave e o valor.' })
      await guardar(String(chave).trim().toUpperCase(), String(valor), admin.id, descricao ?? null)
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const chave = String(req.query.chave ?? '').toUpperCase()
      if (!chave) return res.status(400).json({ erro: 'Informe a chave.' })
      await apagar(chave)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    return res.status(405).json({ erro: 'Método não suportado.' })
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha na operação.' })
  }
}
