// GET /api/sessao → quem está logado (ou 401). O front chama isto ao abrir.
import { publico, usuarioDaSessao } from './_lib/sessao.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const u = await usuarioDaSessao(req)
    if (!u) return res.status(401).json({ erro: 'Sem sessão.' })
    return res.status(200).json(publico(u))
  } catch (err) {
    return res.status(500).json({ erro: err.message ?? 'Falha ao ler a sessão.' })
  }
}
