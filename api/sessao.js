// GET /api/sessao → quem está logado (ou 401). O front chama isto ao abrir e de tempos
// em tempos, para saber quanto resta do teste gratuito e perceber uma troca de plano.
import { abrirJanelaFree, publico, usuarioDaSessao } from './_lib/sessao.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const u = await usuarioDaSessao(req)
    if (!u) return res.status(401).json({ erro: 'Sem sessão.' })
    // conta criada pelo /admin, ou rebaixada para free: o relógio parte no primeiro acesso
    return res.status(200).json(publico(await abrirJanelaFree(u)))
  } catch (err) {
    return res.status(500).json({ erro: err.message ?? 'Falha ao ler a sessão.' })
  }
}
